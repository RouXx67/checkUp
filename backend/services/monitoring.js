const cron = require('node-cron');
const axios = require('axios');
const { getDatabase } = require('../database/init');

let monitoringInterval = null;

function startMonitoring() {
  // Vérifier les services toutes les 2 minutes
  monitoringInterval = cron.schedule('*/2 * * * *', async () => {
    console.log('🔍 Vérification des services...');
    await checkAllServices();
  }, {
    scheduled: false
  });

  monitoringInterval.start();
  console.log('✅ Service de monitoring démarré (vérification toutes les 2 minutes)');

  // Effectuer une vérification immédiate
  setTimeout(checkAllServices, 5000);
}

function stopMonitoring() {
  if (monitoringInterval) {
    monitoringInterval.stop();
    console.log('⏹️ Service de monitoring arrêté');
  }
}

async function checkAllServices() {
  const db = getDatabase();
  
  db.all('SELECT * FROM services', async (err, services) => {
    if (err) {
      console.error('Erreur lors de la récupération des services:', err);
      return;
    }

    for (const service of services) {
      try {
        await checkService(service);
      } catch (error) {
        console.error(`Erreur lors de la vérification du service ${service.name}:`, error);
      }
    }
  });
}

async function checkService(service) {
  const db = getDatabase();
  let status = 'offline';
  let metrics = {};
  let responseTime = null;

  try {
    const startTime = Date.now();
    
    switch (service.type) {
      case 'http':
        status = await checkHttpService(service);
        break;
      case 'proxmox':
        const proxmoxResult = await checkProxmoxService(service);
        status = proxmoxResult.status;
        metrics = proxmoxResult.metrics;
        break;
      case 'docker':
        const dockerResult = await checkDockerService(service);
        status = dockerResult.status;
        metrics = dockerResult.metrics;
        break;
      case 'ping':
        status = await checkPingService(service);
        break;
      default:
        status = 'unknown';
    }

    responseTime = Date.now() - startTime;

  } catch (error) {
    console.error(`Erreur lors de la vérification de ${service.name}:`, error);
    status = 'error';
  }

  // Mettre à jour le statut du service
  db.run(
    'UPDATE services SET status = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?',
    [status, service.id],
    (err) => {
      if (err) {
        console.error('Erreur lors de la mise à jour du statut:', err);
      }
    }
  );

  // Enregistrer les métriques
  if (responseTime !== null) {
    saveMetric(service.id, 'response_time', responseTime, 'ms');
  }

  // Enregistrer les métriques spécifiques au service
  for (const [metricName, metricValue] of Object.entries(metrics)) {
    if (typeof metricValue === 'object' && metricValue.value !== undefined) {
      saveMetric(service.id, metricName, metricValue.value, metricValue.unit || '');
    } else {
      saveMetric(service.id, metricName, metricValue, '');
    }
  }

  // Créer une alerte si le service est en panne
  if (status === 'offline' || status === 'error') {
    await createServiceAlert(service, status);
  }

  console.log(`📊 ${service.name}: ${status} (${responseTime}ms)`);
}

async function checkHttpService(service) {
  try {
    const url = `http://${service.host}:${service.port || 80}`;
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status < 500 // Considérer 4xx comme online
    });
    
    return response.status < 400 ? 'online' : 'warning';
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return 'offline';
    }
    return 'error';
  }
}

async function checkProxmoxService(service) {
  try {
    const config = JSON.parse(service.config || '{}');
    const baseUrl = `https://${service.host}:${service.port || 8006}/api2/json`;
    
    // Authentification avec token ou mot de passe
    let authHeaders = {};
    if (service.token) {
      authHeaders['Authorization'] = `PVEAPIToken=${service.username}:${service.token}`;
    } else {
      // Implémentation de l'authentification par mot de passe si nécessaire
      throw new Error('Authentification par mot de passe non implémentée');
    }

    // Vérifier le statut du cluster
    const clusterResponse = await axios.get(`${baseUrl}/cluster/status`, {
      headers: authHeaders,
      timeout: 10000,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    if (clusterResponse.status === 200) {
      const metrics = {};
      
      // Récupérer les métriques des nœuds
      try {
        const nodesResponse = await axios.get(`${baseUrl}/nodes`, {
          headers: authHeaders,
          timeout: 10000,
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });

        if (nodesResponse.data && nodesResponse.data.data) {
          const nodes = nodesResponse.data.data;
          metrics.nodes_count = nodes.length;
          metrics.nodes_online = nodes.filter(node => node.status === 'online').length;
          
          // Calculer l'utilisation moyenne des ressources
          let totalCpu = 0, totalMemory = 0, totalDisk = 0;
          let nodeCount = 0;

          for (const node of nodes) {
            if (node.status === 'online') {
              totalCpu += (node.cpu || 0) * 100;
              totalMemory += ((node.mem || 0) / (node.maxmem || 1)) * 100;
              totalDisk += ((node.disk || 0) / (node.maxdisk || 1)) * 100;
              nodeCount++;
            }
          }

          if (nodeCount > 0) {
            metrics.avg_cpu_usage = { value: totalCpu / nodeCount, unit: '%' };
            metrics.avg_memory_usage = { value: totalMemory / nodeCount, unit: '%' };
            metrics.avg_disk_usage = { value: totalDisk / nodeCount, unit: '%' };
          }
        }
      } catch (metricsError) {
        console.warn('Impossible de récupérer les métriques Proxmox:', metricsError.message);
      }

      return { status: 'online', metrics };
    }

    return { status: 'warning', metrics: {} };

  } catch (error) {
    console.error('Erreur Proxmox:', error.message);
    return { status: 'offline', metrics: {} };
  }
}

async function checkDockerService(service) {
  try {
    // Implémentation basique pour Docker
    // Dans un environnement réel, vous utiliseriez l'API Docker
    const url = `http://${service.host}:${service.port || 2376}/version`;
    
    const response = await axios.get(url, {
      timeout: 10000
    });

    if (response.status === 200) {
      const metrics = {
        docker_version: response.data.Version || 'unknown'
      };

      // Essayer de récupérer les informations sur les conteneurs
      try {
        const containersResponse = await axios.get(`http://${service.host}:${service.port || 2376}/containers/json?all=true`, {
          timeout: 5000
        });

        if (containersResponse.data) {
          const containers = containersResponse.data;
          metrics.containers_total = containers.length;
          metrics.containers_running = containers.filter(c => c.State === 'running').length;
          metrics.containers_stopped = containers.filter(c => c.State === 'exited').length;
        }
      } catch (containerError) {
        console.warn('Impossible de récupérer les informations des conteneurs:', containerError.message);
      }

      return { status: 'online', metrics };
    }

    return { status: 'warning', metrics: {} };

  } catch (error) {
    return { status: 'offline', metrics: {} };
  }
}

async function checkPingService(service) {
  // Implémentation basique du ping
  // Dans un environnement réel, vous utiliseriez un module de ping
  try {
    const response = await axios.get(`http://${service.host}:${service.port || 80}`, {
      timeout: 5000
    });
    return 'online';
  } catch (error) {
    return 'offline';
  }
}

function saveMetric(serviceId, metricName, metricValue, unit = '') {
  const db = getDatabase();
  
  db.run(
    'INSERT INTO metrics (service_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)',
    [serviceId, metricName, metricValue, unit],
    (err) => {
      if (err) {
        console.error('Erreur lors de l\'enregistrement de la métrique:', err);
      }
    }
  );
}

async function createServiceAlert(service, status) {
  const db = getDatabase();
  
  // Vérifier s'il y a déjà une alerte active pour ce service
  db.get(
    'SELECT id FROM alerts WHERE source_type = ? AND source_id = ? AND resolved = 0 AND type = ?',
    ['service', service.id, 'service_down'],
    (err, existingAlert) => {
      if (err) {
        console.error('Erreur lors de la vérification des alertes:', err);
        return;
      }

      if (!existingAlert) {
        // Créer une nouvelle alerte
        const severity = status === 'offline' ? 'critical' : 'warning';
        const title = `Service ${service.name} ${status === 'offline' ? 'hors ligne' : 'en erreur'}`;
        const message = `Le service ${service.name} (${service.host}:${service.port}) est ${status === 'offline' ? 'hors ligne' : 'en erreur'}.`;

        db.run(
          'INSERT INTO alerts (type, title, message, severity, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)',
          ['service_down', title, message, severity, 'service', service.id],
          (err) => {
            if (err) {
              console.error('Erreur lors de la création de l\'alerte:', err);
            } else {
              console.log(`🚨 Alerte créée pour ${service.name}: ${title}`);
            }
          }
        );
      }
    }
  );
}

// Nettoyer les anciennes métriques (garder seulement 7 jours)
function cleanupOldMetrics() {
  const db = getDatabase();
  
  db.run(
    'DELETE FROM metrics WHERE timestamp < datetime(\'now\', \'-7 days\')',
    (err) => {
      if (err) {
        console.error('Erreur lors du nettoyage des métriques:', err);
      } else {
        console.log('🧹 Anciennes métriques nettoyées');
      }
    }
  );
}

// Programmer le nettoyage quotidien
cron.schedule('0 2 * * *', cleanupOldMetrics); // Tous les jours à 2h du matin

module.exports = {
  startMonitoring,
  stopMonitoring,
  checkService,
  checkAllServices
};
const cron = require('node-cron');
const axios = require('axios');
const { getDatabase } = require('../database/init');

let updateCheckerInterval = null;

function startUpdateChecker() {
  const checkInterval = process.env.CHECK_INTERVAL_HOURS || 6;
  
  // Vérifier les mises à jour selon l'intervalle configuré
  updateCheckerInterval = cron.schedule(`0 */${checkInterval} * * *`, async () => {
    console.log('🔄 Vérification des mises à jour...');
    await checkAllApplicationsForUpdates();
  }, {
    scheduled: false
  });

  updateCheckerInterval.start();
  console.log(`✅ Vérificateur de mises à jour démarré (vérification toutes les ${checkInterval}h)`);

  // Effectuer une vérification immédiate après 10 secondes
  setTimeout(checkAllApplicationsForUpdates, 10000);
}

function stopUpdateChecker() {
  if (updateCheckerInterval) {
    updateCheckerInterval.stop();
    console.log('⏹️ Vérificateur de mises à jour arrêté');
  }
}

async function checkAllApplicationsForUpdates() {
  const db = getDatabase();
  
  db.all('SELECT * FROM applications', async (err, applications) => {
    if (err) {
      console.error('Erreur lors de la récupération des applications:', err);
      return;
    }

    console.log(`📱 Vérification de ${applications.length} applications...`);

    for (const application of applications) {
      try {
        await checkApplicationForUpdates(application);
        // Attendre un peu entre chaque vérification pour éviter de surcharger les APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Erreur lors de la vérification de ${application.name}:`, error.message);
      }
    }

    console.log('✅ Vérification des mises à jour terminée');
  });
}

async function checkApplicationForUpdates(application) {
  const db = getDatabase();
  
  try {
    const updateInfo = await fetchLatestVersion(application);
    
    if (!updateInfo.latestVersion) {
      console.warn(`⚠️ Impossible de récupérer la version pour ${application.name}`);
      return;
    }

    const updateAvailable = isUpdateAvailable(
      application.current_version,
      application.latest_version,
      updateInfo.latestVersion
    );

    // Mettre à jour l'application dans la base de données
    db.run(
      `UPDATE applications 
       SET latest_version = ?, update_available = ?, last_check = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [updateInfo.latestVersion, updateAvailable ? 1 : 0, application.id],
      (err) => {
        if (err) {
          console.error(`Erreur lors de la mise à jour de ${application.name}:`, err);
        }
      }
    );

    // Si une nouvelle version est détectée, l'ajouter à l'historique et créer une alerte
    if (updateAvailable && updateInfo.latestVersion !== application.latest_version) {
      // Ajouter à l'historique
      db.run(
        'INSERT INTO update_history (application_id, old_version, new_version) VALUES (?, ?, ?)',
        [application.id, application.latest_version || application.current_version, updateInfo.latestVersion],
        (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout à l\'historique:', err);
          }
        }
      );

      // Créer une alerte
      await createUpdateAlert(application, updateInfo.latestVersion);
      
      console.log(`🆕 Nouvelle version disponible pour ${application.name}: ${updateInfo.latestVersion}`);
    } else {
      console.log(`✅ ${application.name}: à jour (${updateInfo.latestVersion})`);
    }

  } catch (error) {
    console.error(`❌ Erreur lors de la vérification de ${application.name}:`, error.message);
    
    // Marquer la dernière vérification même en cas d'erreur
    db.run(
      'UPDATE applications SET last_check = CURRENT_TIMESTAMP WHERE id = ?',
      [application.id]
    );
  }
}

async function fetchLatestVersion(application) {
  const timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000;
  
  switch (application.provider) {
    case 'github':
      return await fetchGitHubVersion(application.repository, timeout);
    
    case 'dockerhub':
      return await fetchDockerHubVersion(application.image, timeout);
    
    case 'api':
      return await fetchApiVersion(application.api_url, timeout);
    
    default:
      throw new Error(`Provider non supporté: ${application.provider}`);
  }
}

async function fetchGitHubVersion(repository, timeout) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repository}/releases/latest`,
      { 
        timeout,
        headers: {
          'User-Agent': 'CheckUp-Monitor/1.0'
        }
      }
    );

    return {
      latestVersion: response.data.tag_name,
      releaseDate: response.data.published_at,
      releaseNotes: response.data.body
    };

  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Essayer de récupérer les tags si pas de releases
      try {
        const tagsResponse = await axios.get(
          `https://api.github.com/repos/${repository}/tags`,
          { 
            timeout,
            headers: {
              'User-Agent': 'CheckUp-Monitor/1.0'
            }
          }
        );

        if (tagsResponse.data && tagsResponse.data.length > 0) {
          return {
            latestVersion: tagsResponse.data[0].name,
            releaseDate: null,
            releaseNotes: null
          };
        }
      } catch (tagsError) {
        throw new Error(`Impossible de récupérer les tags GitHub: ${tagsError.message}`);
      }
    }
    
    throw new Error(`Erreur GitHub API: ${error.message}`);
  }
}

async function fetchDockerHubVersion(image, timeout) {
  try {
    // Séparer le namespace/image si nécessaire
    const imageParts = image.includes('/') ? image : `library/${image}`;
    
    const response = await axios.get(
      `https://registry.hub.docker.com/v2/repositories/${imageParts}/tags/?page_size=25&ordering=-last_updated`,
      { timeout }
    );

    if (response.data && response.data.results && response.data.results.length > 0) {
      // Filtrer les tags pour éviter les tags de développement
      const validTags = response.data.results.filter(tag => {
        const tagName = tag.name;
        return !tagName.includes('dev') && 
               !tagName.includes('beta') && 
               !tagName.includes('alpha') && 
               !tagName.includes('rc') &&
               tagName !== 'latest';
      });

      const latestTag = validTags.length > 0 ? validTags[0] : response.data.results[0];

      return {
        latestVersion: latestTag.name,
        releaseDate: latestTag.last_updated,
        releaseNotes: null
      };
    }

    throw new Error('Aucun tag trouvé');

  } catch (error) {
    throw new Error(`Erreur Docker Hub API: ${error.message}`);
  }
}

async function fetchApiVersion(apiUrl, timeout) {
  try {
    const response = await axios.get(apiUrl, { timeout });
    
    // Essayer différents formats de réponse
    let version = null;
    
    if (response.data.version) {
      version = response.data.version;
    } else if (response.data.tag_name) {
      version = response.data.tag_name;
    } else if (response.data.latest) {
      version = response.data.latest;
    } else if (typeof response.data === 'string') {
      version = response.data;
    }

    if (!version) {
      throw new Error('Format de réponse API non reconnu');
    }

    return {
      latestVersion: version,
      releaseDate: response.data.published_at || response.data.date || null,
      releaseNotes: response.data.notes || response.data.changelog || null
    };

  } catch (error) {
    throw new Error(`Erreur API personnalisée: ${error.message}`);
  }
}

function isUpdateAvailable(currentVersion, knownLatestVersion, newLatestVersion) {
  // Si pas de version actuelle définie, considérer qu'une mise à jour est disponible
  if (!currentVersion && newLatestVersion) {
    return true;
  }

  // Si la nouvelle version est différente de la version connue et de la version actuelle
  if (newLatestVersion && 
      newLatestVersion !== currentVersion && 
      newLatestVersion !== knownLatestVersion) {
    return true;
  }

  return false;
}

function compareVersions(version1, version2) {
  // Fonction basique de comparaison de versions
  // Peut être améliorée avec une bibliothèque comme semver
  
  if (!version1 || !version2) {
    return 0;
  }

  // Nettoyer les versions (enlever v, V, etc.)
  const clean1 = version1.replace(/^[vV]/, '');
  const clean2 = version2.replace(/^[vV]/, '');

  // Séparer par points
  const parts1 = clean1.split('.').map(part => parseInt(part.replace(/\D/g, '')) || 0);
  const parts2 = clean2.split('.').map(part => parseInt(part.replace(/\D/g, '')) || 0);

  // Comparer chaque partie
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

async function createUpdateAlert(application, newVersion) {
  const db = getDatabase();
  
  // Vérifier s'il y a déjà une alerte pour cette application
  db.get(
    'SELECT id FROM alerts WHERE source_type = ? AND source_id = ? AND resolved = 0 AND type = ?',
    ['application', application.id, 'update_available'],
    (err, existingAlert) => {
      if (err) {
        console.error('Erreur lors de la vérification des alertes:', err);
        return;
      }

      if (!existingAlert) {
        const title = `Mise à jour disponible: ${application.name}`;
        const message = `Une nouvelle version de ${application.name} est disponible: ${newVersion}`;

        db.run(
          'INSERT INTO alerts (type, title, message, severity, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)',
          ['update_available', title, message, 'info', 'application', application.id],
          (err) => {
            if (err) {
              console.error('Erreur lors de la création de l\'alerte:', err);
            } else {
              console.log(`🔔 Alerte créée: ${title}`);
            }
          }
        );
      }
    }
  );
}

// Nettoyer l'ancien historique des mises à jour (garder seulement 30 jours)
function cleanupUpdateHistory() {
  const db = getDatabase();
  
  db.run(
    'DELETE FROM update_history WHERE detected_at < datetime(\'now\', \'-30 days\')',
    (err) => {
      if (err) {
        console.error('Erreur lors du nettoyage de l\'historique:', err);
      } else {
        console.log('🧹 Ancien historique des mises à jour nettoyé');
      }
    }
  );
}

// Programmer le nettoyage hebdomadaire
cron.schedule('0 3 * * 0', cleanupUpdateHistory); // Tous les dimanches à 3h du matin

module.exports = {
  startUpdateChecker,
  stopUpdateChecker,
  checkApplicationForUpdates,
  checkAllApplicationsForUpdates
};
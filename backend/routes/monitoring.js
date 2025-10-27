const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Obtenir tous les services
router.get('/services', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM services ORDER BY name', (err, services) => {
    if (err) {
      console.error('Erreur lors de la récupération des services:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    // Masquer les mots de passe et tokens dans la réponse
    const sanitizedServices = services.map(service => ({
      ...service,
      password: service.password ? '***' : null,
      token: service.token ? '***' : null
    }));

    res.json({ services: sanitizedServices });
  });
});

// Obtenir un service spécifique
router.get('/services/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get('SELECT * FROM services WHERE id = ?', [id], (err, service) => {
    if (err) {
      console.error('Erreur lors de la récupération du service:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Masquer les informations sensibles
    service.password = service.password ? '***' : null;
    service.token = service.token ? '***' : null;

    res.json({ service });
  });
});

// Ajouter un nouveau service
router.post('/services', (req, res) => {
  const { name, type, host, port, username, password, token, config } = req.body;

  if (!name || !type || !host) {
    return res.status(400).json({ error: 'Nom, type et hôte requis' });
  }

  const db = getDatabase();
  
  db.run(
    `INSERT INTO services (name, type, host, port, username, password, token, config) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, type, host, port, username, password, token, JSON.stringify(config || {})],
    function(err) {
      if (err) {
        console.error('Erreur lors de l\'ajout du service:', err);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout du service' });
      }

      res.status(201).json({
        message: 'Service ajouté avec succès',
        service: { id: this.lastID, name, type, host, port }
      });
    }
  );
});

// Mettre à jour un service
router.put('/services/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, host, port, username, password, token, config } = req.body;

  if (!name || !type || !host) {
    return res.status(400).json({ error: 'Nom, type et hôte requis' });
  }

  const db = getDatabase();
  
  // Si le mot de passe ou token est '***', ne pas le mettre à jour
  let updateFields = [];
  let updateValues = [];

  updateFields.push('name = ?', 'type = ?', 'host = ?', 'port = ?', 'username = ?', 'config = ?', 'updated_at = CURRENT_TIMESTAMP');
  updateValues.push(name, type, host, port, username, JSON.stringify(config || {}));

  if (password && password !== '***') {
    updateFields.push('password = ?');
    updateValues.push(password);
  }

  if (token && token !== '***') {
    updateFields.push('token = ?');
    updateValues.push(token);
  }

  updateValues.push(id);

  db.run(
    `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues,
    function(err) {
      if (err) {
        console.error('Erreur lors de la mise à jour du service:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du service' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Service non trouvé' });
      }

      res.json({ message: 'Service mis à jour avec succès' });
    }
  );
});

// Supprimer un service
router.delete('/services/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM services WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erreur lors de la suppression du service:', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression du service' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Supprimer aussi les métriques associées
    db.run('DELETE FROM metrics WHERE service_id = ?', [id]);

    res.json({ message: 'Service supprimé avec succès' });
  });
});

// Obtenir les métriques d'un service
router.get('/services/:id/metrics', (req, res) => {
  const { id } = req.params;
  const { hours = 24 } = req.query;
  const db = getDatabase();
  
  db.all(
    `SELECT * FROM metrics 
     WHERE service_id = ? AND timestamp > datetime('now', '-${hours} hours')
     ORDER BY timestamp DESC`,
    [id],
    (err, metrics) => {
      if (err) {
        console.error('Erreur lors de la récupération des métriques:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      res.json({ metrics });
    }
  );
});

// Obtenir le statut global du monitoring
router.get('/status', (req, res) => {
  const db = getDatabase();
  
  // Compter les services par statut
  db.all(
    `SELECT status, COUNT(*) as count FROM services GROUP BY status`,
    (err, statusCounts) => {
      if (err) {
        console.error('Erreur lors de la récupération du statut:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      // Compter les alertes non résolues
      db.get(
        'SELECT COUNT(*) as count FROM alerts WHERE resolved = 0',
        (err, alertCount) => {
          if (err) {
            console.error('Erreur lors du comptage des alertes:', err);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
          }

          const status = {
            services: statusCounts.reduce((acc, item) => {
              acc[item.status] = item.count;
              return acc;
            }, {}),
            activeAlerts: alertCount.count,
            lastUpdate: new Date().toISOString()
          };

          res.json({ status });
        }
      );
    }
  );
});

// Tester la connexion à un service
router.post('/services/:id/test', async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get('SELECT * FROM services WHERE id = ?', [id], async (err, service) => {
    if (err) {
      console.error('Erreur lors de la récupération du service:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    try {
      // Ici, vous pouvez implémenter la logique de test spécifique à chaque type de service
      const testResult = await testServiceConnection(service);
      
      // Mettre à jour le statut du service
      db.run(
        'UPDATE services SET status = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?',
        [testResult.status, id]
      );

      res.json({
        message: 'Test de connexion effectué',
        result: testResult
      });

    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      res.status(500).json({ 
        error: 'Erreur lors du test de connexion',
        details: error.message 
      });
    }
  });
});

// Fonction helper pour tester la connexion (à implémenter selon les besoins)
async function testServiceConnection(service) {
  // Implémentation basique - à étendre selon les types de services
  return {
    status: 'online',
    responseTime: Math.random() * 100,
    message: 'Connexion réussie'
  };
}

module.exports = router;
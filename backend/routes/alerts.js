const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Obtenir toutes les alertes
router.get('/', (req, res) => {
  const { status = 'all', limit = 50, offset = 0 } = req.query;
  const db = getDatabase();
  
  let whereClause = '';
  let params = [];

  if (status === 'active') {
    whereClause = 'WHERE resolved = 0';
  } else if (status === 'resolved') {
    whereClause = 'WHERE resolved = 1';
  } else if (status === 'unacknowledged') {
    whereClause = 'WHERE acknowledged = 0 AND resolved = 0';
  }

  params.push(parseInt(limit), parseInt(offset));

  db.all(
    `SELECT * FROM alerts ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    params,
    (err, alerts) => {
      if (err) {
        console.error('Erreur lors de la récupération des alertes:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      // Compter le total d'alertes
      db.get(
        `SELECT COUNT(*) as total FROM alerts ${whereClause}`,
        whereClause ? [] : [],
        (err, count) => {
          if (err) {
            console.error('Erreur lors du comptage des alertes:', err);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
          }

          res.json({ 
            alerts, 
            total: count.total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          });
        }
      );
    }
  );
});

// Obtenir une alerte spécifique
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get('SELECT * FROM alerts WHERE id = ?', [id], (err, alert) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'alerte:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!alert) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ alert });
  });
});

// Créer une nouvelle alerte
router.post('/', (req, res) => {
  const { type, title, message, severity = 'info', source_type, source_id } = req.body;

  if (!type || !title || !message) {
    return res.status(400).json({ error: 'Type, titre et message requis' });
  }

  const db = getDatabase();
  
  db.run(
    `INSERT INTO alerts (type, title, message, severity, source_type, source_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [type, title, message, severity, source_type, source_id],
    function(err) {
      if (err) {
        console.error('Erreur lors de la création de l\'alerte:', err);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'alerte' });
      }

      const alert = {
        id: this.lastID,
        type,
        title,
        message,
        severity,
        source_type,
        source_id,
        acknowledged: false,
        resolved: false,
        created_at: new Date().toISOString()
      };

      // Envoyer les notifications
      sendNotifications(alert);

      res.status(201).json({
        message: 'Alerte créée avec succès',
        alert
      });
    }
  );
});

// Acquitter une alerte
router.patch('/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run(
    'UPDATE alerts SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Erreur lors de l\'acquittement de l\'alerte:', err);
        return res.status(500).json({ error: 'Erreur lors de l\'acquittement de l\'alerte' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alerte non trouvée' });
      }

      res.json({ message: 'Alerte acquittée avec succès' });
    }
  );
});

// Résoudre une alerte
router.patch('/:id/resolve', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run(
    'UPDATE alerts SET resolved = 1, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Erreur lors de la résolution de l\'alerte:', err);
        return res.status(500).json({ error: 'Erreur lors de la résolution de l\'alerte' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Alerte non trouvée' });
      }

      res.json({ message: 'Alerte résolue avec succès' });
    }
  );
});

// Supprimer une alerte
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM alerts WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de l\'alerte:', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'alerte' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ message: 'Alerte supprimée avec succès' });
  });
});

// Obtenir les statistiques des alertes
router.get('/stats/summary', (req, res) => {
  const db = getDatabase();
  
  // Compter les alertes par statut
  db.all(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN acknowledged = 0 AND resolved = 0 THEN 1 ELSE 0 END) as unacknowledged,
       SUM(CASE WHEN severity = 'critical' AND resolved = 0 THEN 1 ELSE 0 END) as critical
     FROM alerts`,
    (err, stats) => {
      if (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      // Compter les alertes par type cette semaine
      db.all(
        `SELECT type, COUNT(*) as count 
         FROM alerts 
         WHERE created_at > datetime('now', '-7 days')
         GROUP BY type`,
        (err, weeklyTypes) => {
          if (err) {
            console.error('Erreur lors de la récupération des types hebdomadaires:', err);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
          }

          res.json({
            summary: stats[0],
            weeklyByType: weeklyTypes,
            lastUpdate: new Date().toISOString()
          });
        }
      );
    }
  );
});

// Routes pour les paramètres de notification

// Obtenir les paramètres de notification de l'utilisateur
router.get('/notifications/settings', (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT * FROM notification_settings WHERE user_id = ?',
    [req.user.id],
    (err, settings) => {
      if (err) {
        console.error('Erreur lors de la récupération des paramètres:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      // Masquer les informations sensibles dans la config
      const sanitizedSettings = settings.map(setting => ({
        ...setting,
        config: setting.config ? JSON.parse(setting.config) : {}
      }));

      res.json({ settings: sanitizedSettings });
    }
  );
});

// Ajouter ou mettre à jour un paramètre de notification
router.post('/notifications/settings', (req, res) => {
  const { type, config, enabled = true } = req.body;

  if (!type || !config) {
    return res.status(400).json({ error: 'Type et configuration requis' });
  }

  const db = getDatabase();
  
  // Vérifier si le paramètre existe déjà
  db.get(
    'SELECT id FROM notification_settings WHERE user_id = ? AND type = ?',
    [req.user.id, type],
    (err, existing) => {
      if (err) {
        console.error('Erreur lors de la vérification du paramètre:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      if (existing) {
        // Mettre à jour
        db.run(
          'UPDATE notification_settings SET config = ?, enabled = ? WHERE id = ?',
          [JSON.stringify(config), enabled ? 1 : 0, existing.id],
          function(err) {
            if (err) {
              console.error('Erreur lors de la mise à jour du paramètre:', err);
              return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
            }

            res.json({ message: 'Paramètre de notification mis à jour' });
          }
        );
      } else {
        // Créer
        db.run(
          'INSERT INTO notification_settings (user_id, type, config, enabled) VALUES (?, ?, ?, ?)',
          [req.user.id, type, JSON.stringify(config), enabled ? 1 : 0],
          function(err) {
            if (err) {
              console.error('Erreur lors de la création du paramètre:', err);
              return res.status(500).json({ error: 'Erreur lors de la création' });
            }

            res.status(201).json({ 
              message: 'Paramètre de notification créé',
              id: this.lastID
            });
          }
        );
      }
    }
  );
});

// Supprimer un paramètre de notification
router.delete('/notifications/settings/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run(
    'DELETE FROM notification_settings WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        console.error('Erreur lors de la suppression du paramètre:', err);
        return res.status(500).json({ error: 'Erreur lors de la suppression' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Paramètre non trouvé' });
      }

      res.json({ message: 'Paramètre de notification supprimé' });
    }
  );
});

// Tester une notification
router.post('/notifications/test', async (req, res) => {
  const { type, config } = req.body;

  if (!type || !config) {
    return res.status(400).json({ error: 'Type et configuration requis' });
  }

  try {
    const testAlert = {
      type: 'test',
      title: 'Test de notification CheckUp',
      message: 'Ceci est un test de notification depuis CheckUp.',
      severity: 'info',
      created_at: new Date().toISOString()
    };

    const result = await sendTestNotification(type, config, testAlert);
    
    res.json({
      message: 'Test de notification envoyé',
      result
    });

  } catch (error) {
    console.error('Erreur lors du test de notification:', error);
    res.status(500).json({
      error: 'Erreur lors du test de notification',
      details: error.message
    });
  }
});

// Fonction helper pour envoyer les notifications
async function sendNotifications(alert) {
  const db = getDatabase();
  
  db.all(
    'SELECT * FROM notification_settings WHERE enabled = 1',
    async (err, settings) => {
      if (err) {
        console.error('Erreur lors de la récupération des paramètres de notification:', err);
        return;
      }

      for (const setting of settings) {
        try {
          const config = JSON.parse(setting.config);
          await sendNotification(setting.type, config, alert);
        } catch (error) {
          console.error(`Erreur lors de l'envoi de la notification ${setting.type}:`, error);
        }
      }
    }
  );
}

// Fonction helper pour envoyer une notification
async function sendNotification(type, config, alert) {
  const axios = require('axios');

  switch (type) {
    case 'gotify':
      if (config.url && config.token) {
        await axios.post(`${config.url}/message`, {
          title: alert.title,
          message: alert.message,
          priority: getSeverityPriority(alert.severity)
        }, {
          headers: {
            'X-Gotify-Key': config.token
          }
        });
      }
      break;

    case 'webhook':
      if (config.url) {
        await axios.post(config.url, {
          alert,
          timestamp: new Date().toISOString()
        }, {
          headers: config.headers || {}
        });
      }
      break;

    case 'email':
      // Implémentation email à ajouter selon vos besoins
      console.log('Notification email:', alert.title);
      break;

    default:
      console.warn(`Type de notification non supporté: ${type}`);
  }
}

// Fonction helper pour tester une notification
async function sendTestNotification(type, config, alert) {
  return await sendNotification(type, config, alert);
}

// Fonction helper pour convertir la sévérité en priorité Gotify
function getSeverityPriority(severity) {
  switch (severity) {
    case 'critical': return 10;
    case 'error': return 7;
    case 'warning': return 4;
    case 'info': return 1;
    default: return 1;
  }
}

module.exports = router;
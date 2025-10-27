const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Obtenir toutes les applications
router.get('/applications', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM applications ORDER BY name', (err, applications) => {
    if (err) {
      console.error('Erreur lors de la récupération des applications:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    res.json({ applications });
  });
});

// Obtenir une application spécifique
router.get('/applications/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get('SELECT * FROM applications WHERE id = ?', [id], (err, application) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'application:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application non trouvée' });
    }

    res.json({ application });
  });
});

// Ajouter une nouvelle application
router.post('/applications', (req, res) => {
  const { name, provider, repository, image, api_url, current_version } = req.body;

  if (!name || !provider) {
    return res.status(400).json({ error: 'Nom et fournisseur requis' });
  }

  // Validation selon le provider
  if (provider === 'github' && !repository) {
    return res.status(400).json({ error: 'Repository requis pour GitHub' });
  }
  if (provider === 'dockerhub' && !image) {
    return res.status(400).json({ error: 'Image requise pour Docker Hub' });
  }
  if (provider === 'api' && !api_url) {
    return res.status(400).json({ error: 'URL API requise pour API personnalisée' });
  }

  const db = getDatabase();
  
  db.run(
    `INSERT INTO applications (name, provider, repository, image, api_url, current_version) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, provider, repository, image, api_url, current_version],
    function(err) {
      if (err) {
        console.error('Erreur lors de l\'ajout de l\'application:', err);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'application' });
      }

      res.status(201).json({
        message: 'Application ajoutée avec succès',
        application: { 
          id: this.lastID, 
          name, 
          provider, 
          repository, 
          image, 
          api_url, 
          current_version 
        }
      });
    }
  );
});

// Mettre à jour une application
router.put('/applications/:id', (req, res) => {
  const { id } = req.params;
  const { name, provider, repository, image, api_url, current_version } = req.body;

  if (!name || !provider) {
    return res.status(400).json({ error: 'Nom et fournisseur requis' });
  }

  const db = getDatabase();
  
  db.run(
    `UPDATE applications 
     SET name = ?, provider = ?, repository = ?, image = ?, api_url = ?, 
         current_version = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, provider, repository, image, api_url, current_version, id],
    function(err) {
      if (err) {
        console.error('Erreur lors de la mise à jour de l\'application:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'application' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Application non trouvée' });
      }

      res.json({ message: 'Application mise à jour avec succès' });
    }
  );
});

// Supprimer une application
router.delete('/applications/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM applications WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erreur lors de la suppression de l\'application:', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression de l\'application' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Application non trouvée' });
    }

    // Supprimer aussi l'historique des mises à jour
    db.run('DELETE FROM update_history WHERE application_id = ?', [id]);

    res.json({ message: 'Application supprimée avec succès' });
  });
});

// Vérifier les mises à jour pour une application spécifique
router.post('/applications/:id/check', async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.get('SELECT * FROM applications WHERE id = ?', [id], async (err, application) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'application:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!application) {
      return res.status(404).json({ error: 'Application non trouvée' });
    }

    try {
      const updateInfo = await checkForUpdates(application);
      
      // Mettre à jour l'application avec les nouvelles informations
      db.run(
        `UPDATE applications 
         SET latest_version = ?, update_available = ?, last_check = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [updateInfo.latestVersion, updateInfo.updateAvailable ? 1 : 0, id]
      );

      // Si une nouvelle version est détectée, l'ajouter à l'historique
      if (updateInfo.updateAvailable && updateInfo.latestVersion !== application.latest_version) {
        db.run(
          'INSERT INTO update_history (application_id, old_version, new_version) VALUES (?, ?, ?)',
          [id, application.latest_version || application.current_version, updateInfo.latestVersion]
        );
      }

      res.json({
        message: 'Vérification des mises à jour effectuée',
        result: updateInfo
      });

    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la vérification des mises à jour',
        details: error.message 
      });
    }
  });
});

// Vérifier les mises à jour pour toutes les applications
router.post('/check-all', async (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM applications', async (err, applications) => {
    if (err) {
      console.error('Erreur lors de la récupération des applications:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    const results = [];
    
    for (const application of applications) {
      try {
        const updateInfo = await checkForUpdates(application);
        
        // Mettre à jour l'application
        db.run(
          `UPDATE applications 
           SET latest_version = ?, update_available = ?, last_check = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [updateInfo.latestVersion, updateInfo.updateAvailable ? 1 : 0, application.id]
        );

        // Ajouter à l'historique si nécessaire
        if (updateInfo.updateAvailable && updateInfo.latestVersion !== application.latest_version) {
          db.run(
            'INSERT INTO update_history (application_id, old_version, new_version) VALUES (?, ?, ?)',
            [application.id, application.latest_version || application.current_version, updateInfo.latestVersion]
          );
        }

        results.push({
          id: application.id,
          name: application.name,
          ...updateInfo
        });

      } catch (error) {
        console.error(`Erreur lors de la vérification de ${application.name}:`, error);
        results.push({
          id: application.id,
          name: application.name,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Vérification des mises à jour terminée',
      results
    });
  });
});

// Obtenir l'historique des mises à jour
router.get('/history', (req, res) => {
  const { limit = 50 } = req.query;
  const db = getDatabase();
  
  db.all(
    `SELECT uh.*, a.name as application_name 
     FROM update_history uh 
     JOIN applications a ON uh.application_id = a.id 
     ORDER BY uh.detected_at DESC 
     LIMIT ?`,
    [parseInt(limit)],
    (err, history) => {
      if (err) {
        console.error('Erreur lors de la récupération de l\'historique:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      res.json({ history });
    }
  );
});

// Obtenir les statistiques des mises à jour
router.get('/stats', (req, res) => {
  const db = getDatabase();
  
  // Compter les applications avec des mises à jour disponibles
  db.get(
    'SELECT COUNT(*) as count FROM applications WHERE update_available = 1',
    (err, updatesAvailable) => {
      if (err) {
        console.error('Erreur lors du comptage des mises à jour:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      // Compter le total d'applications
      db.get(
        'SELECT COUNT(*) as count FROM applications',
        (err, totalApps) => {
          if (err) {
            console.error('Erreur lors du comptage des applications:', err);
            return res.status(500).json({ error: 'Erreur interne du serveur' });
          }

          // Compter les mises à jour détectées cette semaine
          db.get(
            `SELECT COUNT(*) as count FROM update_history 
             WHERE detected_at > datetime('now', '-7 days')`,
            (err, weeklyUpdates) => {
              if (err) {
                console.error('Erreur lors du comptage des mises à jour hebdomadaires:', err);
                return res.status(500).json({ error: 'Erreur interne du serveur' });
              }

              const stats = {
                totalApplications: totalApps.count,
                updatesAvailable: updatesAvailable.count,
                weeklyUpdates: weeklyUpdates.count,
                lastCheck: new Date().toISOString()
              };

              res.json({ stats });
            }
          );
        }
      );
    }
  );
});

// Fonction helper pour vérifier les mises à jour
async function checkForUpdates(application) {
  const axios = require('axios');
  
  try {
    let latestVersion = null;
    
    switch (application.provider) {
      case 'github':
        const githubResponse = await axios.get(
          `https://api.github.com/repos/${application.repository}/releases/latest`,
          { timeout: 10000 }
        );
        latestVersion = githubResponse.data.tag_name;
        break;
        
      case 'dockerhub':
        const dockerResponse = await axios.get(
          `https://registry.hub.docker.com/v2/repositories/${application.image}/tags/?page_size=1`,
          { timeout: 10000 }
        );
        if (dockerResponse.data.results && dockerResponse.data.results.length > 0) {
          latestVersion = dockerResponse.data.results[0].name;
        }
        break;
        
      case 'api':
        const apiResponse = await axios.get(application.api_url, { timeout: 10000 });
        // Supposer que l'API retourne { version: "x.x.x" }
        latestVersion = apiResponse.data.version || apiResponse.data.tag_name;
        break;
        
      default:
        throw new Error(`Provider non supporté: ${application.provider}`);
    }

    const updateAvailable = latestVersion && 
      latestVersion !== application.current_version && 
      latestVersion !== application.latest_version;

    return {
      latestVersion,
      updateAvailable,
      currentVersion: application.current_version
    };

  } catch (error) {
    throw new Error(`Erreur lors de la vérification des mises à jour: ${error.message}`);
  }
}

module.exports = router;
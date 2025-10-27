const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const router = express.Router();

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const db = getDatabase();
    
    // Vérifier si l'utilisateur existe déjà
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
      if (err) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      if (row) {
        return res.status(409).json({ error: 'Nom d\'utilisateur déjà utilisé' });
      }

      // Hasher le mot de passe
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Créer l'utilisateur
      db.run(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hashedPassword, email],
        function(err) {
          if (err) {
            console.error('Erreur lors de la création de l\'utilisateur:', err);
            return res.status(500).json({ error: 'Erreur lors de la création du compte' });
          }

          // Générer le token JWT
          const token = jwt.sign(
            { id: this.lastID, username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.status(201).json({
            message: 'Compte créé avec succès',
            token,
            user: { id: this.lastID, username, email }
          });
        }
      );
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Connexion
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    const db = getDatabase();
    
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error('Erreur lors de la recherche de l\'utilisateur:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Vérifier le mot de passe
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Mettre à jour la dernière connexion
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      // Générer le token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Connexion réussie',
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        }
      });
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Vérification du token
router.get('/verify', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', err);
      return res.status(500).json({ error: 'Erreur interne du serveur' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  });
});

// Profil utilisateur
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('Erreur lors de la récupération du profil:', err);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json({ user });
    }
  );
});

module.exports = { router, authenticateToken };
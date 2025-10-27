const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = process.env.DB_PATH || './data/checkup.db';
    const dbDir = path.dirname(dbPath);

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }

      console.log('Connexion à la base de données SQLite établie');
      createTables()
        .then(() => resolve())
        .catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    const tables = [
      // Table des utilisateurs
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`,

      // Table des services à monitorer
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'proxmox', 'docker', 'http', 'custom'
        host TEXT NOT NULL,
        port INTEGER,
        username TEXT,
        password TEXT,
        token TEXT,
        config TEXT, -- JSON config
        status TEXT DEFAULT 'unknown',
        last_check DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des applications à surveiller pour les mises à jour
      `CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT NOT NULL, -- 'github', 'dockerhub', 'api'
        repository TEXT, -- owner/repo pour GitHub
        image TEXT, -- image name pour Docker
        api_url TEXT, -- URL pour API custom
        current_version TEXT,
        latest_version TEXT,
        update_available BOOLEAN DEFAULT 0,
        last_check DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table des alertes
      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'service_down', 'update_available', 'threshold_exceeded'
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
        source_type TEXT, -- 'service', 'application'
        source_id INTEGER,
        acknowledged BOOLEAN DEFAULT 0,
        resolved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME,
        resolved_at DATETIME
      )`,

      // Table des métriques
      `CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (service_id) REFERENCES services (id)
      )`,

      // Table des notifications
      `CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL, -- 'email', 'gotify', 'webhook'
        config TEXT NOT NULL, -- JSON config
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Table de l'historique des mises à jour
      `CREATE TABLE IF NOT EXISTS update_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        old_version TEXT,
        new_version TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications (id)
      )`
    ];

    let completed = 0;
    const total = tables.length;

    tables.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`Erreur lors de la création de la table ${index + 1}:`, err);
          reject(err);
          return;
        }

        completed++;
        if (completed === total) {
          console.log('Toutes les tables ont été créées avec succès');
          resolve();
        }
      });
    });
  });
}

function getDatabase() {
  return db;
}

function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
        } else {
          console.log('Connexion à la base de données fermée');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
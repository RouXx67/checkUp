const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes
const authRoutes = require('./backend/routes/auth');
const monitoringRoutes = require('./backend/routes/monitoring');
const updatesRoutes = require('./backend/routes/updates');
const alertsRoutes = require('./backend/routes/alerts');

// Import services
const monitoringService = require('./backend/services/monitoring');
const updateChecker = require('./backend/services/updateChecker');

// Initialize database
const { initDatabase } = require('./backend/database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database before starting services
initDatabase().then(() => {
  console.log('✅ Database initialized');
  
  // Start monitoring services after database is ready
  console.log('🔍 Starting monitoring services...');
  monitoringService.startMonitoring();
  updateChecker.startUpdateChecker();
  console.log('✅ Service de monitoring démarré (vérification toutes les 2 minutes)');
  console.log('✅ Vérificateur de mises à jour démarré (vérification toutes les 6h)');
  console.log('✅ Monitoring services started');
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/alerts', alertsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Servir les fichiers statiques du frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 CheckUp server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop monitoring services
  monitoringService.stopMonitoring();
  updateChecker.stopUpdateChecker();
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  // Stop monitoring services
  monitoringService.stopMonitoring();
  updateChecker.stopUpdateChecker();
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
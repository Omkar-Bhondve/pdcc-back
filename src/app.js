const express = require('express');
const path = require('path');
const { initMiddleware } = require('./middleware/initMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { trackAPIPerformance, getAPIStats, getTopSlowAPIs } = require('./middleware/apiTracker');
const logger = require('./utils/logger');
const { getQuickStats } = require('./utils/systemMonitor');
const { validateEnvVars } = require('./config/envValidator');

const app = express();

// Validate environment variables on startup
const envValidation = validateEnvVars();
if (!envValidation.isValid && process.env.NODE_ENV === 'production') {
  console.error('❌ Environment validation failed. Please check your environment variables.');
  process.exit(1);
}

initMiddleware(app);

if (process.env.ENABLE_API_TRACKING !== 'false') {
  app.use(trackAPIPerformance);
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
}

app.use('/api', require('./routes'));

// SPA route - serve index.html for non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res, next) => {
    // Skip API routes and static assets - let them be handled by static middleware
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/uploads') || 
        req.path.startsWith('/health') ||
        req.path.startsWith('/assets') ||
        req.path.includes('.')) { // Skip files with extensions
      return next();
    }
    
    // Serve frontend index.html for all other routes
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Error handlers last
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

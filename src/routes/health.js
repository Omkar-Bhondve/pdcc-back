const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const os = require('os');
const { formatDateForDisplay } = require('../utils/dateUtils');
const logger = require('../utils/logger');
const { getQuickStats } = require('../utils/systemMonitor');
const { getAPIStats } = require('../middleware/apiTracker');
const { pool } = require('../config/db');

// Health check - open API (no auth required)
router.get('/', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    dbLatency = Date.now() - dbStart;
  } catch (error) {
    dbStatus = 'unhealthy';
  }

  const health = {
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: formatDateForDisplay(new Date()),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: {
        status: dbStatus,
        latency_ms: dbLatency
      }
    },
    system: {
      memory: {
        total_mb: Math.round(os.totalmem() / 1024 / 1024),
        free_mb: Math.round(os.freemem() / 1024 / 1024),
        used_percent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
      },
      cpu_load: os.loadavg(),
      platform: os.platform(),
      node_version: process.version
    },
    response_time_ms: Date.now() - startTime
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Logs API - open API (no auth required for basic access)
router.get('/logs', async (req, res) => {
  const logDir = process.env.LOG_DIR || './logs';
  const { date, lines = 100 } = req.query;

  try {
    // List available log files
    if (!date) {
      if (!fs.existsSync(logDir)) {
        return res.json({ files: [], message: 'No log directory found' });
      }

      const files = fs.readdirSync(logDir)
        .filter(f => f.endsWith('.log'))
        .map(f => {
          const stats = fs.statSync(path.join(logDir, f));
          return {
            filename: f,
            size_kb: Math.round(stats.size / 1024),
            modified: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

      return res.json({ files });
    }

    // Get specific log file content
    const filename = `app-${date}.log`;
    const filepath = path.join(logDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Log file not found', filename });
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim());
    
    // Return last N lines (most recent first)
    const limitedLines = allLines.slice(-parseInt(lines)).reverse();

    res.json({
      filename,
      total_lines: allLines.length,
      returned_lines: limitedLines.length,
      logs: limitedLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      })
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs', message: error.message });
  }
});

// Server status - detailed metrics
router.get('/status', async (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    timestamp: formatDateForDisplay(new Date()),
    process: {
      pid: process.pid,
      uptime_seconds: Math.round(process.uptime()),
      memory: {
        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024)
      }
    },
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      load_avg: os.loadavg(),
      total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
      free_memory_mb: Math.round(os.freemem() / 1024 / 1024)
    }
  });
});

module.exports = router;

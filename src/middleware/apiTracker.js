const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const apiLogDir = path.join(__dirname, '../../logs/api');
if (!fs.existsSync(apiLogDir)) {
  fs.mkdirSync(apiLogDir, { recursive: true });
}

// Create separate logger for API performance tracking
const apiLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(apiLogDir, 'api-performance.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

const apiMetrics = new Map();

const trackAPIPerformance = (req, res, next) => {
  const apiId = uuidv4();
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  req.apiId = apiId;
  req.startTime = startTime;
  
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    const metrics = {
      apiId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.user_id || req.user?.id || null,
      correlationId: req.correlationId,
      memory: {
        heapUsedDelta: ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (endMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB'
      },
      queryParams: Object.keys(req.query).length > 0 ? req.query : null,
      bodySize: req.headers['content-length'] || 0,
      responseSize: data ? Buffer.byteLength(data) : 0
    };
    
    if (duration > 1000) {
      metrics.performance = 'SLOW';
      logger.warn(`Slow API detected: ${req.method} ${req.path} took ${duration}ms`, metrics);
    } else if (duration > 500) {
      metrics.performance = 'MODERATE';
    } else {
      metrics.performance = 'FAST';
    }
    
    apiLogger.info('API_CALL', metrics);
    
    updateAPIStats(req.path, duration, res.statusCode);
    
    originalSend.call(this, data);
  };
  
  next();
};

const updateAPIStats = (path, duration, statusCode) => {
  // Log slow requests
  if (duration > 2000) {
    logger.performanceLogger.logSlowAPI('UNKNOWN', path, duration, statusCode);
  }
  
  if (!apiMetrics.has(path)) {
    apiMetrics.set(path, {
      totalCalls: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successCount: 0,
      errorCount: 0,
      statusCodes: {}
    });
  }
  
  const stats = apiMetrics.get(path);
  stats.totalCalls++;
  stats.totalDuration += duration;
  stats.avgDuration = Math.round(stats.totalDuration / stats.totalCalls);
  stats.minDuration = Math.min(stats.minDuration, duration);
  stats.maxDuration = Math.max(stats.maxDuration, duration);
  
  if (statusCode >= 200 && statusCode < 400) {
    stats.successCount++;
  } else {
    stats.errorCount++;
  }
  
  stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;
};

const getAPIStats = () => {
  const stats = {};
  
  apiMetrics.forEach((value, key) => {
    stats[key] = {
      ...value,
      successRate: ((value.successCount / value.totalCalls) * 100).toFixed(2) + '%'
    };
  });
  
  return stats;
};

const getTopSlowAPIs = (limit = 10) => {
  const sorted = Array.from(apiMetrics.entries())
    .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
    .slice(0, limit);
  
  return sorted.map(([path, stats]) => ({
    path,
    avgDuration: stats.avgDuration + 'ms',
    maxDuration: stats.maxDuration + 'ms',
    totalCalls: stats.totalCalls
  }));
};

const resetAPIStats = () => {
  apiMetrics.clear();
  logger.info('API statistics reset');
};

module.exports = {
  trackAPIPerformance,
  getAPIStats,
  getTopSlowAPIs,
  resetAPIStats
};

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Environment-based configuration
const enableLogger = process.env.ENABLE_LOGGER !== 'false';
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const isProduction = process.env.NODE_ENV === 'production';

// Production format with structured JSON
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, correlationId, userId, method, url, statusCode, responseTime, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      correlationId,
      userId,
      method,
      url,
      statusCode,
      responseTime,
      ...meta
    };
    
    if (stack) {
      logEntry.stack = stack;
    }
    
    return JSON.stringify(logEntry);
  })
);

// Development format with colors
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, correlationId, userId, method, url, statusCode, responseTime, stack }) => {
    let log = `${timestamp} [${level}]`;
    
    if (correlationId) log += ` [${correlationId}]`;
    if (userId) log += ` [User:${userId}]`;
    if (method && url) log += ` ${method} ${url}`;
    if (statusCode) log += ` ${statusCode}`;
    if (responseTime) log += ` (${responseTime}ms)`;
    
    log += `: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Create transports array based on configuration
const transports = [];

// Console transport
if (enableLogger) {
  transports.push(
    new winston.transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
      level: logLevel
    })
  );

// File transports for production
if (isProduction && enableLogger) {
  // Application logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: productionFormat,
      level: 'info'
    })
  );
  
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: productionFormat,
      level: 'error'
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  transports,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: enableLogger ? [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ] : [],
  rejectionHandlers: enableLogger ? [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ] : []
});

// Performance monitoring functions
const performanceLogger = {
  logSlowQuery: (query, duration, params = {}) => {
    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        type: 'slow_query',
        query: query.substring(0, 200) + '...',
        duration,
        params: JSON.stringify(params).substring(0, 100),
        threshold: 1000
      });
    }
  },
  
  logSlowAPI: (method, url, duration, statusCode) => {
    if (duration > 2000) {
      logger.warn('Slow API request detected', {
        type: 'slow_api',
        method,
        url,
        duration,
        statusCode,
        threshold: 2000
      });
    }
  },
  
  logMemoryUsage: () => {
    const usage = process.memoryUsage();
    logger.info('Memory usage', {
      type: 'memory_usage',
      rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(usage.external / 1024 / 1024) + ' MB'
    });
  }
};

// Security event logger
const securityLogger = {
  logAuthEvent: (event, userId, ip, details = {}) => {
    logger.info(`Authentication event: ${event}`, {
      type: 'auth_event',
      event,
      userId,
      ip,
      ...details
    });
  },
  
  logSecurityEvent: (event, severity, details = {}) => {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    logger[level](`Security event: ${event}`, {
      type: 'security_event',
      event,
      severity,
      ...details
    });
  },
  
  logCSRFViolation: (ip, userAgent, method, url) => {
    logger.error('CSRF violation detected', {
      type: 'csrf_violation',
      ip,
      userAgent,
      method,
      url,
      severity: 'high'
    });
  },
  
  logXSSAttempt: (input, ip, userAgent) => {
    logger.error('XSS attempt detected', {
      type: 'xss_attempt',
      input: input.substring(0, 100),
      ip,
      userAgent,
      severity: 'high'
    });
  }
};

// Health check logger
const healthLogger = {
  logHealthCheck: (status, checks) => {
    const level = status === 'healthy' ? 'info' : 'warn';
    logger[level](`Health check: ${status}`, {
      type: 'health_check',
      status,
      checks
    });
  },
  
  logStartup: (duration, features) => {
    logger.info('Application started', {
      type: 'startup',
      startupTime: duration,
      features,
      nodeVersion: process.version,
      platform: process.platform
    });
  }
};

// Business event logger
const businessLogger = {
  logUserAction: (userId, action, details = {}) => {
    logger.info(`User action: ${action}`, {
      type: 'user_action',
      userId,
      action,
      ...details
    });
  },
  
  logDataChange: (userId, entity, action, oldData, newData) => {
    logger.info(`Data change: ${entity} ${action}`, {
      type: 'data_change',
      userId,
      entity,
      action,
      oldData: JSON.stringify(oldData).substring(0, 500),
      newData: JSON.stringify(newData).substring(0, 500)
    });
  }
};

// Export the main logger and specialized loggers
module.exports = logger;
module.exports.performanceLogger = performanceLogger;
module.exports.securityLogger = securityLogger;
module.exports.healthLogger = healthLogger;
module.exports.businessLogger = businessLogger;
}

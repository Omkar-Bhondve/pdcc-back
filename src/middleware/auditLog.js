const { query } = require('../config/db');
const logger = require('../utils/logger');

const auditLog = (action, options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const { logBody = false, logResponse = false } = options;
    
    res.send = function(data) {
      setImmediate(async () => {
        try {
          const actorId = req.user?.user_id || req.user?.id || null;
          const actorType = req.user?.role || 'ANONYMOUS';
          const resource = req.originalUrl;
          const method = req.method;
          const statusCode = res.statusCode;
          const ipAddress = req.ip;
          const userAgent = req.headers['user-agent'] || null;
          const correlationId = req.correlationId || null;

          let requestBody = null;
          if (logBody && req.body) {
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
            if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
            if (sanitizedBody.refresh_token) sanitizedBody.refresh_token = '[REDACTED]';
            requestBody = JSON.stringify(sanitizedBody);
          }

          let responseBody = null;
          if (logResponse && statusCode >= 400) {
            responseBody = typeof data === 'string' ? data.substring(0, 2000) : null;
          }

          await query(
            `INSERT INTO iwms_audit_logs (action, actor_id, actor_type, resource, method, status_code, ip_address, user_agent, request_body, response_body, correlation_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            [action, actorId, actorType, resource, method, statusCode, ipAddress, userAgent, requestBody, responseBody, correlationId]
          );

        } catch (error) {
          logger.error('Audit log DB write failed:', error);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = { auditLog };

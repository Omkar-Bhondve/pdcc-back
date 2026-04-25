const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { xssProtection, buildHelmetConfig } = require('../config/security');
const { ENABLE_RATE_LIMIT, apiRateLimiter } = require('../config/rateLimiters');
const { csrfProtection } = require('./csrf');
const { sanitizeObject } = require('../utils/inputSanitizer');

const getAllowedOrigins = () => {
  const origins = [];
  
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  
  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000');
  }
  
  return [...new Set(origins)];
};

const initMiddleware = (app) => {
  app.use(cookieParser());
  
  app.use(compression());
  
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
  });
  
  if (process.env.ENABLE_CSP !== 'false') {
    app.use((req, res, next) => {
      buildHelmetConfig(res.locals.cspNonce)(req, res, next);
    });
  }
  
  if (process.env.ENABLE_CORS !== 'false') {
    const allowedOrigins = getAllowedOrigins();
    
    // Apply CORS only to API routes, not static assets
    app.use((req, res, next) => {
      if (req.path.startsWith('/assets') || req.path.startsWith('/public')) {
        return next(); // Skip CORS for static assets
      }
      
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          
          if (process.env.NODE_ENV === 'production') {
            if (!allowedOrigins.includes(origin)) {
              logger.warn(`CORS blocked: ${origin}`);
              return callback(new Error('Not allowed by CORS'), false);
            }
          }
          
          callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-TOKEN', 'X-Correlation-ID'],
        exposedHeaders: ['X-CSRF-TOKEN', 'X-Correlation-ID', 'X-Response-Time']
      })(req, res, next);
    });
  }
  
  app.use((req, res, next) => {
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    if (!res.headersSent) {
      res.setHeader('X-Correlation-ID', req.correlationId);
    }
    
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Don't set headers after response is sent
      if (!res.headersSent) {
        res.setHeader('X-Response-Time', `${duration}ms`);
      }
      
      const level = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
      logger[level](`[${req.correlationId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
      
      if (duration > 1000) {
        logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
      }
    });
    
    next();
  });
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  if (process.env.ENABLE_SECURITY_MW !== 'false') {
    app.use(xssProtection);
  }
  
  if (ENABLE_RATE_LIMIT) {
    app.use((req, res, next) => {
      if (req.path === '/health' || req.path.startsWith('/uploads')) {
        return next();
      }
      return apiRateLimiter(req, res, next);
    });
  }
  
  // Add CSRF protection
  if (process.env.ENABLE_CSRF !== 'false') {
    app.use(csrfProtection);
  }
  
  // Add input sanitization middleware
  app.use((req, res, next) => {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, {
        removeHtml: true,
        preventXss: true,
        preventSqlInjection: true,
        maxLength: 10000
      });
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query, {
        removeHtml: true,
        preventXss: true,
        preventSqlInjection: true,
        maxLength: 500
      });
    }
    
    next();
  });
  
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', cspDirectives);
    
    if (req.path.includes('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  });
};

module.exports = { initMiddleware };

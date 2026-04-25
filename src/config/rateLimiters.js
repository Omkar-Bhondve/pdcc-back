const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip
  } = options;
  
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded - Key: ${keyGenerator(req)}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req) => {
      return req.path === '/health';
    }
  });
};

const apiRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX) || 200,
  message: 'Too many API requests, please try again later'
});

const loginRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute instead of 15
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 100, // 100 attempts instead of 10
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.username || req.ip;
    return `login:${identifier}`;
  },
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => {
    const userId = req.user?.user_id || req.user?.id;
    return userId ? `upload:${userId}` : `upload:${req.ip}`;
  },
  message: 'Upload limit exceeded, please try again later'
});

module.exports = {
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT !== 'false',
  apiRateLimiter,
  loginRateLimiter,
  uploadRateLimiter,
  createRateLimiter
};

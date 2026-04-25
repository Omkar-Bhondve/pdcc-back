const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (payload) => {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (payload) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', { expiresIn });
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh');
  } catch (error) {
    return null;
  }
};

const generateToken = generateAccessToken;
const verifyToken = verifyAccessToken;

const getBcryptRounds = () => parseInt(process.env.BCRYPT_ROUNDS) || 12;

const getRefreshTokenExpiryMs = () => {
  const val = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const num = parseInt(val);
  if (val.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  if (val.endsWith('h')) return num * 60 * 60 * 1000;
  if (val.endsWith('m')) return num * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
};

const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    val = val.replace(/<\/?script[^>]*>/gi, '');
    val = val.replace(/[\u0000-\u001F\u007F]/g, '');
  }
  return val;
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    
    const value = obj[key];
    if (Array.isArray(value)) {
      obj[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item) : sanitizeValue(item)
      );
    } else if (value && typeof value === 'object') {
      obj[key] = sanitizeObject(value);
    } else {
      obj[key] = sanitizeValue(value);
    }
  }
  return obj;
};

const xssProtection = (req, res, next) => {
  if (process.env.ENABLE_SECURITY_MW !== 'false') {
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
  }
  next();
};

const buildHelmetConfig = (nonce) => helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.ENABLE_CSP === 'true' ? {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        nonce ? `'nonce-${nonce}'` : null
      ].filter(Boolean),
      scriptSrcElem: [
        "'self'",
        nonce ? `'nonce-${nonce}'` : null
      ].filter(Boolean),
      styleSrc: [
        "'self'",
        nonce ? `'nonce-${nonce}'` : null,
        "https://fonts.googleapis.com"
      ].filter(Boolean),
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  } : false
});

module.exports = {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  getBcryptRounds,
  getRefreshTokenExpiryMs,
  xssProtection,
  buildHelmetConfig,
  sanitizeObject,
  sanitizeValue
};

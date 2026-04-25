const crypto = require('crypto');
const cookie = require('cookie');

/**
 * CSRF Protection Middleware
 * Generates CSRF tokens and validates them on state-changing requests
 */

// CSRF token configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  }
};

// Generate secure random token
const generateToken = () => {
  return crypto.randomBytes(CSRF_CONFIG.tokenLength).toString('hex');
};

// Set CSRF token cookie
const setCSRFCookie = (res, token) => {
  const cookieValue = cookie.serialize(CSRF_CONFIG.cookieName, token, CSRF_CONFIG.cookieOptions);
  res.setHeader('Set-Cookie', cookieValue);
};

// Validate CSRF token
const validateCSRFToken = (req) => {
  const cookieToken = req.cookies && req.cookies[CSRF_CONFIG.cookieName];
  const headerToken = req.headers[CSRF_CONFIG.headerName];
  
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'hex'),
    Buffer.from(headerToken, 'hex')
  );
};

// CSRF middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests (read-only operations)
  const skipMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (skipMethods.includes(req.method)) {
    // Generate and set CSRF token for safe methods
    const token = generateToken();
    setCSRFCookie(res, token);
    return next();
  }
  
  // Skip CSRF for auth endpoints (they have their own protection)
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  
  // Skip CSRF for health checks
  if (req.path.startsWith('/health')) {
    return next();
  }
  
  // Validate CSRF token for state-changing requests
  if (!validateCSRFToken(req)) {
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_INVALID'
    });
  }
  
  // Generate new token for next request
  const newToken = generateToken();
  setCSRFCookie(res, newToken);
  
  next();
};

// Helper function to get CSRF token for API responses
const getCSRFToken = (req) => {
  return req.cookies && req.cookies[CSRF_CONFIG.cookieName];
};

module.exports = {
  csrfProtection,
  getCSRFToken,
  CSRF_CONFIG
};

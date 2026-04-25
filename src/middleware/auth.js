const { verifyAccessToken } = require('../config/security');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      throw ApiError.unauthorized('No token provided');
    }
    
    const payload = verifyAccessToken(token);
    if (!payload) {
      throw ApiError.unauthorized('Invalid or expired token');
    }
    
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        req.user = payload;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      
      const userPermissions = req.user.permissions || [];
      
      if (!userPermissions.includes(permission)) {
        logger.warn(`Permission denied: ${permission} for user ${req.user.user_id || req.user.id}`);
        throw ApiError.forbidden(`Permission denied: ${permission}`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireAnyPermission = (permissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      
      const userPermissions = req.user.permissions || [];
      const hasPermission = permissions.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        logger.warn(`Permission denied: requires any of [${permissions.join(', ')}] for user ${req.user.user_id || req.user.id}`);
        throw ApiError.forbidden('Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireAllPermissions = (permissions = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = permissions.every(p => userPermissions.includes(p));
      
      if (!hasAllPermissions) {
        logger.warn(`Permission denied: requires all of [${permissions.join(', ')}] for user ${req.user.user_id || req.user.id}`);
        throw ApiError.forbidden('Insufficient permissions');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireRole = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }
      
      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Role denied: requires [${allowedRoles.join(', ')}], user has ${userRole}`);
        throw ApiError.forbidden('Insufficient role');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole
};

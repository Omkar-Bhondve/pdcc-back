const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../constants/httpStatus');

class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
  
  static badRequest(msg, errors = null) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, msg, errors);
  }
  
  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, msg);
  }
  
  static forbidden(msg = 'Forbidden') {
    return new ApiError(HTTP_STATUS.FORBIDDEN, msg);
  }
  
  static notFound(msg = 'Resource not found') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, msg);
  }
  
  static conflict(msg = 'Resource conflict') {
    return new ApiError(HTTP_STATUS.CONFLICT, msg);
  }
  
  static unprocessableEntity(msg, errors = null) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, msg, errors);
  }
  
  static internal(msg = 'Internal server error') {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, msg);
  }
}

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal server error';
  
  if (err.code === '23505') {
    statusCode = HTTP_STATUS.CONFLICT;
    message = 'Resource already exists';
  }
  
  if (err.code === '23503') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid reference - related resource not found';
  }
  
  if (err.code === '23502') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Missing required field';
  }
  
  if (err.code === '22P02') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid input syntax';
  }
  
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](`[${req.correlationId}] ${message}`, {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.user_id || req.user?.id
  });
  
  const response = {
    success: false,
    error: message,
    correlationId: req.correlationId
  };
  
  if (err.errors) {
    response.errors = err.errors;
  }
  
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};

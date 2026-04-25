const { HTTP_STATUS } = require('../constants/httpStatus');

class ApiResponse {
  static success(res, data, message = 'Success') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data
    });
  }
  
  static created(res, data, message = 'Created successfully') {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message,
      data
    });
  }
  
  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total || 0,
        page: parseInt(pagination.page) || 1,
        limit: parseInt(pagination.limit) || 10,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasNext: (pagination.page * pagination.limit) < pagination.total,
        hasPrev: pagination.page > 1
      }
    });
  }
  
  static deleted(res, message = 'Deleted successfully') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message
    });
  }
  
  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }
  
  static error(res, statusCode, message, errors = null) {
    const response = {
      success: false,
      error: message
    };
    
    if (errors) {
      response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
  }

  // Additional methods from ResponseFormatter
  static updated(res, data, message = 'Resource updated successfully', meta = {}) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      ...meta
    });
  }

  static notFound(res, resource = 'Resource') {
    return this.error(res, HTTP_STATUS.NOT_FOUND, `${resource} not found`);
  }

  static conflict(res, message = 'Resource conflict') {
    return this.error(res, HTTP_STATUS.CONFLICT, message);
  }

  static badRequest(res, message = 'Invalid request', errors = []) {
    return this.error(res, HTTP_STATUS.BAD_REQUEST, message, errors);
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, HTTP_STATUS.UNAUTHORIZED, message);
  }

  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, HTTP_STATUS.FORBIDDEN, message);
  }

  static validationError(res, errors) {
    return this.badRequest(res, 'Validation failed', errors);
  }

  static bulkOperation(res, results, message = 'Bulk operation completed') {
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      errors: results.filter(r => !r.success).map(r => r.error)
    };

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data: { results, summary }
    });
  }
}

module.exports = ApiResponse;

const Joi = require('joi');
const { ApiError } = require('./errorHandler');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return next(ApiError.badRequest('Validation failed', errors));
    }
    
    req[source] = value;
    next();
  };
};

const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

const commonSchemas = {
  id: Joi.number().integer().positive().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('created_at'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC')
  })
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas
};

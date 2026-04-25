const Joi = require('joi');

// Custom validators for common validation patterns
const customValidators = {
  // Email validator with proper format
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 255 characters',
      'any.required': 'Email is required'
    }),

  // Strong password validator
  strongPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  // Name validator (letters, spaces, hyphens, apostrophes)
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'any.required': 'Name is required'
    }),

  // Phone number validator (international format)
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  // ID validator (positive integer)
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'ID must be a number',
      'number.integer': 'ID must be an integer',
      'number.positive': 'ID must be a positive number',
      'any.required': 'ID is required'
    }),

  // Boolean validator with explicit messages
  boolean: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Value must be true or false'
    }),

  // Date validator (YYYY-MM-DD format)
  date: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Date must be in YYYY-MM-DD format'
    }),

  // UUID validator
  uuid: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Please provide a valid UUID'
    }),

  // URL validator
  url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Please provide a valid URL'
    }),

  // Numeric range validator
  numberBetween: (min, max) => Joi.number()
    .min(min)
    .max(max)
    .optional()
    .messages({
      'number.min': `Value must be at least ${min}`,
      'number.max': `Value must be at most ${max}`
    }),

  // Array validator with item validation
  array: (itemSchema, min = 0, max = 100) => Joi.array()
    .items(itemSchema)
    .min(min)
    .max(max)
    .optional()
    .messages({
      'array.min': `Array must have at least ${min} item(s)`,
      'array.max': `Array cannot have more than ${max} item(s)`
    }),

  // Object validator with key validation
  object: (schema, requiredKeys = []) => Joi.object(schema)
    .required()
    .keys(schema)
    .messages({
      'object.base': 'Value must be an object'
    }),

  // String length validator
  stringLength: (min, max) => Joi.string()
    .min(min)
    .max(max)
    .optional()
    .messages({
      'string.min': `String must be at least ${min} characters long`,
      'string.max': `String cannot exceed ${max} characters`
    }),

  // Optional string validator
  optionalString: (max = 255) => Joi.string()
    .max(max)
    .allow('')
    .optional()
    .messages({
      'string.max': `String cannot exceed ${max} characters`
    }),

  // Required string validator
  requiredString: (min = 1, max = 255) => Joi.string()
    .min(min)
    .max(max)
    .required()
    .messages({
      'string.min': `String must be at least ${min} characters long`,
      'string.max': `String cannot exceed ${max} characters`,
      'any.required': 'This field is required'
    })
};

module.exports = {
  customValidators
};

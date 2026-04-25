const Joi = require('joi');
const { customValidators } = require('../utils/validators');

// Role validation schemas
const roleSchemas = {
  create: Joi.object({
    role_name: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER').required().messages({
      'any.only': 'Role must be one of: SUPER_ADMIN, ADMIN, MANAGER, USER',
      'any.required': 'Role name is required'
    }),
    description: Joi.string().max(255).allow('').optional(),
    is_active: Joi.boolean().optional()
  }),

  update: Joi.object({
    role_name: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER').optional(),
    description: Joi.string().max(255).allow('').optional(),
    is_active: Joi.boolean().optional()
  }),

  assignPermissions: Joi.object({
    permission_ids: Joi.array().items(Joi.number().integer().positive()).required().messages({
      'any.required': 'Permission IDs are required'
    })
  })
};

// User validation schemas
const userSchemas = {
  create: Joi.object({
    email: customValidators.email,
    full_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required'
    }),
    password: customValidators.strongPassword,
    role_id: Joi.number().integer().positive().required().messages({
      'any.required': 'Role is required'
    }),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'PENDING').required().messages({
      'any.only': 'Status must be one of: ACTIVE, INACTIVE, PENDING',
      'any.required': 'Status is required'
    })
  }),

  update: Joi.object({
    full_name: Joi.string().min(2).max(100).optional(),
    password: customValidators.strongPassword.optional(),
    role_id: Joi.number().integer().positive().optional(),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'PENDING').optional()
  })
};

// District validation schemas
const districtSchemas = {
  create: Joi.object({
    district_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'District name must be at least 2 characters',
      'string.max': 'District name cannot exceed 100 characters',
      'any.required': 'District name is required'
    }),
    description: Joi.string().max(500).allow('').optional(),
    is_active: Joi.boolean().optional()
  }),

  update: Joi.object({
    district_name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow('').optional(),
    is_active: Joi.boolean().optional()
  })
};

// Department validation schemas
const departmentSchemas = {
  create: Joi.object({
    department_name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name cannot exceed 100 characters',
      'any.required': 'Department name is required'
    }),
    description: Joi.string().max(500).allow('').optional(),
    is_active: Joi.boolean().optional()
  }),

  update: Joi.object({
    department_name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow('').optional(),
    is_active: Joi.boolean().optional()
  })
};

module.exports = {
  roleSchemas,
  userSchemas,
  districtSchemas,
  departmentSchemas
};

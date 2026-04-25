const express = require('express');
const router = express.Router();
const Joi = require('joi');
const districtService = require('../services/districtService');
const departmentService = require('../services/departmentService');
const ApiResponse = require('../utils/ApiResponse');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/auditLog');

const idSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const districtSchema = Joi.object({
  district_name: Joi.string().min(2).max(100).required(),
  district_code: Joi.string().max(20).optional().allow('', null)
});

const districtUpdateSchema = Joi.object({
  district_name: Joi.string().min(2).max(100),
  district_code: Joi.string().max(20).allow('', null),
  is_active: Joi.boolean()
});

const departmentSchema = Joi.object({
  department_name: Joi.string().min(2).max(100).required(),
  department_code: Joi.string().max(20).optional().allow('', null)
});

const departmentUpdateSchema = Joi.object({
  department_name: Joi.string().min(2).max(100),
  department_code: Joi.string().max(20).allow('', null),
  is_active: Joi.boolean()
});

// ==================== DISTRICTS ====================

router.get('/districts',
  authenticateToken,
  requirePermission('masters.districts.view'),
  asyncHandler(async (req, res) => {
    const districts = await districtService.getAll(req.query);
    return ApiResponse.success(res, districts, 'Districts retrieved successfully');
  })
);

router.get('/districts/:id',
  authenticateToken,
  requirePermission('masters.districts.view'),
  validateParams(idSchema),
  asyncHandler(async (req, res) => {
    const district = await districtService.getById(req.params.id);
    return ApiResponse.success(res, district);
  })
);

router.post('/districts',
  authenticateToken,
  requirePermission('masters.districts.create'),
  validateBody(districtSchema),
  auditLog('CREATE_DISTRICT'),
  asyncHandler(async (req, res) => {
    const district = await districtService.create(req.body, req.user.user_id);
    return ApiResponse.created(res, district, 'District created successfully');
  })
);

router.put('/districts/:id',
  authenticateToken,
  requirePermission('masters.districts.edit'),
  validateParams(idSchema),
  validateBody(districtUpdateSchema),
  auditLog('UPDATE_DISTRICT'),
  asyncHandler(async (req, res) => {
    const district = await districtService.update(req.params.id, req.body, req.user.user_id);
    return ApiResponse.success(res, district, 'District updated successfully');
  })
);

router.delete('/districts/:id',
  authenticateToken,
  requirePermission('masters.districts.delete'),
  validateParams(idSchema),
  auditLog('DELETE_DISTRICT'),
  asyncHandler(async (req, res) => {
    await districtService.remove(req.params.id, req.user.user_id);
    return ApiResponse.deleted(res, 'District deleted successfully');
  })
);

// ==================== DEPARTMENTS ====================

router.get('/departments',
  authenticateToken,
  requirePermission('masters.departments.view'),
  asyncHandler(async (req, res) => {
    const departments = await departmentService.getAll(req.query);
    return ApiResponse.success(res, departments, 'Departments retrieved successfully');
  })
);

router.get('/departments/:id',
  authenticateToken,
  requirePermission('masters.departments.view'),
  validateParams(idSchema),
  asyncHandler(async (req, res) => {
    const department = await departmentService.getById(req.params.id);
    return ApiResponse.success(res, department);
  })
);

router.post('/departments',
  authenticateToken,
  requirePermission('masters.departments.create'),
  validateBody(departmentSchema),
  auditLog('CREATE_DEPARTMENT'),
  asyncHandler(async (req, res) => {
    const department = await departmentService.create(req.body, req.user.user_id);
    return ApiResponse.created(res, department, 'Department created successfully');
  })
);

router.put('/departments/:id',
  authenticateToken,
  requirePermission('masters.departments.edit'),
  validateParams(idSchema),
  validateBody(departmentUpdateSchema),
  auditLog('UPDATE_DEPARTMENT'),
  asyncHandler(async (req, res) => {
    const department = await departmentService.update(req.params.id, req.body, req.user.user_id);
    return ApiResponse.success(res, department, 'Department updated successfully');
  })
);

router.delete('/departments/:id',
  authenticateToken,
  requirePermission('masters.departments.delete'),
  validateParams(idSchema),
  auditLog('DELETE_DEPARTMENT'),
  asyncHandler(async (req, res) => {
    await departmentService.remove(req.params.id, req.user.user_id);
    return ApiResponse.deleted(res, 'Department deleted successfully');
  })
);

module.exports = router;

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const workService = require('../services/workService');
const ApiResponse = require('../utils/ApiResponse');
const { validateBody } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { customValidators } = require('../utils/validators');

const createWorkSchema = Joi.object({
  work_name: Joi.string().min(2).max(255).optional().label('Work name')
});

const updateWorkSchema = Joi.object({
  work_name: Joi.string().min(2).max(255).optional().label('Work name'),
  status: Joi.string().valid('active', 'inactive').optional().label('Status')
});

// Get all work
router.get('/',
  authenticateToken,
  requirePermission('work.view'),
  asyncHandler(async (req, res) => {
    const work = await workService.getAll(req.query);
    return ApiResponse.success(res, work, 'Work list retrieved successfully');
  })
);

// Get work by ID
router.get('/:id',
  authenticateToken,
  requirePermission('work.view'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const work = await workService.getById(parseInt(id));
    return ApiResponse.success(res, work, 'Work retrieved successfully');
  })
);

// Create new work
router.post('/',
  authenticateToken,
  requirePermission('work.create'),
  validateBody(createWorkSchema),
  asyncHandler(async (req, res) => {
    const workData = req.body;
    const work = await workService.create(workData, req.user.user_id);
    return ApiResponse.created(res, work, 'Work created successfully');
  })
);

// Update work
router.put('/:id',
  authenticateToken,
  requirePermission('work.edit'),
  validateBody(updateWorkSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const workData = req.body;
    const work = await workService.update(parseInt(id), workData, req.user.user_id);
    return ApiResponse.success(res, work, 'Work updated successfully');
  })
);

// Delete work (soft delete)
router.delete('/:id',
  authenticateToken,
  requirePermission('work.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const work = await workService.softDelete(parseInt(id), req.user.user_id);
    return ApiResponse.success(res, work, 'Work deleted successfully');
  })
);

// Get work stats
router.get('/stats/summary',
  authenticateToken,
  requirePermission('work.view'),
  asyncHandler(async (req, res) => {
    const stats = await workService.getStats();
    return ApiResponse.success(res, stats, 'Work stats retrieved successfully');
  })
);

module.exports = router;

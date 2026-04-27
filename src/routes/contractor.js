const express = require('express');
const router = express.Router();
const Joi = require('joi');
const contractorService = require('../services/contractorService');
const ApiResponse = require('../utils/ApiResponse');
const { validateBody } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const createContractorSchema = Joi.object({
  contractor_type: Joi.string().valid('majur', 'sube').required().label('Contractor type'),
  majur_field: Joi.string().max(255).optional().allow(null, '').label('Majur field'),
  sube_field: Joi.string().max(255).optional().allow(null, '').label('Sube field'),
  email: Joi.string().email().optional().allow(null, '').label('Email')
});

const updateContractorSchema = Joi.object({
  contractor_type: Joi.string().valid('majur', 'sube').optional().label('Contractor type'),
  majur_field: Joi.string().max(255).optional().allow(null, '').label('Majur field'),
  sube_field: Joi.string().max(255).optional().allow(null, '').label('Sube field'),
  email: Joi.string().email().optional().allow(null, '').label('Email'),
  status: Joi.string().valid('active', 'inactive').optional().label('Status')
});

// Get all contractors
router.get('/',
  authenticateToken,
  requirePermission('contractor.view'),
  asyncHandler(async (req, res) => {
    const contractors = await contractorService.getAll(req.query);
    return ApiResponse.success(res, contractors, 'Contractor list retrieved successfully');
  })
);

// Get contractor by ID
router.get('/:id',
  authenticateToken,
  requirePermission('contractor.view'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contractor = await contractorService.getById(parseInt(id));
    return ApiResponse.success(res, contractor, 'Contractor retrieved successfully');
  })
);

// Create new contractor
router.post('/',
  authenticateToken,
  requirePermission('contractor.create'),
  validateBody(createContractorSchema),
  asyncHandler(async (req, res) => {
    const contractorData = req.body;
    const contractor = await contractorService.create(contractorData, req.user.user_id);
    return ApiResponse.created(res, contractor, 'Contractor created successfully');
  })
);

// Update contractor
router.put('/:id',
  authenticateToken,
  requirePermission('contractor.edit'),
  validateBody(updateContractorSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contractorData = req.body;
    const contractor = await contractorService.update(parseInt(id), contractorData, req.user.user_id);
    return ApiResponse.success(res, contractor, 'Contractor updated successfully');
  })
);

// Delete contractor (soft delete)
router.delete('/:id',
  authenticateToken,
  requirePermission('contractor.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contractor = await contractorService.softDelete(parseInt(id), req.user.user_id);
    return ApiResponse.success(res, contractor, 'Contractor deleted successfully');
  })
);

// Get contractor stats
router.get('/stats/summary',
  authenticateToken,
  requirePermission('contractor.view'),
  asyncHandler(async (req, res) => {
    const stats = await contractorService.getStats();
    return ApiResponse.success(res, stats, 'Contractor stats retrieved successfully');
  })
);

// Send credentials email to contractor
router.post('/:id/send-credentials',
  authenticateToken,
  requirePermission('contractor.send_email'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await contractorService.sendCredentialsEmail(parseInt(id), req.user.user_id);
    return ApiResponse.success(res, result, 'Credentials sent successfully');
  })
);

module.exports = router;

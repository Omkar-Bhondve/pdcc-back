const express = require('express');
const router = express.Router();
const permissionService = require('../services/permissionService');
const ApiResponse = require('../utils/ApiResponse');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/',
  authenticateToken,
  requirePermission('roles.view'),
  asyncHandler(async (req, res) => {
    const permissions = await permissionService.getAll(req.query.module);
    return ApiResponse.success(res, permissions, 'Permissions retrieved successfully');
  })
);

router.post('/sync',
  authenticateToken,
  requirePermission('roles.edit'),
  asyncHandler(async (req, res) => {
    const result = await permissionService.syncFromRegistry();
    return ApiResponse.success(res, result, 'Permissions synced successfully');
  })
);


router.get('/my-permissions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await permissionService.getMyPermissions(req.user.user_id);
    return ApiResponse.success(res, result);
  })
);

module.exports = router;

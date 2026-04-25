const express = require('express');
const router = express.Router();
const roleService = require('../services/roleService');
const permissionService = require('../services/permissionService');
const ApiResponse = require('../utils/ApiResponse');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateBody, validateParams, commonSchemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/auditLog');
const { roleSchemas } = require('../constants');

router.get('/',
  authenticateToken,
  requirePermission('roles.view'),
  asyncHandler(async (req, res) => {
    const roles = await roleService.getAll(req.query);
    return ApiResponse.paginated(res, roles, roles.pagination, 'Roles retrieved successfully');
  })
);

router.get('/:id',
  authenticateToken,
  requirePermission('roles.view'),
  // validateParams(commonSchemas.id),
  asyncHandler(async (req, res) => {
    const role = await roleService.getById(req.params.id);
    return ApiResponse.success(res, role, 'Role retrieved successfully');
  })
);

router.post('/',
  authenticateToken,
  requirePermission('roles.create'),
  // validateBody(roleSchemas.create),
  auditLog('CREATE_ROLE'),
  asyncHandler(async (req, res) => {
    const role = await roleService.create(req.body, req.user.user_id);
    return ApiResponse.created(res, role, 'Role created successfully');
  })
);

router.put('/:id',
  authenticateToken,
  requirePermission('roles.edit'),
  // validateParams(commonSchemas.id),
  // validateBody(roleSchemas.update),
  auditLog('UPDATE_ROLE'),
  asyncHandler(async (req, res) => {
    const role = await roleService.update(req.params.id, req.body, req.user.user_id);
    return ApiResponse.updated(res, role, 'Role updated successfully');
  })
);

router.delete('/:id',
  authenticateToken,
  requirePermission('roles.delete'),
  // validateParams(commonSchemas.id),
  auditLog('DELETE_ROLE'),
  asyncHandler(async (req, res) => {
    await roleService.remove(req.params.id, req.user.user_id);
    return ApiResponse.deleted(res, 'Role deleted successfully');
  })
);

router.post('/:id/permissions',
  authenticateToken,
  requirePermission('roles.edit'),
  // validateParams(commonSchemas.id),
  // validateBody(roleSchemas.assignPermissions),
  auditLog('ASSIGN_PERMISSIONS'),
  asyncHandler(async (req, res) => {
    const role = await roleService.assignPermissions(req.params.id, req.body.permission_ids);
    return ApiResponse.updated(res, role, 'Permissions assigned successfully');
  })
);


module.exports = router;

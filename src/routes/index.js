const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { dashboardService } = require('../services');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/health', require('./health'));
router.use('/logs', require('./logs'));

router.use('/admin/users', require('./users'));
router.use('/admin/roles', require('./roles'));
router.use('/admin/permissions', require('./permissions'));
router.use('/admin/masters', require('./masters'));
router.use('/admin/work', require('./work'));
router.use('/admin/contractor', require('./contractor'));
router.use('/admin/logs', require('./logs'));

router.get('/admin/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats();
    return ApiResponse.success(res, stats, 'Dashboard stats retrieved');
  })
);

router.get('/admin/dashboard/activity',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const activity = await dashboardService.getRecentActivity(limit);
    return ApiResponse.success(res, activity, 'Recent activity retrieved');
  })
);

module.exports = router;

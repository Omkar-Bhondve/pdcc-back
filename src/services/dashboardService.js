const { query } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getStats = async () => {
  try {
    // Get user statistics
    const usersCount = await query('SELECT COUNT(*) as count FROM iwms_users WHERE deleted_at IS NULL');
    const activeUsersCount = await query('SELECT COUNT(*) as count FROM iwms_users WHERE is_active = true AND deleted_at IS NULL');
    const inactiveUsersCount = await query('SELECT COUNT(*) as count FROM iwms_users WHERE is_active = false AND deleted_at IS NULL');
    
    // Get role statistics
    const rolesCount = await query('SELECT COUNT(*) as count FROM iwms_roles WHERE deleted_at IS NULL');
    
    // Get recent user registrations (last 7 days)
    const recentUsersCount = await query(`
      SELECT COUNT(*) as count 
      FROM iwms_users 
      WHERE created_at >= NOW() - INTERVAL '7 days' 
      AND deleted_at IS NULL
    `);
    
    // Get permission statistics
    const permissionsCount = await query('SELECT COUNT(*) as count FROM iwms_permissions');
    
    // Get master data statistics
    const districtsCount = await query('SELECT COUNT(*) as count FROM iwms_districts WHERE deleted_at IS NULL');
    const departmentsCount = await query('SELECT COUNT(*) as count FROM iwms_departments WHERE deleted_at IS NULL');

    const stats = {
      users: {
        total: parseInt(usersCount.rows[0].count),
        active: parseInt(activeUsersCount.rows[0].count),
        inactive: parseInt(inactiveUsersCount.rows[0].count),
        recent: parseInt(recentUsersCount.rows[0].count)
      },
      roles: {
        total: parseInt(rolesCount.rows[0].count)
      },
      permissions: {
        total: parseInt(permissionsCount.rows[0].count)
      },
      masters: {
        districts: parseInt(districtsCount.rows[0].count),
        departments: parseInt(departmentsCount.rows[0].count)
      }
    };

    logger.info('Dashboard stats retrieved successfully');
    return stats;

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    throw ApiError.internal('Failed to fetch dashboard statistics');
  }
};

const getRecentActivity = async (limit = 10) => {
  try {
    // Get recent user registrations
    const recentUsers = await query(`
      SELECT user_id, email, full_name, created_at
      FROM iwms_users 
      WHERE deleted_at IS NULL 
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit]);

    // Get recent role changes
    const recentRoles = await query(`
      SELECT r.role_name, r.created_at, u.full_name as created_by
      FROM iwms_roles r
      LEFT JOIN iwms_users u ON r.created_by = u.user_id
      WHERE r.deleted_at IS NULL 
      ORDER BY r.created_at DESC 
      LIMIT $1
    `, [limit]);

    const activity = {
      recent_users: recentUsers.rows,
      recent_roles: recentRoles.rows
    };

    logger.info('Recent activity retrieved successfully');
    return activity;

  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    throw ApiError.internal('Failed to fetch recent activity');
  }
};

module.exports = {
  getStats,
  getRecentActivity
};

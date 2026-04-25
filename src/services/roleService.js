const BaseService = require('./BaseService');
const { query, getClient } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { formatDateForDisplay } = require('../utils/dateUtils');
const { getPaginationParams, getSortParams, buildPaginationResponse } = require('../utils/pagination');

class RoleService extends BaseService {
  constructor() {
    super('roles', ['role_name', 'created_at', 'updated_at', 'is_active']);
  }

  // Override getAll for roles with joins
  async getAll(params = {}) {
    const { page, limit, offset } = getPaginationParams(params);
    const { sort: sortBy, order: sortOrder } = getSortParams(params, this.allowedSortFields);
    
    // Build WHERE clause
    let whereClause = 'WHERE r.deleted_at IS NULL';
    const queryParamsArray = [];
    let paramIndex = 1;

    if (params.search) {
      whereClause += ` AND (r.role_name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      queryParamsArray.push(`%${params.search}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM iwms_roles r
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParamsArray);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data with joins
    const dataQuery = `
      SELECT r.role_id, r.role_name, r.description, r.is_system_role, r.is_active, r.created_at, r.updated_at,
             COUNT(DISTINCT rp.permission_id) as permission_count,
             COUNT(DISTINCT u.user_id) as user_count
      FROM iwms_roles r
      LEFT JOIN iwms_role_permissions rp ON rp.role_id = r.role_id
      LEFT JOIN iwms_users u ON u.role_id = r.role_id AND u.deleted_at IS NULL
      ${whereClause}
      GROUP BY r.role_id
      ORDER BY r.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await query(dataQuery, [...queryParamsArray, limit, offset]);

    // Format dates
    const data = result.rows.map(row => ({
      ...row,
      created_at: formatDateForDisplay(row.created_at),
      updated_at: formatDateForDisplay(row.updated_at)
    }));

    return buildPaginationResponse(data, total, page, limit);
  }

  // Override getById for roles with permissions
  async getById(roleId) {
    const roleResult = await query(
      `SELECT r.role_id, r.role_name, r.description, r.is_system_role, r.is_active, r.created_at, r.updated_at
       FROM iwms_roles r
       WHERE r.role_id = $1 AND r.deleted_at IS NULL`,
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      throw ApiError.notFound('Role not found');
    }

    const role = roleResult.rows[0];

    const permResult = await query(
      `SELECT p.permission_id, p.permission_code, p.permission_name, p.module, p.description
       FROM iwms_role_permissions rp
       JOIN iwms_permissions p ON p.permission_id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.module, p.permission_code`,
      [roleId]
    );

    role.permissions = permResult.rows;
    
    // Format dates
    role.created_at = formatDateForDisplay(role.created_at);
    role.updated_at = formatDateForDisplay(role.updated_at);
    
    return role;
  }

  // Override create for roles
  async create(data, createdBy = null) {
    const { role_name, description } = data;

    const existing = await query('SELECT role_id FROM iwms_roles WHERE role_name = $1 AND deleted_at IS NULL', [role_name]);
    if (existing.rows.length > 0) {
      throw ApiError.conflict('Role name already exists');
    }

    const result = await query(
      `INSERT INTO iwms_roles (role_name, description, is_system_role, is_active, created_at, created_by)
       VALUES ($1, $2, false, true, NOW(), $3)
       RETURNING *`,
      [role_name, description || null, createdBy]
    );

    logger.info(`Role created: ${role_name}`);
    return {
      ...result.rows[0],
      created_at: formatDateForDisplay(result.rows[0].created_at)
    };
  }

  // Override update for roles
  async update(roleId, data, updatedBy = null) {
    const existing = await query('SELECT * FROM iwms_roles WHERE role_id = $1 AND deleted_at IS NULL', [roleId]);
    if (existing.rows.length === 0) {
      throw ApiError.notFound('Role not found');
    }

    const allowedFields = ['role_name', 'description', 'is_active'];
    const setClauses = ['updated_at = NOW()', 'updated_by = $1'];
    const values = [updatedBy];
    let paramIndex = 2;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    values.push(roleId);

    const result = await query(
      `UPDATE iwms_roles SET ${setClauses.join(', ')} WHERE role_id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    logger.info(`Role updated: ${result.rows[0].role_name}`);
    return {
      ...result.rows[0],
      updated_at: formatDateForDisplay(result.rows[0].updated_at)
    };
  }

  // Override remove for roles
  async remove(roleId, deletedBy = null) {
    const existing = await query('SELECT * FROM iwms_roles WHERE role_id = $1 AND deleted_at IS NULL', [roleId]);
    if (existing.rows.length === 0) {
      throw ApiError.notFound('Role not found');
    }

    if (existing.rows[0].is_system_role) {
      throw ApiError.forbidden('Cannot delete system roles');
    }

    const usersWithRole = await query('SELECT COUNT(*) as cnt FROM iwms_users WHERE role_id = $1 AND deleted_at IS NULL', [roleId]);
    if (parseInt(usersWithRole.rows[0].cnt) > 0) {
      throw ApiError.conflict('Cannot delete role that has users assigned');
    }

    // Soft delete
    await query(
      'UPDATE iwms_roles SET deleted_at = NOW(), deleted_by = $1, is_active = false WHERE role_id = $2',
      [deletedBy, roleId]
    );

    logger.info(`Role soft deleted: ${existing.rows[0].role_name}`);
    return { message: 'Role deleted successfully' };
  }

  // Assign permissions to role
  async assignPermissions(roleId, permissionIds) {
    const existing = await query('SELECT role_id FROM iwms_roles WHERE role_id = $1', [roleId]);
    if (existing.rows.length === 0) {
      throw ApiError.notFound('Role not found');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM iwms_role_permissions WHERE role_id = $1', [roleId]);

      if (permissionIds && permissionIds.length > 0) {
        const insertValues = permissionIds.map((pid, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO iwms_role_permissions (role_id, permission_id) VALUES ${insertValues}`,
          [roleId, ...permissionIds]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    logger.info(`Permissions assigned to role ${roleId}: [${permissionIds.join(',')}]`);
    return {
      success: true,
      message: 'Permissions assigned successfully',
      roleId,
      permissionCount: permissionIds ? permissionIds.length : 0
    };
  }
}

// Create instance and export methods
const roleService = new RoleService();

module.exports = {
  getAll: roleService.getAll.bind(roleService),
  getById: roleService.getById.bind(roleService),
  create: roleService.create.bind(roleService),
  update: roleService.update.bind(roleService),
  remove: roleService.remove.bind(roleService),
  assignPermissions: roleService.assignPermissions.bind(roleService)
};

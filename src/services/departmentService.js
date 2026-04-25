const { query } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { formatDateForDisplay } = require('../utils/dateUtils');
const { buildPaginationResponse } = require('../utils/pagination');

const getAll = async (queryParams = {}) => {
  const { page, limit, search, is_active } = queryParams;
  
  // Convert string parameters to numbers
  const pageNum = page ? parseInt(page, 10) : undefined;
  const limitNum = limit ? parseInt(limit, 10) : undefined;
  
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let paramIndex = 1;

  if (is_active !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    values.push(is_active === 'true');
  }

  if (search) {
    conditions.push(`(department_name ILIKE $${paramIndex} OR department_code ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Check if pagination is requested (both page and limit provided)
  const isPaginated = pageNum !== undefined && limitNum !== undefined;

  if (isPaginated) {
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM iwms_departments ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (pageNum - 1) * limitNum;
    const dataQuery = `
      SELECT department_id, department_name, department_code, is_active, created_at, updated_at
      FROM iwms_departments
      ${whereClause}
      ORDER BY department_name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    values.push(limitNum, offset);

    const result = await query(dataQuery, values);

    // Convert UTC to IST for display
    const data = result.rows.map(row => ({
      ...row,
      created_at: formatDateForDisplay(row.created_at),
      updated_at: formatDateForDisplay(row.updated_at)
    }));

    return buildPaginationResponse(data, total, pageNum, limitNum);
  } else {
    // Get all data without pagination (for dropdowns)
    const result = await query(
      `SELECT department_id, department_name, department_code, is_active, created_at, updated_at
       FROM iwms_departments
       ${whereClause}
       ORDER BY department_name ASC`,
      values
    );

    // Convert UTC to IST for display
    return result.rows.map(row => ({
      ...row,
      created_at: formatDateForDisplay(row.created_at),
      updated_at: formatDateForDisplay(row.updated_at)
    }));
  }
};

const getById = async (departmentId) => {
  const result = await query(
    `SELECT department_id, department_name, department_code, is_active, created_at, updated_at
     FROM iwms_departments
     WHERE department_id = $1 AND deleted_at IS NULL`,
    [departmentId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('Department not found');
  }

  const department = result.rows[0];
  
  // Convert UTC to IST for display
  return {
    ...department,
    created_at: formatDateForDisplay(department.created_at),
    updated_at: formatDateForDisplay(department.updated_at)
  };
};

const create = async (data, createdBy = null) => {
  const { department_name, department_code } = data;

  const existing = await query(
    'SELECT department_id FROM iwms_departments WHERE department_name = $1 AND deleted_at IS NULL',
    [department_name]
  );
  if (existing.rows.length > 0) {
    throw ApiError.conflict('Department name already exists');
  }

  const result = await query(
    `INSERT INTO iwms_departments (department_name, department_code, is_active, created_at, created_by)
     VALUES ($1, $2, true, NOW(), $3)
     RETURNING department_id, department_name, department_code, is_active, created_at`,
    [department_name, department_code || null, createdBy]
  );

  logger.info(`Department created: ${department_name}`);
  return result.rows[0];
};

const update = async (departmentId, data, updatedBy = null) => {
  const existing = await query(
    'SELECT department_id FROM iwms_departments WHERE department_id = $1 AND deleted_at IS NULL',
    [departmentId]
  );
  if (existing.rows.length === 0) {
    throw ApiError.notFound('Department not found');
  }

  const allowedFields = ['department_name', 'department_code', 'is_active'];
  const setClauses = ['updated_at = NOW()', 'updated_by = $1'];
  const values = [updatedBy];
  let paramIndex = 2;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  values.push(departmentId);

  const result = await query(
    `UPDATE iwms_departments SET ${setClauses.join(', ')} WHERE department_id = $${paramIndex} AND deleted_at IS NULL
     RETURNING department_id, department_name, department_code, is_active, created_at, updated_at`,
    values
  );

  logger.info(`Department updated: ${result.rows[0].department_name}`);
  return result.rows[0];
};

const remove = async (departmentId, deletedBy = null) => {
  const existing = await query(
    'SELECT department_name FROM iwms_departments WHERE department_id = $1 AND deleted_at IS NULL',
    [departmentId]
  );
  if (existing.rows.length === 0) {
    throw ApiError.notFound('Department not found');
  }

  await query(
    'UPDATE iwms_departments SET deleted_at = NOW(), deleted_by = $1, is_active = false WHERE department_id = $2',
    [deletedBy, departmentId]
  );

  logger.info(`Department soft deleted: ${existing.rows[0].department_name}`);
  return { message: 'Department deleted successfully' };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};

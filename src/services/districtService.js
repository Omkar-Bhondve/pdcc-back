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
    conditions.push(`(district_name ILIKE $${paramIndex} OR district_code ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Check if pagination is requested (both page and limit provided)
  const isPaginated = pageNum !== undefined && limitNum !== undefined;

  if (isPaginated) {
    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM iwms_districts ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (pageNum - 1) * limitNum;
    const dataQuery = `
      SELECT district_id, district_name, district_code, is_active, created_at, updated_at
      FROM iwms_districts
      ${whereClause}
      ORDER BY district_name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    values.push(limitNum, offset);

    const queryResult = await query(dataQuery, values);

    // Convert UTC to IST for display
    const data = queryResult.rows.map(row => ({
      ...row,
      created_at: formatDateForDisplay(row.created_at),
      updated_at: formatDateForDisplay(row.updated_at)
    }));

    return buildPaginationResponse(data, total, pageNum, limitNum);
  } else {
    // Get all data without pagination (for dropdowns)
    const result = await query(
      `SELECT district_id, district_name, district_code, is_active, created_at, updated_at
       FROM iwms_districts
       ${whereClause}
       ORDER BY district_name ASC`,
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

const getById = async (districtId) => {
  const result = await query(
    `SELECT district_id, district_name, district_code, is_active, created_at, updated_at
     FROM iwms_districts
     WHERE district_id = $1 AND deleted_at IS NULL`,
    [districtId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('District not found');
  }

  const district = result.rows[0];
  
  // Convert UTC to IST for display
  return {
    ...district,
    created_at: formatDateForDisplay(district.created_at),
    updated_at: formatDateForDisplay(district.updated_at)
  };
};

const create = async (data, createdBy = null) => {
  const { district_name, district_code } = data;

  const existing = await query(
    'SELECT district_id FROM iwms_districts WHERE district_name = $1 AND deleted_at IS NULL',
    [district_name]
  );
  if (existing.rows.length > 0) {
    throw ApiError.conflict('District name already exists');
  }

  const result = await query(
    `INSERT INTO iwms_districts (district_name, district_code, is_active, created_at, created_by)
     VALUES ($1, $2, true, NOW(), $3)
     RETURNING district_id, district_name, district_code, is_active, created_at`,
    [district_name, district_code || null, createdBy]
  );

  logger.info(`District created: ${district_name}`);
  return result.rows[0];
};

const update = async (districtId, data, updatedBy = null) => {
  const existing = await query(
    'SELECT district_id FROM iwms_districts WHERE district_id = $1 AND deleted_at IS NULL',
    [districtId]
  );
  if (existing.rows.length === 0) {
    throw ApiError.notFound('District not found');
  }

  const allowedFields = ['district_name', 'district_code', 'is_active'];
  const setClauses = ['updated_at = NOW()', 'updated_by = $1'];
  const values = [updatedBy];
  let paramIndex = 2;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex++}`);
      values.push(data[field]);
    }
  }

  values.push(districtId);

  const result = await query(
    `UPDATE iwms_districts SET ${setClauses.join(', ')} WHERE district_id = $${paramIndex} AND deleted_at IS NULL
     RETURNING district_id, district_name, district_code, is_active, created_at, updated_at`,
    values
  );

  logger.info(`District updated: ${result.rows[0].district_name}`);
  return result.rows[0];
};

const remove = async (districtId, deletedBy = null) => {
  const existing = await query(
    'SELECT district_name FROM iwms_districts WHERE district_id = $1 AND deleted_at IS NULL',
    [districtId]
  );
  if (existing.rows.length === 0) {
    throw ApiError.notFound('District not found');
  }

  await query(
    'UPDATE iwms_districts SET deleted_at = NOW(), deleted_by = $1, is_active = false WHERE district_id = $2',
    [deletedBy, districtId]
  );

  logger.info(`District soft deleted: ${existing.rows[0].district_name}`);
  return { message: 'District deleted successfully' };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { getPaginationParams, getSortParams, buildPaginationResponse } = require('../utils/pagination');
const { formatDateForDisplay } = require('../utils/dateUtils');

class BaseService {
  constructor(tableName, allowedSortFields = ['created_at', 'updated_at']) {
    this.tableName = tableName;
    this.allowedSortFields = allowedSortFields;
  }

  // Generic paginated list with search and sort
  async getAll(params = {}, customSelect = null, customJoins = '', customWhere = '') {
    const { page, limit, offset } = getPaginationParams(params);
    const { sort: sortBy, order: sortOrder } = getSortParams(params, this.allowedSortFields);
    
    // Build WHERE clause
    let whereClause = customWhere || `WHERE ${this.tableName}.deleted_at IS NULL`;
    const queryParamsArray = [];
    let paramIndex = 1;

    if (params.search) {
      whereClause += ` AND (${this.tableName}.name ILIKE $${paramIndex} OR ${this.tableName}.description ILIKE $${paramIndex})`;
      queryParamsArray.push(`%${params.search}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${this.tableName}
      ${customJoins}
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParamsArray);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const selectFields = customSelect || `${this.tableName}.*`;
    const dataQuery = `
      SELECT ${selectFields}
      FROM ${this.tableName}
      ${customJoins}
      ${whereClause}
      ORDER BY ${this.tableName}.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await query(dataQuery, [...queryParamsArray, limit, offset]);

    // Format dates if needed
    const data = result.rows.map(row => ({
      ...row,
      created_at: row.created_at ? formatDateForDisplay(row.created_at) : null,
      updated_at: row.updated_at ? formatDateForDisplay(row.updated_at) : null
    }));

    return buildPaginationResponse(data, total, page, limit);
  }

  // Generic get by ID
  async getById(id, customSelect = null, customJoins = '') {
    const selectFields = customSelect || `${this.tableName}.*`;
    const result = await query(
      `SELECT ${selectFields}
       FROM ${this.tableName}
       ${customJoins}
       WHERE ${this.tableName}.id = $1 AND ${this.tableName}.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound(`${this.tableName} not found`);
    }

    const item = result.rows[0];
    
    // Format dates
    return {
      ...item,
      created_at: item.created_at ? formatDateForDisplay(item.created_at) : null,
      updated_at: item.updated_at ? formatDateForDisplay(item.updated_at) : null
    };
  }

  // Generic create
  async create(data, createdBy = null, customFields = {}) {
    const fields = { ...customFields, ...data, created_at: 'NOW()' };
    if (createdBy) fields.created_by = createdBy;

    const columns = Object.keys(fields);
    const values = Object.values(fields);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) 
       VALUES (${placeholders}) 
       RETURNING *`,
      values
    );

    return {
      ...result.rows[0],
      created_at: formatDateForDisplay(result.rows[0].created_at)
    };
  }

  // Generic update
  async update(id, data, updatedBy = null, customFields = {}) {
    const existing = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      throw ApiError.notFound(`${this.tableName} not found`);
    }

    const fields = { ...customFields, ...data, updated_at: 'NOW()' };
    if (updatedBy) fields.updated_by = updatedBy;

    const setClauses = Object.keys(fields).map((field, i) => `${field} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(fields)];

    const result = await query(
      `UPDATE ${this.tableName} 
       SET ${setClauses} 
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    return {
      ...result.rows[0],
      updated_at: formatDateForDisplay(result.rows[0].updated_at)
    };
  }

  // Generic soft delete
  async remove(id, deletedBy = null) {
    const existing = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      throw ApiError.notFound(`${this.tableName} not found`);
    }

    await query(
      `UPDATE ${this.tableName} 
       SET deleted_at = NOW(), deleted_by = $2, is_active = false 
       WHERE id = $1`,
      [id, deletedBy]
    );

    return { message: `${this.tableName} deleted successfully` };
  }

  // Generic restore
  async restore(id) {
    const existing = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );

    if (existing.rows.length === 0) {
      throw ApiError.notFound(`${this.tableName} not found or not deleted`);
    }

    const result = await query(
      `UPDATE ${this.tableName} 
       SET deleted_at = NULL, is_active = true 
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return {
      ...result.rows[0],
      updated_at: formatDateForDisplay(result.rows[0].updated_at)
    };
  }
}

module.exports = BaseService;

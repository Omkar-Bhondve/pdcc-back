const { query } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getPaginationParams, getSortParams, buildPaginationResponse } = require('../utils/pagination');

const ALLOWED_SORT_FIELDS = ['work_id', 'work_name', 'status', 'created_at', 'updated_at'];

const getAll = async (queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams);
  const { sort, order } = getSortParams(queryParams, ALLOWED_SORT_FIELDS);

  const conditions = ['w.status != \'deleted\''];
  const values = [];
  let paramIndex = 1;

  if (queryParams.status && queryParams.status !== 'all') {
    conditions.push(`w.status = $${paramIndex++}`);
    values.push(queryParams.status);
  }

  if (queryParams.search) {
    conditions.push(`w.work_name ILIKE $${paramIndex}`);
    values.push(`%${queryParams.search}%`);
    paramIndex++;
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM iwms_work w ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  // Get paginated data
  const dataResult = await query(
    `SELECT w.*, 
            uc.full_name as created_by_name,
            uu.full_name as updated_by_name
     FROM iwms_work w
     LEFT JOIN iwms_users uc ON w.created_by = uc.user_id
     LEFT JOIN iwms_users uu ON w.updated_by = uu.user_id
     ${whereClause}
     ORDER BY w.${sort} ${order}
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...values, limit, offset]
  );

  return buildPaginationResponse(dataResult.rows, total, page, limit);
};

const getById = async (workId) => {
  const result = await query(`
    SELECT w.*, 
           uc.full_name as created_by_name,
           uu.full_name as updated_by_name
    FROM iwms_work w
    LEFT JOIN iwms_users uc ON w.created_by = uc.user_id
    LEFT JOIN iwms_users uu ON w.updated_by = uu.user_id
    WHERE w.work_id = $1 AND w.status != 'deleted'
  `, [workId]);

  if (result.rows.length === 0) {
    throw ApiError.notFound('Work not found');
  }
  return result.rows[0];
};

const create = async (workData, userId) => {
  const { work_name } = workData;

  // Check if work name already exists
  const existing = await query('SELECT work_id FROM iwms_work WHERE work_name = $1 AND status != \'deleted\'', [work_name]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('Work with this name already exists');
  }

  const result = await query(`
    INSERT INTO iwms_work (work_name, created_by, updated_by)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [work_name, userId, userId]);

  logger.info(`Work created: ${result.rows[0].work_id} by user ${userId}`);
  return result.rows[0];
};

const update = async (workId, workData, userId) => {
  const { work_name, status } = workData;

  // Check if work exists
  const existing = await query('SELECT work_id FROM iwms_work WHERE work_id = $1 AND status != \'deleted\'', [workId]);
  if (existing.rows.length === 0) {
    throw ApiError.notFound('Work not found');
  }

  // Check if work name already exists (excluding current record)
  if (work_name) {
    const nameCheck = await query('SELECT work_id FROM iwms_work WHERE work_name = $1 AND work_id != $2 AND status != \'deleted\'', [work_name, workId]);
    if (nameCheck.rows.length > 0) {
      throw ApiError.conflict('Work with this name already exists');
    }
  }

  const result = await query(`
    UPDATE iwms_work 
    SET work_name = COALESCE($1, work_name),
        status = COALESCE($2, status),
        updated_by = $3
    WHERE work_id = $4
    RETURNING *
  `, [work_name, status, userId, workId]);

  logger.info(`Work updated: ${workId} by user ${userId}`);
  return result.rows[0];
};

const softDelete = async (workId, userId) => {
  // Check if work exists
  const existing = await query('SELECT work_id FROM iwms_work WHERE work_id = $1 AND status != \'deleted\'', [workId]);
  if (existing.rows.length === 0) {
    throw ApiError.notFound('Work not found');
  }

  const result = await query(`
    UPDATE iwms_work 
    SET status = 'deleted',
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $1,
        updated_by = $1
    WHERE work_id = $2
    RETURNING *
  `, [userId, workId]);

  logger.info(`Work deleted: ${workId} by user ${userId}`);
  return result.rows[0];
};

const getStats = async () => {
  const result = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive
    FROM iwms_work 
    WHERE status != 'deleted'
  `);

  return result.rows[0];
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete,
  getStats
};

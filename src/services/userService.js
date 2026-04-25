const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { getBcryptRounds } = require('../config/security');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getPaginationParams, getSortParams, buildPaginationResponse } = require('../utils/pagination');
const { formatDateForDisplay } = require('../utils/dateUtils');

const ALLOWED_SORT_FIELDS = ['user_id', 'email', 'full_name', 'created_at', 'is_active'];

const getAll = async (queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams);
  const { sort, order } = getSortParams(queryParams, ALLOWED_SORT_FIELDS);

  const conditions = ['u.deleted_at IS NULL'];
  const values = [];
  let paramIndex = 1;

  if (queryParams.role_id) {
    conditions.push(`u.role_id = $${paramIndex++}`);
    values.push(queryParams.role_id);
  }

  if (queryParams.is_active !== undefined) {
    conditions.push(`u.is_active = $${paramIndex++}`);
    values.push(queryParams.is_active === 'true');
  }

  if (queryParams.search) {
    conditions.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
    values.push(`%${queryParams.search}%`);
    paramIndex++;
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) as total FROM iwms_users u ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].total);

  const dataResult = await query(
    `SELECT u.user_id, u.email, u.full_name, u.role_id, u.is_active,
            u.email_verified, u.last_login_at, u.created_at, u.updated_at,
            r.role_name
     FROM iwms_users u
     JOIN iwms_roles r ON r.role_id = u.role_id
     ${whereClause}
     ORDER BY u.${sort} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  // Convert UTC to IST for display
  const formattedRows = dataResult.rows.map(row => ({
    ...row,
    created_at: formatDateForDisplay(row.created_at),
    updated_at: formatDateForDisplay(row.updated_at),
    last_login_at: formatDateForDisplay(row.last_login_at)
  }));

  return buildPaginationResponse(formattedRows, total, page, limit);
};

const getById = async (userId) => {
  const result = await query(
    `SELECT u.user_id, u.email, u.full_name, u.role_id, u.is_active,
            u.email_verified, u.last_login_at, u.created_at, u.updated_at,
            r.role_name
     FROM iwms_users u
     JOIN iwms_roles r ON r.role_id = u.role_id
     WHERE u.user_id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw ApiError.notFound('User not found');
  }

  const user = result.rows[0];
  
  // Convert UTC to IST for display
  return {
    ...user,
    created_at: formatDateForDisplay(user.created_at),
    updated_at: formatDateForDisplay(user.updated_at),
    last_login_at: formatDateForDisplay(user.last_login_at)
  };
};

const create = async (userData, createdBy = null) => {
  const { email, password, full_name, role_id } = userData;

  // Check for existing active user
  const existingActive = await query('SELECT user_id, full_name FROM iwms_users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (existingActive.rows.length > 0) {
    throw ApiError.conflict(`User with email "${email}" already exists (active user: ${existingActive.rows[0].full_name})`);
  }

  // Check for previously deleted user
  const existingDeleted = await query('SELECT user_id, full_name, deleted_at FROM iwms_users WHERE email = $1 AND deleted_at IS NOT NULL', [email]);
  if (existingDeleted.rows.length > 0) {
    const deletedUser = existingDeleted.rows[0];
    const deletedDate = formatDateForDisplay(deletedUser.deleted_at);
    throw ApiError.conflict(`Email "${email}" was previously used by user "${deletedUser.full_name}" and deleted on ${deletedDate}. Please use a different email or contact administrator to restore the deleted account.`);
  }

  const passwordHash = await bcrypt.hash(password, getBcryptRounds());

  const result = await query(
    `INSERT INTO iwms_users (email, password_hash, full_name, role_id, is_active, email_verified, created_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
     RETURNING user_id, email, full_name, role_id, is_active, email_verified, created_at, updated_at`,
    [email, passwordHash, full_name, role_id, true, false, createdBy]
  );

  const user = result.rows[0];
  const roleResult = await query('SELECT role_name FROM iwms_roles WHERE role_id = $1', [user.role_id]);
  user.role_name = roleResult.rows[0]?.role_name;

  logger.info(`User created: ${email}`);
  return user;
};

const update = async (userId, updateData, updatedBy = null) => {
  const existing = await query('SELECT user_id, email FROM iwms_users WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
  if (existing.rows.length === 0) {
    throw ApiError.notFound('User not found');
  }

  const currentUser = existing.rows[0];

  // Check for email update conflicts
  if (updateData.email && updateData.email !== currentUser.email) {
    // Check for existing active user with new email
    const existingActive = await query('SELECT user_id, full_name FROM iwms_users WHERE email = $1 AND deleted_at IS NULL AND user_id != $2', [updateData.email, userId]);
    if (existingActive.rows.length > 0) {
      throw ApiError.conflict(`User with email "${updateData.email}" already exists (active user: ${existingActive.rows[0].full_name})`);
    }

    // Check for previously deleted user with new email
    const existingDeleted = await query('SELECT user_id, full_name, deleted_at FROM iwms_users WHERE email = $1 AND deleted_at IS NOT NULL', [updateData.email]);
    if (existingDeleted.rows.length > 0) {
      const deletedUser = existingDeleted.rows[0];
      const deletedDate = formatDateForDisplay(deletedUser.deleted_at);
      throw ApiError.conflict(`Email "${updateData.email}" was previously used by user "${deletedUser.full_name}" and deleted on ${deletedDate}. Please use a different email or contact administrator to restore the deleted account.`);
    }
  }

  const allowedFields = ['full_name', 'role_id', 'is_active', 'email_verified', 'email'];
  const setClauses = ['updated_at = NOW()', `updated_by = $1`];
  const values = [updatedBy];
  let paramIndex = 2;

  // Handle password update separately
  let passwordUpdateClause = '';
  if (updateData.password && updateData.password.trim()) {
    const passwordHash = await bcrypt.hash(updateData.password, getBcryptRounds());
    passwordUpdateClause = `, password_hash = $${paramIndex++}`;
    values.push(passwordHash);
  }

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      setClauses.push(`${field} = $${paramIndex++}`);
      values.push(updateData[field]);
    }
  }

  values.push(userId);

  const result = await query(
    `UPDATE iwms_users SET ${setClauses.join(',')}${passwordUpdateClause} WHERE user_id = $${paramIndex} AND deleted_at IS NULL
     RETURNING user_id, email, full_name, role_id, is_active, email_verified, created_at, updated_at`,
    values
  );

  const user = result.rows[0];
  const roleResult = await query('SELECT role_name FROM iwms_roles WHERE role_id = $1', [user.role_id]);
  user.role_name = roleResult.rows[0]?.role_name;

  logger.info(`User updated: ${user.email}`);
  return user;
};

const remove = async (userId, deletedBy = null) => {
  const existing = await query('SELECT email FROM iwms_users WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
  if (existing.rows.length === 0) {
    throw ApiError.notFound('User not found');
  }

  // Soft delete - set deleted_at and deleted_by
  await query(
    'UPDATE iwms_users SET deleted_at = NOW(), deleted_by = $1, is_active = false WHERE user_id = $2',
    [deletedBy, userId]
  );

  logger.info(`User soft deleted: ${existing.rows[0].email}`);
  return { message: 'User deleted successfully' };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};

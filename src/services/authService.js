const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, getBcryptRounds } = require('../config/security');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getUserPermissions = async (roleId) => {
  const permissionsResult = await query(`
    SELECT p.permission_code
    FROM iwms_permissions p
    JOIN iwms_role_permissions rp ON p.permission_id = rp.permission_id
    WHERE rp.role_id = $1
  `, [roleId]);

  return permissionsResult.rows.map(r => r.permission_code);
};

const sanitizeUser = (row) => {
  const user = { ...row };
  delete user.password_hash;
  delete user.password_reset_token;
  delete user.password_reset_token_expires_at;
  delete user.deleted_at;
  delete user.deleted_by;
  return user;
};

const buildTokens = async (user) => {
  const permissions = await getUserPermissions(user.role_id);
  const tokenPayload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role_name,
    role_id: user.role_id,
    permissions
  };

  const access_token = generateAccessToken(tokenPayload);
  const refresh_token = generateRefreshToken({ user_id: user.user_id, role_id: user.role_id });

  return {
    access_token,
    refresh_token
  };
};

const register = async (userData) => {
  const { email, password, full_name, role_id } = userData;

  const existing = await query('SELECT user_id FROM iwms_users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, getBcryptRounds());

  const defaultRoleId = role_id || (await query("SELECT role_id FROM iwms_roles WHERE role_name = 'USER' LIMIT 1")).rows[0]?.role_id;
  if (!defaultRoleId) throw ApiError.internal('Default role not found');

  const result = await query(
    `INSERT INTO iwms_users (email, password_hash, full_name, role_id, is_active, email_verified, created_at)
     VALUES ($1, $2, $3, $4, true, false, NOW())
     RETURNING *`,
    [email, passwordHash, full_name, defaultRoleId]
  );

  const user = result.rows[0];

  const roleResult = await query('SELECT role_name FROM iwms_roles WHERE role_id = $1', [user.role_id]);
  user.role_name = roleResult.rows[0]?.role_name || 'USER';

  const tokens = await buildTokens(user);

  logger.info(`User registered: ${email}`);

  return {
    user: sanitizeUser(user),
    tokens
  };
};

const login = async (email, password) => {
  // First check in users table
  const userResult = await query(
    'SELECT user_id, email, password_hash, full_name, role_id, is_active, email_verified FROM iwms_users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );

  let user = userResult.rows[0];

  // If not found in users table, check contractors table
  if (!user) {
    const contractorResult = await query(
      `SELECT contractor_id as user_id, email, password_hash, 
              COALESCE(majur_society_name, sube_first_name || ' ' || sube_last_name, sube_first_name, 'Contractor') as full_name,
              role_id, status as is_active, email_sent as email_verified 
       FROM iwms_contractor 
       WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    user = contractorResult.rows[0];
    
    if (user) {
      // Ensure contractor has a role, default to CONTRACTOR role if not set
      if (!user.role_id) {
        const contractorRoleResult = await query('SELECT role_id FROM iwms_roles WHERE role_name = $1', ['CONTRACTOR']);
        if (contractorRoleResult.rows[0]) {
          user.role_id = contractorRoleResult.rows[0].role_id;
        }
      }
    }
  }

  // If still not found, throw error
  if (!user) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  if (!user.is_active) {
    throw ApiError.forbidden('Account is inactive');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  // Update last login based on table type
  if (userResult.rows[0]) {
    await query('UPDATE iwms_users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1', [user.user_id]);
  } else {
    await query('UPDATE iwms_contractor SET updated_at = NOW() WHERE contractor_id = $1', [user.user_id]);
  }

  const roleResult = await query('SELECT role_name FROM iwms_roles WHERE role_id = $1', [user.role_id]);
  user.role_name = roleResult.rows[0]?.role_name || 'USER';

  const tokens = await buildTokens(user);
  const permissions = await getUserPermissions(user.role_id);

  logger.info(`User logged in: ${email}`);

  return {
    user: { ...sanitizeUser(user), permissions },
    tokens
  };
};

const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token is required');
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  // First check in users table
  const userResult = await query(
    `SELECT u.*, r.role_name
     FROM iwms_users u
     JOIN iwms_roles r ON r.role_id = u.role_id
     WHERE u.user_id = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
    [payload.user_id]
  );

  let user = userResult.rows[0];

  // If not found in users, check contractors
  if (!user) {
    const contractorResult = await query(
      `SELECT c.contractor_id as user_id, c.email, c.password_hash, 
              COALESCE(c.majur_society_name, c.sube_first_name || ' ' || c.sube_last_name, c.sube_first_name, 'Contractor') as full_name, 
              c.role_id, c.status as is_active, 
              c.email_sent as email_verified, r.role_name
       FROM iwms_contractor c
       JOIN iwms_roles r ON r.role_id = c.role_id
       WHERE c.contractor_id = $1 AND c.status = 'active' AND c.deleted_at IS NULL`,
      [payload.user_id]
    );

    user = contractorResult.rows[0];
  }

  if (!user) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  const tokens = await buildTokens(user);
  const permissions = await getUserPermissions(user.role_id);

  return {
    user: { ...sanitizeUser(user), permissions },
    tokens
  };
};

const logout = async () => {
  // JWT is stateless - client should clear tokens
  return { message: 'Logged out successfully' };
};


const forgotPassword = async (email) => {
  const result = await query('SELECT user_id FROM iwms_users WHERE email = $1', [email]);

  if (result.rows.length === 0) {
    return { message: 'If email exists, reset link has been sent' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = await bcrypt.hash(resetToken, 10);

  await query(
    `UPDATE iwms_users SET password_reset_token = $1, password_reset_token_expires_at = $2, updated_at = NOW()
     WHERE email = $3`,
    [resetTokenHash, new Date(Date.now() + 3600000), email]
  );

  logger.info(`Password reset requested for: ${email}`);

  return {
    message: 'If email exists, reset link has been sent',
    resetToken
  };
};

const resetPassword = async (token, newPassword) => {
  const users = await query(
    'SELECT * FROM iwms_users WHERE password_reset_token IS NOT NULL AND password_reset_token_expires_at > NOW()'
  );

  let matchedUser = null;
  for (const u of users.rows) {
    const valid = await bcrypt.compare(token, u.password_reset_token);
    if (valid) {
      matchedUser = u;
      break;
    }
  }

  if (!matchedUser) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, getBcryptRounds());

  await query(
    `UPDATE iwms_users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires_at = NULL, updated_at = NOW()
     WHERE user_id = $2`,
    [newPasswordHash, matchedUser.user_id]
  );

  logger.info(`Password reset successful for user: ${matchedUser.email}`);
  return { message: 'Password reset successful' };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await query('SELECT * FROM iwms_users WHERE user_id = $1', [userId]);
  const user = result.rows[0];

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, getBcryptRounds());
  await query('UPDATE iwms_users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [newPasswordHash, userId]);

  logger.info(`Password changed for user: ${user.email}`);
  return { message: 'Password changed successfully' };
};

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getUserPermissions,
  sanitizeUser
};

const { query } = require('../config/db');
const { ApiError } = require('../middleware/errorHandler');
const { getAllPermissions } = require('../constants/permissionRegistry');
const logger = require('../utils/logger');

const getAll = async (module) => {
  let sql = 'SELECT * FROM iwms_permissions ORDER BY module, permission_code';
  const params = [];

  if (module) {
    sql = 'SELECT * FROM iwms_permissions WHERE module = $1 ORDER BY permission_code';
    params.push(module);
  }

  const result = await query(sql, params);
  return result.rows;
};

const getById = async (permissionId) => {
  const result = await query('SELECT * FROM iwms_permissions WHERE permission_id = $1', [permissionId]);
  if (result.rows.length === 0) {
    throw ApiError.notFound('Permission not found');
  }
  return result.rows[0];
};

const syncFromRegistry = async () => {
  const existingPerms = await query('SELECT permission_code FROM iwms_permissions');
  const existingCodes = new Set(existingPerms.rows.map(r => r.permission_code));
  
  const registryPermissions = getAllPermissions();

  let inserted = 0;
  let updated = 0;

  for (const perm of registryPermissions) {
    if (existingCodes.has(perm.permission_code)) {
      // Update existing permission
      await query(
        'UPDATE iwms_permissions SET permission_name = $1, module = $2, description = $3 WHERE permission_code = $4',
        [perm.permission_name, perm.module, perm.description, perm.permission_code]
      );
      updated++;
    } else {
      // Insert new permission
      await query(
        'INSERT INTO iwms_permissions (permission_code, permission_name, module, description) VALUES ($1, $2, $3, $4)',
        [perm.permission_code, perm.permission_name, perm.module, perm.description]
      );
      inserted++;
    }
  }

  logger.info(`Permissions synced: ${inserted} inserted, ${updated} updated, total: ${registryPermissions.length}`);
  return { inserted, updated, total: registryPermissions.length };
};

const getMyPermissions = async (userId) => {
  const result = await query(
    `SELECT DISTINCT p.permission_code
     FROM iwms_users u
     JOIN iwms_role_permissions rp ON rp.role_id = u.role_id
     JOIN iwms_permissions p ON p.permission_id = rp.permission_id
     WHERE u.user_id = $1`,
    [userId]
  );

  return result.rows.map(r => r.permission_code);
};

module.exports = {
  getAll,
  getById,
  syncFromRegistry,
  getMyPermissions
};

const { getAllPermissions, hasPermission } = require('./permissionRegistry');
const { HTTP_STATUS } = require('./httpStatus');
const { roleSchemas, userSchemas, districtSchemas, departmentSchemas } = require('./validationSchemas');
const { ROLE_NAMES, ROLE_DISPLAY_NAMES, ROLE_HIERARCHY, getRoleDisplayName, getRoleLevel, isValidRole } = require('./roles');
const { STATUSES, STATUS_DISPLAY_NAMES, getStatusDisplayName, getStatusColor, isValidStatus } = require('./statuses');

module.exports = {
  getAllPermissions,
  hasPermission,
  HTTP_STATUS,
  roleSchemas,
  userSchemas,
  districtSchemas,
  departmentSchemas,
  // Role constants
  ROLE_NAMES,
  ROLE_DISPLAY_NAMES,
  ROLE_HIERARCHY,
  getRoleDisplayName,
  getRoleLevel,
  isValidRole,
  // Status constants
  STATUSES,
  STATUS_DISPLAY_NAMES,
  getStatusDisplayName,
  getStatusColor,
  isValidStatus
};

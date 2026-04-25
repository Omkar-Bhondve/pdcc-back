// Role constants for consistent role management
// Use these throughout the application for role validation and display

// Standard role names (as stored in database)
const ROLE_NAMES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN', 
  MANAGER: 'MANAGER',
  USER: 'USER'
};

// Role display names (for UI)
const ROLE_DISPLAY_NAMES = {
  [ROLE_NAMES.SUPER_ADMIN]: 'Super Admin',
  [ROLE_NAMES.ADMIN]: 'Administrator',
  [ROLE_NAMES.MANAGER]: 'Manager',
  [ROLE_NAMES.USER]: 'User'
};

// Role hierarchy (higher number = higher privilege)
const ROLE_HIERARCHY = {
  [ROLE_NAMES.SUPER_ADMIN]: 4,
  [ROLE_NAMES.ADMIN]: 3,
  [ROLE_NAMES.MANAGER]: 2,
  [ROLE_NAMES.USER]: 1
};

// Role descriptions
const ROLE_DESCRIPTIONS = {
  [ROLE_NAMES.SUPER_ADMIN]: 'Full system access with all permissions',
  [ROLE_NAMES.ADMIN]: 'Administrative access to most system features',
  [ROLE_NAMES.MANAGER]: 'Management access to assigned modules and teams',
  [ROLE_NAMES.USER]: 'Basic access to permitted features'
};

// Role colors for UI (optional)
const ROLE_COLORS = {
  [ROLE_NAMES.SUPER_ADMIN]: '#dc2626', // red
  [ROLE_NAMES.ADMIN]: '#f59e0b',     // amber
  [ROLE_NAMES.MANAGER]: '#10b981',   // emerald
  [ROLE_NAMES.USER]: '#3b82f6'      // blue
};

// Helper functions
const getRoleDisplayName = (roleName) => {
  return ROLE_DISPLAY_NAMES[roleName] || roleName;
};

const getRoleLevel = (roleName) => {
  return ROLE_HIERARCHY[roleName] || 0;
};

const getRoleDescription = (roleName) => {
  return ROLE_DESCRIPTIONS[roleName] || 'No description available';
};

const getRoleColor = (roleName) => {
  return ROLE_COLORS[roleName] || '#6b7280'; // gray default
};

const isValidRole = (roleName) => {
  return Object.values(ROLE_NAMES).includes(roleName);
};

const getRoleOptions = () => {
  return Object.values(ROLE_NAMES).map(role => ({
    value: role,
    label: ROLE_DISPLAY_NAMES[role],
    description: ROLE_DESCRIPTIONS[role],
    level: ROLE_HIERARCHY[role],
    color: ROLE_COLORS[role]
  }));
};

const canManageRole = (userRole, targetRole) => {
  const userLevel = getRoleLevel(userRole);
  const targetLevel = getRoleLevel(targetRole);
  return userLevel > targetLevel;
};

module.exports = {
  ROLE_NAMES,
  ROLE_DISPLAY_NAMES,
  ROLE_HIERARCHY,
  ROLE_DESCRIPTIONS,
  ROLE_COLORS,
  getRoleDisplayName,
  getRoleLevel,
  getRoleDescription,
  getRoleColor,
  isValidRole,
  getRoleOptions,
  canManageRole
};

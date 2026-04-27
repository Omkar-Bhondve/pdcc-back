// Permission Registry - All permissions used in routes
// This automatically syncs to database on server start

const PERMISSION_REGISTRY = {
  // Users module
  'users.view': {
    permission_name: 'View users',
    module: 'users',
    description: 'Permission to view user list and details'
  },
  'users.create': {
    permission_name: 'Create users',
    module: 'users',
    description: 'Permission to create new users'
  },
  'users.edit': {
    permission_name: 'Edit users',
    module: 'users',
    description: 'Permission to edit user information'
  },
  'users.delete': {
    permission_name: 'Delete users',
    module: 'users',
    description: 'Permission to delete users'
  },
  // Roles module
  'roles.view': {
    permission_name: 'View roles',
    module: 'roles',
    description: 'Permission to view roles and permissions'
  },
  'roles.create': {
    permission_name: 'Create roles',
    module: 'roles',
    description: 'Permission to create new roles'
  },
  'roles.edit': {
    permission_name: 'Edit roles',
    module: 'roles',
    description: 'Permission to edit existing roles'
  },
  'roles.delete': {
    permission_name: 'Delete roles',
    module: 'roles',
    description: 'Permission to delete roles'
  },
  
  // Masters module
  'masters.districts.view': {
    permission_name: 'View districts',
    module: 'masters',
    description: 'Permission to view districts'
  },
  'masters.districts.create': {
    permission_name: 'Create districts',
    module: 'masters',
    description: 'Permission to create new districts'
  },
  'masters.districts.edit': {
    permission_name: 'Edit districts',
    module: 'masters',
    description: 'Permission to edit district information'
  },
  'masters.districts.delete': {
    permission_name: 'Delete districts',
    module: 'masters',
    description: 'Permission to delete districts'
  },
  'masters.departments.view': {
    permission_name: 'View departments',
    module: 'masters',
    description: 'Permission to view departments'
  },
  'masters.departments.create': {
    permission_name: 'Create departments',
    module: 'masters',
    description: 'Permission to create new departments'
  },
  'masters.departments.edit': {
    permission_name: 'Edit departments',
    module: 'masters',
    description: 'Permission to edit department information'
  },
  'masters.departments.delete': {
    permission_name: 'Delete departments',
    module: 'masters',
    description: 'Permission to delete departments'
  },
  
  // Dashboard module
  'dashboard.view': {
    permission_name: 'View dashboard',
    module: 'dashboard',
    description: 'Permission to view admin dashboard'
  },
  
  // Work module
  'work.view': {
    permission_name: 'View work',
    module: 'work',
    description: 'Permission to view work list and details'
  },
  'work.create': {
    permission_name: 'Create work',
    module: 'work',
    description: 'Permission to create new work'
  },
  'work.edit': {
    permission_name: 'Edit work',
    module: 'work',
    description: 'Permission to edit work information'
  },
  'work.delete': {
    permission_name: 'Delete work',
    module: 'work',
    description: 'Permission to delete work'
  },
  
  // Contractor module
  'contractor.view': {
    permission_name: 'View contractors',
    module: 'contractor',
    description: 'Permission to view contractor list and details'
  },
  'contractor.create': {
    permission_name: 'Create contractors',
    module: 'contractor',
    description: 'Permission to create new contractors'
  },
  'contractor.edit': {
    permission_name: 'Edit contractors',
    module: 'contractor',
    description: 'Permission to edit contractor information'
  },
  'contractor.delete': {
    permission_name: 'Delete contractors',
    module: 'contractor',
    description: 'Permission to delete contractors'
  },
  'contractor.send_email': {
    permission_name: 'Send email to contractors',
    module: 'contractor',
    description: 'Permission to send emails to contractors'
  }
};

// Get all permissions as array for database sync
const getAllPermissions = () => {
  return Object.entries(PERMISSION_REGISTRY).map(([code, details]) => ({
    permission_code: code,
    permission_name: details.permission_name,
    module: details.module,
    description: details.description
  }));
};

// Check if permission exists in registry
const hasPermission = (permissionCode) => {
  return PERMISSION_REGISTRY.hasOwnProperty(permissionCode);
};

// Get permissions by module
const getPermissionsByModule = (module) => {
  return Object.entries(PERMISSION_REGISTRY)
    .filter(([code, details]) => details.module === module)
    .map(([code, details]) => ({
      permission_code: code,
      ...details
    }));
};

module.exports = {
  PERMISSION_REGISTRY,
  getAllPermissions,
  hasPermission,
  getPermissionsByModule
};

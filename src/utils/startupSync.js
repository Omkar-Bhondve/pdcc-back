const { query } = require('../config/db');
const { syncFromRegistry } = require('../services/permissionService');
const logger = require('./logger');

const syncPermissionsOnStartup = async () => {
  try {
    logger.info('Syncing permissions from registry...');
    const result = await syncFromRegistry();
    logger.info(`Permissions synced successfully: ${JSON.stringify(result)}`);
    
    // Only sync permissions to database table, don't assign to roles
    // Role permissions should be managed manually via UI
    
  } catch (error) {
    logger.error('Failed to sync permissions on startup:', error);
    // Don't throw error, allow server to start anyway
  }
};


module.exports = {
  syncPermissionsOnStartup
};

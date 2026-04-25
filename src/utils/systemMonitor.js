const si = require('systeminformation');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Create separate logger for system monitoring
const systemLogger = require('winston').createLogger({
  level: 'info',
  format: require('winston').format.combine(
    require('winston').format.timestamp(),
    require('winston').format.json()
  ),
  transports: [
    new (require('winston').transports.File)({
      filename: path.join(__dirname, '../../logs/system/system.log'),
      maxsize: 10485760,
      maxFiles: 5
    })
  ]
});

const logDir = path.join(__dirname, '../../logs/system');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const getSystemHealth = async () => {
  try {
    const [cpu, mem, disk, osInfo, currentLoad, processes] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.osInfo(),
      si.currentLoad(),
      si.processes()
    ]);
    
    const health = {
      timestamp: new Date().toISOString(),
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        currentLoad: currentLoad.currentLoad.toFixed(2),
        avgLoad: currentLoad.avgLoad
      },
      memory: {
        total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        free: (mem.free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        used: (mem.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        usedPercent: ((mem.used / mem.total) * 100).toFixed(2) + '%',
        active: (mem.active / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      },
      disk: disk.map(d => ({
        fs: d.fs,
        type: d.type,
        size: (d.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        used: (d.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        available: (d.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        usedPercent: d.use.toFixed(2) + '%',
        mount: d.mount
      })),
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        uptime: Math.floor(osInfo.uptime / 3600) + ' hours'
      },
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping
      },
      node: {
        version: process.version,
        uptime: Math.floor(process.uptime()) + ' seconds',
        memoryUsage: {
          rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
          heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          external: (process.memoryUsage().external / 1024 / 1024).toFixed(2) + ' MB'
        }
      }
    };
    
    return health;
  } catch (error) {
    logger.error('Failed to get system health:', error);
    throw error;
  }
};

const logSystemHealth = async () => {
  try {
    const health = await getSystemHealth();
    
    systemLogger.info('SYSTEM_HEALTH', {
      cpu_load: health.cpu.currentLoad,
      memory_used_percent: health.memory.usedPercent,
      disk_usage: health.disk.map(d => ({ mount: d.mount, used: d.usedPercent })),
      node_memory: health.node.memoryUsage.heapUsed,
      uptime: health.node.uptime
    });
    
    const cpuLoad = parseFloat(health.cpu.currentLoad);
    const memUsed = parseFloat(health.memory.usedPercent);
    
    if (cpuLoad > 80) {
      logger.warn(`High CPU usage: ${cpuLoad}%`);
    }
    
    if (memUsed > 85) {
      logger.warn(`High memory usage: ${memUsed}%`);
    }
    
    health.disk.forEach(disk => {
      const diskUsed = parseFloat(disk.usedPercent);
      if (diskUsed > 90) {
        logger.warn(`High disk usage on ${disk.mount}: ${diskUsed}%`);
      }
    });
    
  } catch (error) {
    logger.error('System health logging failed:', error);
  }
};

const startSystemMonitoring = (intervalMinutes = 5) => {
  if (process.env.ENABLE_SYSTEM_HEALTH_LOG !== 'true') {
    logger.info('System health monitoring is disabled');
    return null;
  }
  
  logger.info(`Starting system health monitoring (every ${intervalMinutes} minutes)`);
  
  logSystemHealth();
  
  const interval = setInterval(() => {
    logSystemHealth();
  }, intervalMinutes * 60 * 1000);
  
  return interval;
};

const getQuickStats = async () => {
  try {
    const [currentLoad, mem] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);
    
    return {
      cpu: currentLoad.currentLoad.toFixed(2) + '%',
      memory: ((mem.used / mem.total) * 100).toFixed(2) + '%',
      memoryUsed: (mem.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      memoryTotal: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
      nodeMemory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      uptime: Math.floor(process.uptime()) + 's'
    };
  } catch (error) {
    return {
      cpu: 'N/A',
      memory: 'N/A',
      error: error.message
    };
  }
};

module.exports = {
  getSystemHealth,
  logSystemHealth,
  startSystemMonitoring,
  getQuickStats
};

const { Pool } = require('pg');
const logger = require('../utils/logger');

const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: process.env.NODE_ENV === 'production' ? 120 : 80,
  min: process.env.NODE_ENV === 'production' ? 10 : 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
  options: '-c search_path=public'
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected pool error:', err);
});

const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.ENABLE_SLOW_QUERY_LOG === 'true' && duration > 500) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 200)}`);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error(`Query error (${duration}ms): ${text.substring(0, 200)}`, { error: error.message });
    throw error;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  client.query = async (text, params) => {
    const start = Date.now();
    try {
      const result = await originalQuery(text, params);
      const duration = Date.now() - start;
      if (process.env.ENABLE_SLOW_QUERY_LOG === 'true' && duration > 500) {
        logger.warn(`Slow query (${duration}ms): ${text.substring(0, 200)}`);
      }
      return result;
    } catch (error) {
      logger.error(`Transaction query error: ${text.substring(0, 200)}`, { error: error.message });
      throw error;
    }
  };
  return client;
};

const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info(`✓ Database connection established successfully at ${res.rows[0].now}`);
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed:', error);
    return false;
  }
};

const closeConnection = async () => {
  try {
    await pool.end();
    logger.info('Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

module.exports = { pool, query, getClient, testConnection, closeConnection };

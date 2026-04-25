#!/usr/bin/env node

/**
 * Script to generate Postman collection
 * Run this whenever you modify API routes
 */

const { generatePostmanCollection } = require('./postmanGenerator');
const logger = require('./logger');

// Production: Remove debug log

try {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const collectionPath = generatePostmanCollection(null, baseUrl);
  
  logger.info(`Postman collection generated successfully at: ${collectionPath}`);
  // Production: Remove debug logs
  
} catch (error) {
  logger.error('Failed to generate Postman collection:', error);
  process.exit(1);
}

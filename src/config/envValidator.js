/**
 * Environment variable validation for production
 * Ensures all required environment variables are present and valid
 */

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'BCRYPT_ROUNDS'
];

const optionalEnvVars = [
  'DB_SSL',
  'LOG_LEVEL',
  'CORS_ORIGIN',
  'RATE_LIMIT_WINDOW',
  'RATE_LIMIT_MAX'
];

const validateEnvVars = () => {
  const missing = [];
  const invalid = [];
  
  // Check required environment variables
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      // Validate specific variables
      switch (varName) {
        case 'PORT':
          if (isNaN(value) || parseInt(value) <= 0) {
            invalid.push({ var: varName, value, reason: 'Must be a positive number' });
          }
          break;
        case 'DB_PORT':
          if (isNaN(value) || parseInt(value) <= 0) {
            invalid.push({ var: varName, value, reason: 'Must be a positive number' });
          }
          break;
        case 'BCRYPT_ROUNDS':
          const rounds = parseInt(value);
          if (isNaN(rounds) || rounds < 10 || rounds > 15) {
            invalid.push({ var: varName, value, reason: 'Must be between 10 and 15' });
          }
          break;
        case 'JWT_SECRET':
        case 'JWT_REFRESH_SECRET':
          if (value.length < 32) {
            invalid.push({ var: varName, value: '[REDACTED]', reason: 'Must be at least 32 characters' });
          }
          break;
      }
    }
  });

  // Validate optional environment variables with defaults
  const envWithDefaults = {};
  
  // Set defaults for optional variables
  envWithDefaults.NODE_ENV = process.env.NODE_ENV || 'development';
  envWithDefaults.PORT = parseInt(process.env.PORT) || 5000;
  envWithDefaults.DB_SSL = process.env.DB_SSL === 'true' ? true : false;
  envWithDefaults.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  envWithDefaults.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
  envWithDefaults.RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 15;
  envWithDefaults.RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;

  // If there are missing or invalid variables, throw error in production
  if ((missing.length > 0 || invalid.length > 0) && process.env.NODE_ENV === 'production') {
    const errorMessages = [];
    
    if (missing.length > 0) {
      errorMessages.push(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    if (invalid.length > 0) {
      invalid.forEach(({ var: varName, reason }) => {
        errorMessages.push(`Invalid ${varName}: ${reason}`);
      });
    }
    
    throw new Error(`Environment validation failed: ${errorMessages.join('; ')}`);
  }

  // Log warnings in non-production environments
  if (missing.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(`⚠️  Missing environment variables (using defaults): ${missing.join(', ')}`);
  }
  
  if (invalid.length > 0 && process.env.NODE_ENV !== 'production') {
    invalid.forEach(({ var: varName, reason }) => {
      console.warn(`⚠️  Invalid ${varName}: ${reason}`);
    });
  }

  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    env: envWithDefaults
  };
};

module.exports = { validateEnvVars, requiredEnvVars, optionalEnvVars };

/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input
 */

const xssPatterns = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // JavaScript event handlers
  /on\w+\s*=\s*["'][^"']*["']/gi,
  // JavaScript protocols
  /javascript:/gi,
  // Data URLs with scripts
  /data:(?!image\/)/gi,
  // HTML comments with scripts
  /<!--[\s\S]*?-->/gi,
  // Meta tags
  /<meta\b[^<]*(?:(?!\/>)<[^<]*)*\/>/gi,
  // Style tags with scripts
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  // Iframes
  /<iframe\b[^<]*(?:(?!\/>)<[^<]*)*\/>/gi,
  // Object/embed tags
  /<(?:object|embed)\b[^<]*(?:(?!\/>)<[^<]*)*\/>/gi,
  // Form tags
  /<form\b[^<]*(?:(?!\/>)<[^<]*)*\/>/gi,
  // Input with dangerous types
  /<input[^>]*type\s*=\s*["']?(?:file|password|hidden)["']?[^>]*>/gi
];

const sqlInjectionPatterns = [
  // SQL comments
  /(?:--|#|\/\*|\*\/)/gi,
  // SQL keywords
  /\b(?:UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi,
  // SQL functions
  /\b(?:CONCAT|CHAR|ASCII|ORD|SUBSTRING|LENGTH|VERSION|DATABASE|USER)\b/gi,
  // Conditional statements
  /\b(?:CASE|WHEN|THEN|ELSE|END|IF|ELSE|END IF)\b/gi,
  // Multiple statements
  /;/gi,
  // Quotes and escapes
  /['"\\]/gi
];

/**
 * Sanitize string input by removing dangerous patterns
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input, options = {}) => {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    removeHtml = true,
    preventXss = true,
    preventSqlInjection = true,
    maxLength = 1000,
    trimWhitespace = true
  } = options;

  let sanitized = input;

  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Check max length
  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove HTML tags
  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Prevent XSS
  if (preventXss) {
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // Additional XSS prevention
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Prevent SQL injection
  if (preventSqlInjection) {
    sqlInjectionPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  return sanitized;
};

/**
 * Sanitize object by recursively sanitizing all string values
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, options);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, options);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validate name format (letters, spaces, hyphens, apostrophes only)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  return nameRegex.test(name) && name.trim().length >= 2;
};

/**
 * Sanitize and validate user input
 * @param {any} input - Input to sanitize and validate
 * @param {Object} rules - Validation rules
 * @returns {Object} - { isValid: boolean, sanitized: any, errors: string[] }
 */
const sanitizeAndValidate = (input, rules = {}) => {
  const result = {
    isValid: true,
    sanitized: input,
    errors: []
  };

  try {
    // Sanitize based on type
    if (typeof input === 'string') {
      result.sanitized = sanitizeString(input, rules.sanitize);
    } else if (typeof input === 'object' && input !== null) {
      result.sanitized = sanitizeObject(input, rules.sanitize);
    }

    // Apply validation rules
    if (rules.required && (!result.sanitized || result.sanitized === '')) {
      result.isValid = false;
      result.errors.push('This field is required');
    }

    if (rules.minLength && result.sanitized.length < rules.minLength) {
      result.isValid = false;
      result.errors.push(`Minimum length is ${rules.minLength} characters`);
    }

    if (rules.maxLength && result.sanitized.length > rules.maxLength) {
      result.isValid = false;
      result.errors.push(`Maximum length is ${rules.maxLength} characters`);
    }

    if (rules.type === 'email' && !validateEmail(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
    }

    if (rules.type === 'phone' && !validatePhone(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Invalid phone number format');
    }

    if (rules.type === 'name' && !validateName(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Invalid name format');
    }

    if (rules.pattern && !rules.pattern.test(result.sanitized)) {
      result.isValid = false;
      result.errors.push('Invalid format');
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push('Validation error occurred');
  }

  return result;
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeAndValidate,
  validateEmail,
  validatePhone,
  validateName,
  xssPatterns,
  sqlInjectionPatterns
};

/**
 * Validation Utilities for Land Distance & Area Calculator
 * Contains input validation and data integrity checking
 */

import { parseXY } from './calculations.js';

/**
 * Validate a coordinate string
 * @param {string} value - Coordinate string to validate
 * @returns {Object} Validation result with {valid: boolean, error: string|null, point: Object|null}
 */
export function validateCoordinate(value) {
  // Empty value is valid (optional input)
  if (!value || value.trim() === '') {
    return { valid: true, error: null, point: null };
  }

  // Check basic format (should contain a comma)
  if (!value.includes(',')) {
    return {
      valid: false,
      error: 'Format should be: X, Y (e.g., 100.5, 200)',
      point: null
    };
  }

  // Try to parse the coordinate
  const point = parseXY(value);

  if (!point) {
    return {
      valid: false,
      error: 'Invalid coordinates. Use numbers separated by comma (e.g., 100, 200)',
      point: null
    };
  }

  // Check for reasonable range (prevent extremely large values that might cause issues)
  const MAX_COORDINATE = 1000000; // 1 million meters should be more than enough
  if (Math.abs(point.x) > MAX_COORDINATE || Math.abs(point.y) > MAX_COORDINATE) {
    return {
      valid: false,
      error: `Coordinates too large. Maximum value is ${MAX_COORDINATE.toLocaleString()}`,
      point: null
    };
  }

  return { valid: true, error: null, point };
}

/**
 * Validate an array of points for measurement calculation
 * @param {Array} points - Array of point objects
 * @param {string} side - Side name ('left' or 'right') for error messages
 * @returns {Object} Validation result with {valid: boolean, error: string|null}
 */
export function validatePoints(points, side = 'points') {
  if (!points || !Array.isArray(points)) {
    return { valid: false, error: `Invalid ${side} points array` };
  }

  if (points.length < 2) {
    return {
      valid: false,
      error: `At least 2 ${side} points are required for distance calculation`
    };
  }

  // Check for duplicate points (same coordinates)
  const duplicates = findDuplicatePoints(points);
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `Duplicate coordinates found in ${side} points at positions ${duplicates.join(', ')}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Find duplicate points in an array
 * @param {Array} points - Array of point objects
 * @returns {Array} Array of indices where duplicates were found
 */
export function findDuplicatePoints(points) {
  const duplicates = [];
  const seen = new Map();

  points.forEach((point, index) => {
    const key = `${point.x},${point.y}`;
    if (seen.has(key)) {
      duplicates.push(index + 1); // 1-indexed for user display
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}

/**
 * Validate a project name
 * @param {string} name - Project name to validate
 * @param {Array} existingProjects - Array of existing projects
 * @returns {Object} Validation result with {valid: boolean, error: string|null}
 */
export function validateProjectName(name, existingProjects = []) {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Project name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 3) {
    return { valid: false, error: 'Project name must be at least 3 characters' };
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: 'Project name must be less than 50 characters' };
  }

  // Check for duplicate names
  const duplicate = existingProjects.find(
    p => p.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    return { valid: false, error: 'A project with this name already exists' };
  }

  return { valid: true, error: null };
}

/**
 * Validate measurement data before saving
 * @param {Object} measurement - Measurement object to validate
 * @returns {Object} Validation result with {valid: boolean, errors: Array}
 */
export function validateMeasurement(measurement) {
  const errors = [];

  if (!measurement) {
    errors.push('Measurement data is required');
    return { valid: false, errors };
  }

  if (!measurement.leftPoints || !Array.isArray(measurement.leftPoints)) {
    errors.push('Left points are required');
  }

  if (!measurement.rightPoints || !Array.isArray(measurement.rightPoints)) {
    errors.push('Right points are required');
  }

  // Validate left points
  if (measurement.leftPoints) {
    const leftValidation = validatePoints(measurement.leftPoints, 'left');
    if (!leftValidation.valid) {
      errors.push(leftValidation.error);
    }
  }

  // Validate right points
  if (measurement.rightPoints) {
    const rightValidation = validatePoints(measurement.rightPoints, 'right');
    if (!rightValidation.valid) {
      errors.push(rightValidation.error);
    }
  }

  // Validate calculations exist
  if (!measurement.calculations) {
    errors.push('Measurement calculations are missing');
  } else {
    // Check for NaN or negative values in calculations
    const calcs = measurement.calculations;
    if (isNaN(calcs.leftDistance) || calcs.leftDistance < 0) {
      errors.push('Invalid left distance calculation');
    }
    if (isNaN(calcs.rightDistance) || calcs.rightDistance < 0) {
      errors.push('Invalid right distance calculation');
    }
    if (isNaN(calcs.area) || calcs.area < 0) {
      errors.push('Invalid area calculation');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Auto-format coordinate input (add comma if missing, trim spaces)
 * @param {string} value - Raw input value
 * @returns {string} Formatted value
 */
export function autoFormatCoordinate(value) {
  if (!value) return '';

  let formatted = value.trim();

  // If there's a space but no comma, replace first space with comma
  if (formatted.includes(' ') && !formatted.includes(',')) {
    formatted = formatted.replace(/\s+/, ', ');
  }

  // Clean up extra spaces around comma
  formatted = formatted.replace(/\s*,\s*/, ', ');

  return formatted;
}

/**
 * Validate localStorage availability and quota
 * @returns {Object} {available: boolean, quota: number|null, usage: number|null}
 */
export function validateLocalStorage() {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);

    // Try to estimate quota (not all browsers support this)
    let quota = null;
    let usage = null;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        quota = estimate.quota;
        usage = estimate.usage;
      });
    }

    return { available: true, quota, usage };
  } catch (e) {
    return { available: false, quota: null, usage: null };
  }
}

/**
 * Check if a value is a valid UUID
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID format
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Calculation Utilities for Land Distance & Area Calculator
 * Contains all mathematical and conversion functions
 */

/**
 * Parse a coordinate string into an {x, y} object
 * @param {string} value - Coordinate string in format "X, Y"
 * @returns {Object|null} Object with x and y properties, or null if invalid
 * @example parseXY("100.5, 200.75") => {x: 100.5, y: 200.75}
 */
export function parseXY(value) {
  if (!value) return null;

  const parts = value.split(',');
  if (parts.length !== 2) return null;

  const x = parseFloat(parts[0].trim());
  const y = parseFloat(parts[1].trim());

  if (isNaN(x) || isNaN(y)) return null;

  return { x, y };
}

/**
 * Calculate Euclidean distance between two points
 * @param {Object} a - First point with x and y properties
 * @param {Object} b - Second point with x and y properties
 * @returns {number} Distance in meters (assuming 1 unit = 1 meter)
 * @example dist({x: 0, y: 0}, {x: 3, y: 4}) => 5
 */
export function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Convert meters to feet and inches
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted string like "352 ft 8 in"
 */
export function metersToFeetInches(meters) {
  const inches = Math.round(meters * 39.3701);
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft} ft ${inch} in`;
}

/**
 * Convert square feet to decimal (land measurement unit)
 * @param {number} sqft - Area in square feet
 * @returns {string} Area in decimal (1 decimal = 435.6 sq ft)
 */
export function sqftToDecimal(sqft) {
  return (sqft / 435.6).toFixed(3);
}

/**
 * Collect and parse coordinate points from input fields
 * @param {string} prefix - Input field prefix ('left' or 'right')
 * @param {number} maxPoints - Maximum number of points to collect (default: 5)
 * @returns {Array} Array of point objects {x, y}
 */
export function collectPoints(prefix, maxPoints = 5) {
  const points = [];

  for (let i = 1; i <= maxPoints; i++) {
    const input = document.getElementById(`${prefix}${i}`);
    if (!input) continue;

    const point = parseXY(input.value);
    if (point) {
      points.push(point);
    }
  }

  return points;
}

/**
 * Calculate measurements from left and right points
 * @param {Array} leftPoints - Array of left side points
 * @param {Array} rightPoints - Array of right side points
 * @returns {Object} Object containing all calculated measurements
 */
export function calculateMeasurements(leftPoints, rightPoints) {
  const result = {
    leftDistance: 0,
    rightDistance: 0,
    avgWidth: 0,
    length: 0,
    area: 0,
    areaDecimal: 0
  };

  // Calculate left distance (between first two points)
  if (leftPoints.length >= 2) {
    result.leftDistance = dist(leftPoints[0], leftPoints[1]);
  }

  // Calculate right distance (between first two points)
  if (rightPoints.length >= 2) {
    result.rightDistance = dist(rightPoints[0], rightPoints[1]);
  }

  // Calculate area if both sides have at least 2 points
  if (leftPoints.length >= 2 && rightPoints.length >= 2) {
    const leftWidth = result.leftDistance;
    const rightWidth = result.rightDistance;
    result.avgWidth = (leftWidth + rightWidth) / 2;

    // Calculate midpoints
    const leftMidpoint = {
      x: (leftPoints[0].x + leftPoints[1].x) / 2,
      y: (leftPoints[0].y + leftPoints[1].y) / 2
    };

    const rightMidpoint = {
      x: (rightPoints[0].x + rightPoints[1].x) / 2,
      y: (rightPoints[0].y + rightPoints[1].y) / 2
    };

    // Length is distance between midpoints
    result.length = dist(leftMidpoint, rightMidpoint);

    // Area calculation (width * length * conversion factor to sq ft)
    result.area = result.avgWidth * result.length * 10.7639;
    result.areaDecimal = parseFloat(sqftToDecimal(result.area));
  }

  return result;
}

/**
 * Generate a UUID v4 (for creating unique IDs)
 * @returns {string} UUID string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a timestamp to a human-readable relative time
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted time like "2 hours ago" or "Dec 24, 2025"
 */
export function formatTimeAgo(timestamp) {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  // For older dates, show full date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Debounce function - delays execution until after wait time has elapsed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

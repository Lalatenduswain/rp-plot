/**
 * Measurement Model
 * Represents a single land measurement with calculations
 */

import { generateUUID, calculateMeasurements } from '../utils/calculations.js';
import { validateMeasurement } from '../utils/validation.js';

export class Measurement {
  /**
   * Create a new measurement
   * @param {Array} leftPoints - Array of left side points [{x, y}, ...]
   * @param {Array} rightPoints - Array of right side points [{x, y}, ...]
   * @param {string} name - Optional measurement name
   */
  constructor(leftPoints = [], rightPoints = [], name = '') {
    this.id = generateUUID();
    this.timestamp = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.name = name;
    this.leftPoints = leftPoints;
    this.rightPoints = rightPoints;
    this.calculations = this.calculate();
    this.notes = '';
  }

  /**
   * Calculate or recalculate measurements
   * @returns {Object} Calculations object
   */
  calculate() {
    return calculateMeasurements(this.leftPoints, this.rightPoints);
  }

  /**
   * Update measurement data
   * @param {Object} updates - Object containing fields to update
   */
  update(updates) {
    const allowedFields = ['name', 'leftPoints', 'rightPoints', 'notes'];

    let pointsChanged = false;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        this[key] = updates[key];

        if (key === 'leftPoints' || key === 'rightPoints') {
          pointsChanged = true;
        }
      }
    });

    // Recalculate if points changed
    if (pointsChanged) {
      this.calculations = this.calculate();
    }

    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add a point to the specified side
   * @param {string} side - 'left' or 'right'
   * @param {Object} point - Point object {x, y}
   * @returns {boolean} True if added successfully
   */
  addPoint(side, point) {
    if (side !== 'left' && side !== 'right') {
      console.error('Invalid side:', side);
      return false;
    }

    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
      console.error('Invalid point:', point);
      return false;
    }

    const pointsArray = side === 'left' ? this.leftPoints : this.rightPoints;
    pointsArray.push(point);

    // Recalculate
    this.calculations = this.calculate();
    this.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Remove a point from the specified side
   * @param {string} side - 'left' or 'right'
   * @param {number} index - Index of point to remove
   * @returns {boolean} True if removed successfully
   */
  removePoint(side, index) {
    if (side !== 'left' && side !== 'right') {
      console.error('Invalid side:', side);
      return false;
    }

    const pointsArray = side === 'left' ? this.leftPoints : this.rightPoints;

    if (index < 0 || index >= pointsArray.length) {
      console.error('Invalid index:', index);
      return false;
    }

    pointsArray.splice(index, 1);

    // Recalculate
    this.calculations = this.calculate();
    this.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Update a specific point
   * @param {string} side - 'left' or 'right'
   * @param {number} index - Index of point to update
   * @param {Object} newPoint - New point object {x, y}
   * @returns {boolean} True if updated successfully
   */
  updatePoint(side, index, newPoint) {
    if (side !== 'left' && side !== 'right') {
      console.error('Invalid side:', side);
      return false;
    }

    const pointsArray = side === 'left' ? this.leftPoints : this.rightPoints;

    if (index < 0 || index >= pointsArray.length) {
      console.error('Invalid index:', index);
      return false;
    }

    if (!newPoint || typeof newPoint.x !== 'number' || typeof newPoint.y !== 'number') {
      console.error('Invalid point:', newPoint);
      return false;
    }

    pointsArray[index] = newPoint;

    // Recalculate
    this.calculations = this.calculate();
    this.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Clear all points
   * @param {string} side - Optional: 'left', 'right', or undefined for both
   */
  clearPoints(side) {
    if (!side || side === 'left') {
      this.leftPoints = [];
    }

    if (!side || side === 'right') {
      this.rightPoints = [];
    }

    this.calculations = this.calculate();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Check if measurement has enough points for calculation
   * @returns {boolean} True if both sides have at least 2 points
   */
  isValid() {
    return this.leftPoints.length >= 2 && this.rightPoints.length >= 2;
  }

  /**
   * Get measurement summary
   * @returns {Object} Summary with key measurements
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name || `Measurement ${this.timestamp}`,
      timestamp: this.timestamp,
      area: this.calculations.area,
      areaDecimal: this.calculations.areaDecimal,
      leftDistance: this.calculations.leftDistance,
      rightDistance: this.calculations.rightDistance,
      pointCount: {
        left: this.leftPoints.length,
        right: this.rightPoints.length
      }
    };
  }

  /**
   * Validate this measurement
   * @returns {Object} {valid: boolean, errors: Array}
   */
  validate() {
    return validateMeasurement(this);
  }

  /**
   * Serialize measurement to JSON for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      updatedAt: this.updatedAt,
      name: this.name,
      leftPoints: [...this.leftPoints],
      rightPoints: [...this.rightPoints],
      calculations: { ...this.calculations },
      notes: this.notes
    };
  }

  /**
   * Create a Measurement instance from JSON data
   * @param {Object} data - JSON data
   * @returns {Measurement} Measurement instance
   */
  static fromJSON(data) {
    const measurement = new Measurement(
      data.leftPoints || [],
      data.rightPoints || [],
      data.name || ''
    );

    // Restore original IDs and timestamps
    measurement.id = data.id;
    measurement.timestamp = data.timestamp;
    measurement.updatedAt = data.updatedAt || data.timestamp;
    measurement.notes = data.notes || '';

    // Restore calculations if they exist (otherwise recalculate)
    if (data.calculations) {
      measurement.calculations = data.calculations;
    } else {
      measurement.calculations = measurement.calculate();
    }

    return measurement;
  }

  /**
   * Clone this measurement
   * @returns {Measurement} New measurement instance
   */
  clone() {
    const cloned = new Measurement(
      [...this.leftPoints],
      [...this.rightPoints],
      `${this.name} (Copy)`
    );

    cloned.notes = this.notes;

    return cloned;
  }

  /**
   * Export measurement data for download
   * @returns {Object} Export-ready data structure
   */
  exportData() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      application: 'Land Distance & Area Calculator',
      measurement: this.toJSON()
    };
  }

  /**
   * Get formatted measurement text for display or export
   * @returns {string} Formatted measurement text
   */
  getFormattedText() {
    const { leftDistance, rightDistance, avgWidth, length, area, areaDecimal } = this.calculations;

    return `
Measurement Report
${this.name || 'Unnamed Measurement'}
Date: ${new Date(this.timestamp).toLocaleString()}

Left Side Distance: ${leftDistance.toFixed(3)} m (${this.metersToFeet(leftDistance)})
Right Side Distance: ${rightDistance.toFixed(3)} m (${this.metersToFeet(rightDistance)})

Average Width: ${avgWidth.toFixed(2)} m
Length: ${length.toFixed(2)} m

Total Area: ${area.toFixed(2)} sq ft (${areaDecimal.toFixed(3)} decimal)

Left Points:
${this.leftPoints.map((p, i) => `  ${i + 1}. (${p.x}, ${p.y})`).join('\n')}

Right Points:
${this.rightPoints.map((p, i) => `  ${i + 1}. (${p.x}, ${p.y})`).join('\n')}

${this.notes ? `Notes: ${this.notes}` : ''}
    `.trim();
  }

  /**
   * Helper to convert meters to feet and inches
   * @param {number} meters - Distance in meters
   * @returns {string} Formatted string
   */
  metersToFeet(meters) {
    const inches = Math.round(meters * 39.3701);
    const ft = Math.floor(inches / 12);
    const inch = inches % 12;
    return `${ft} ft ${inch} in`;
  }
}

export default Measurement;

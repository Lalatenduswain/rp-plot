/**
 * Project Model
 * Represents a project containing multiple measurements
 */

import { generateUUID } from '../utils/calculations.js';
import { validateProjectName } from '../utils/validation.js';

export class Project {
  /**
   * Create a new project
   * @param {string} name - Project name
   * @param {string} description - Optional project description
   */
  constructor(name, description = '') {
    this.id = generateUUID();
    this.name = name;
    this.description = description;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.measurements = [];
    this.metadata = {
      author: '',
      tags: [],
      location: ''
    };
  }

  /**
   * Add a measurement to this project
   * @param {Measurement} measurement - Measurement object to add
   * @returns {boolean} True if added successfully
   */
  addMeasurement(measurement) {
    if (!measurement || !measurement.id) {
      console.error('Invalid measurement object');
      return false;
    }

    this.measurements.push(measurement);
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Remove a measurement from this project
   * @param {string} measurementId - ID of measurement to remove
   * @returns {boolean} True if removed successfully
   */
  removeMeasurement(measurementId) {
    const index = this.measurements.findIndex(m => m.id === measurementId);

    if (index === -1) {
      console.error('Measurement not found:', measurementId);
      return false;
    }

    this.measurements.splice(index, 1);
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Get a measurement by ID
   * @param {string} measurementId - ID of measurement to retrieve
   * @returns {Measurement|null} Measurement object or null if not found
   */
  getMeasurement(measurementId) {
    return this.measurements.find(m => m.id === measurementId) || null;
  }

  /**
   * Update project metadata
   * @param {Object} updates - Object containing fields to update
   */
  update(updates) {
    const allowedFields = ['name', 'description', 'metadata'];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        if (key === 'metadata') {
          this.metadata = { ...this.metadata, ...updates.metadata };
        } else {
          this[key] = updates[key];
        }
      }
    });

    this.updatedAt = new Date().toISOString();
  }

  /**
   * Get total number of measurements
   * @returns {number} Count of measurements
   */
  get measurementCount() {
    return this.measurements.length;
  }

  /**
   * Get total area of all measurements in this project
   * @returns {number} Sum of all areas in square feet
   */
  get totalArea() {
    return this.measurements.reduce((sum, m) => {
      return sum + (m.calculations?.area || 0);
    }, 0);
  }

  /**
   * Get the most recent measurement
   * @returns {Measurement|null} Most recent measurement or null if none
   */
  get latestMeasurement() {
    if (this.measurements.length === 0) return null;

    return this.measurements.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp)
        ? current
        : latest;
    });
  }

  /**
   * Serialize project to JSON for storage
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      measurements: this.measurements.map(m => m.toJSON ? m.toJSON() : m),
      metadata: this.metadata
    };
  }

  /**
   * Create a Project instance from JSON data
   * @param {Object} data - JSON data
   * @returns {Project} Project instance
   */
  static fromJSON(data) {
    const project = new Project(data.name, data.description);

    // Restore original IDs and timestamps
    project.id = data.id;
    project.createdAt = data.createdAt;
    project.updatedAt = data.updatedAt;
    project.metadata = data.metadata || {
      author: '',
      tags: [],
      location: ''
    };

    // Restore measurements (will be converted from plain objects to Measurement instances)
    project.measurements = data.measurements || [];

    return project;
  }

  /**
   * Validate project data
   * @param {Array} existingProjects - Array of existing projects for duplicate checking
   * @returns {Object} {valid: boolean, error: string|null}
   */
  validate(existingProjects = []) {
    // Filter out this project from existing projects when checking duplicates
    const others = existingProjects.filter(p => p.id !== this.id);
    return validateProjectName(this.name, others);
  }

  /**
   * Clone this project with a new name
   * @param {string} newName - Name for the cloned project
   * @returns {Project} New project instance
   */
  clone(newName) {
    const cloned = new Project(newName, this.description);
    cloned.metadata = { ...this.metadata };

    // Clone all measurements
    this.measurements.forEach(measurement => {
      const clonedMeasurement = { ...measurement };
      clonedMeasurement.id = generateUUID();
      clonedMeasurement.timestamp = new Date().toISOString();
      cloned.measurements.push(clonedMeasurement);
    });

    return cloned;
  }

  /**
   * Export project data for download
   * @returns {Object} Export-ready data structure
   */
  exportData() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      application: 'Land Distance & Area Calculator',
      project: this.toJSON()
    };
  }

  /**
   * Import project data from exported file
   * @param {Object} data - Imported data
   * @returns {Project|null} Project instance or null if invalid
   */
  static importData(data) {
    try {
      // Validate import data structure
      if (!data.project || !data.version) {
        console.error('Invalid import data structure');
        return null;
      }

      // Create project from imported data
      const project = Project.fromJSON(data.project);

      // Assign new ID to avoid conflicts
      project.id = generateUUID();
      project.name = `${project.name} (Imported)`;

      // Update timestamps
      const now = new Date().toISOString();
      project.createdAt = now;
      project.updatedAt = now;

      // Assign new IDs to all measurements
      project.measurements = project.measurements.map(m => ({
        ...m,
        id: generateUUID(),
        timestamp: now
      }));

      return project;
    } catch (error) {
      console.error('Error importing project:', error);
      return null;
    }
  }
}

export default Project;

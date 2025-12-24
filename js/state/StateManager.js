/**
 * State Manager
 * Central state management system using observer pattern
 */

import { Project } from '../models/Project.js';
import { Measurement } from '../models/Measurement.js';

export class StateManager {
  constructor() {
    // Application state
    this.state = {
      currentProject: null,
      currentProjectId: null,
      projects: [],
      settings: this.getDefaultSettings(),
      ui: {
        selectedMeasurementId: null,
        historyPanelOpen: false,
        settingsPanelOpen: false
      }
    };

    // Event listeners for state changes
    this.listeners = [];

    // Flag to prevent infinite loops during state updates
    this.isUpdating = false;
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
      defaultUnit: 'meters',
      autoSave: true,
      showGrid: true,
      showLabels: true,
      theme: 'light',
      maxHistorySize: 50
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function that receives state updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.error('Listener must be a function');
      return () => {};
    }

    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   * @param {string} action - Action that triggered the change
   * @param {*} payload - Additional data about the change
   */
  notifyListeners(action = 'STATE_UPDATE', payload = null) {
    if (this.isUpdating) return;

    this.isUpdating = true;

    this.listeners.forEach(listener => {
      try {
        listener({
          state: this.getState(),
          action,
          payload
        });
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });

    this.isUpdating = false;
  }

  /**
   * Get current state (returns a copy to prevent direct mutation)
   * @returns {Object} Current state
   */
  getState() {
    return {
      ...this.state,
      currentProject: this.state.currentProject
        ? { ...this.state.currentProject }
        : null
    };
  }

  /**
   * Add a new project
   * @param {Project} project - Project instance to add
   * @returns {boolean} True if added successfully
   */
  addProject(project) {
    if (!(project instanceof Project)) {
      console.error('Invalid project instance');
      return false;
    }

    // Validate project
    const validation = project.validate(this.state.projects);
    if (!validation.valid) {
      console.error('Project validation failed:', validation.error);
      return false;
    }

    this.state.projects.push(project);
    this.notifyListeners('PROJECT_ADDED', { projectId: project.id });

    return true;
  }

  /**
   * Remove a project
   * @param {string} projectId - ID of project to remove
   * @returns {boolean} True if removed successfully
   */
  removeProject(projectId) {
    const index = this.state.projects.findIndex(p => p.id === projectId);

    if (index === -1) {
      console.error('Project not found:', projectId);
      return false;
    }

    // If removing current project, clear it
    if (this.state.currentProjectId === projectId) {
      this.state.currentProject = null;
      this.state.currentProjectId = null;
    }

    this.state.projects.splice(index, 1);
    this.notifyListeners('PROJECT_REMOVED', { projectId });

    return true;
  }

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Project|null} Project instance or null
   */
  getProject(projectId) {
    return this.state.projects.find(p => p.id === projectId) || null;
  }

  /**
   * Set current project
   * @param {string} projectId - ID of project to set as current
   * @returns {boolean} True if set successfully
   */
  setCurrentProject(projectId) {
    if (!projectId) {
      this.state.currentProject = null;
      this.state.currentProjectId = null;
      this.notifyListeners('PROJECT_CHANGED', { projectId: null });
      return true;
    }

    const project = this.getProject(projectId);

    if (!project) {
      console.error('Project not found:', projectId);
      return false;
    }

    this.state.currentProject = project;
    this.state.currentProjectId = projectId;
    this.notifyListeners('PROJECT_CHANGED', { projectId });

    return true;
  }

  /**
   * Update current project
   * @param {Object} updates - Fields to update
   * @returns {boolean} True if updated successfully
   */
  updateCurrentProject(updates) {
    if (!this.state.currentProject) {
      console.error('No current project');
      return false;
    }

    this.state.currentProject.update(updates);
    this.notifyListeners('PROJECT_UPDATED', {
      projectId: this.state.currentProjectId
    });

    return true;
  }

  /**
   * Add measurement to current project
   * @param {Measurement} measurement - Measurement instance
   * @returns {boolean} True if added successfully
   */
  addMeasurement(measurement) {
    if (!this.state.currentProject) {
      console.error('No current project');
      return false;
    }

    if (!(measurement instanceof Measurement)) {
      console.error('Invalid measurement instance');
      return false;
    }

    // Validate measurement
    const validation = measurement.validate();
    if (!validation.valid) {
      console.error('Measurement validation failed:', validation.errors);
      return false;
    }

    this.state.currentProject.addMeasurement(measurement);
    this.notifyListeners('MEASUREMENT_ADDED', {
      projectId: this.state.currentProjectId,
      measurementId: measurement.id
    });

    return true;
  }

  /**
   * Remove measurement from current project
   * @param {string} measurementId - ID of measurement to remove
   * @returns {boolean} True if removed successfully
   */
  removeMeasurement(measurementId) {
    if (!this.state.currentProject) {
      console.error('No current project');
      return false;
    }

    const success = this.state.currentProject.removeMeasurement(measurementId);

    if (success) {
      // Clear selection if removed measurement was selected
      if (this.state.ui.selectedMeasurementId === measurementId) {
        this.state.ui.selectedMeasurementId = null;
      }

      this.notifyListeners('MEASUREMENT_REMOVED', {
        projectId: this.state.currentProjectId,
        measurementId
      });
    }

    return success;
  }

  /**
   * Get measurement by ID from current project
   * @param {string} measurementId - Measurement ID
   * @returns {Measurement|null} Measurement instance or null
   */
  getMeasurement(measurementId) {
    if (!this.state.currentProject) {
      return null;
    }

    return this.state.currentProject.getMeasurement(measurementId);
  }

  /**
   * Update settings
   * @param {Object} updates - Settings to update
   */
  updateSettings(updates) {
    this.state.settings = {
      ...this.state.settings,
      ...updates
    };

    this.notifyListeners('SETTINGS_UPDATED', updates);
  }

  /**
   * Get settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.state.settings };
  }

  /**
   * Update UI state
   * @param {Object} updates - UI state updates
   */
  updateUI(updates) {
    this.state.ui = {
      ...this.state.ui,
      ...updates
    };

    this.notifyListeners('UI_UPDATED', updates);
  }

  /**
   * Select a measurement
   * @param {string} measurementId - ID of measurement to select
   */
  selectMeasurement(measurementId) {
    this.state.ui.selectedMeasurementId = measurementId;
    this.notifyListeners('MEASUREMENT_SELECTED', { measurementId });
  }

  /**
   * Clear measurement selection
   */
  clearSelection() {
    this.state.ui.selectedMeasurementId = null;
    this.notifyListeners('SELECTION_CLEARED');
  }

  /**
   * Toggle history panel
   */
  toggleHistoryPanel() {
    this.state.ui.historyPanelOpen = !this.state.ui.historyPanelOpen;
    this.notifyListeners('HISTORY_PANEL_TOGGLED', {
      open: this.state.ui.historyPanelOpen
    });
  }

  /**
   * Toggle settings panel
   */
  toggleSettingsPanel() {
    this.state.ui.settingsPanelOpen = !this.state.ui.settingsPanelOpen;
    this.notifyListeners('SETTINGS_PANEL_TOGGLED', {
      open: this.state.ui.settingsPanelOpen
    });
  }

  /**
   * Get all projects
   * @returns {Array} Array of all projects
   */
  getAllProjects() {
    return [...this.state.projects];
  }

  /**
   * Clear all data (reset to initial state)
   */
  clearAll() {
    this.state = {
      currentProject: null,
      currentProjectId: null,
      projects: [],
      settings: this.getDefaultSettings(),
      ui: {
        selectedMeasurementId: null,
        historyPanelOpen: false,
        settingsPanelOpen: false
      }
    };

    this.notifyListeners('STATE_RESET');
  }

  /**
   * Load state from serialized data
   * @param {Object} data - Serialized state data
   */
  loadState(data) {
    try {
      // Load projects
      this.state.projects = (data.projects || []).map(p => Project.fromJSON(p));

      // Load settings
      this.state.settings = {
        ...this.getDefaultSettings(),
        ...(data.settings || {})
      };

      // Set current project if it exists
      if (data.currentProjectId) {
        this.setCurrentProject(data.currentProjectId);
      }

      this.notifyListeners('STATE_LOADED');
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  /**
   * Serialize state for storage
   * @returns {Object} Serialized state
   */
  serializeState() {
    return {
      version: '1.0.0',
      currentProjectId: this.state.currentProjectId,
      projects: this.state.projects.map(p => p.toJSON()),
      settings: this.state.settings
    };
  }
}

// Create singleton instance
export const stateManager = new StateManager();

export default StateManager;

/**
 * Persistence Manager
 * Handles localStorage operations, auto-save, and import/export
 */

import { debounce } from '../utils/calculations.js';
import { Project } from '../models/Project.js';

// localStorage keys
export const STORAGE_KEYS = {
  PROJECTS: 'landCalc_projects',
  CURRENT_PROJECT_ID: 'landCalc_currentProjectId',
  SETTINGS: 'landCalc_settings',
  UNDO_HISTORY: 'landCalc_undoHistory',
  APP_VERSION: 'landCalc_version'
};

export class PersistenceManager {
  constructor(stateManager = null, undoRedoManager = null) {
    this.stateManager = stateManager;
    this.undoRedoManager = undoRedoManager;
    this.autoSaveEnabled = true;
    this.autoSaveDelay = 2000; // 2 seconds
    this.appVersion = '1.0.0';

    // Create debounced auto-save function
    this.debouncedSave = debounce(() => {
      this.saveAll();
    }, this.autoSaveDelay);
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.error('localStorage not available:', e);
      return false;
    }
  }

  /**
   * Save all data to localStorage
   * @returns {boolean} True if saved successfully
   */
  saveAll() {
    if (!this.isLocalStorageAvailable()) {
      console.error('localStorage not available');
      return false;
    }

    try {
      // Save app version
      localStorage.setItem(STORAGE_KEYS.APP_VERSION, this.appVersion);

      // Save projects
      this.saveProjects();

      // Save current project ID
      this.saveCurrentProjectId();

      // Save settings
      this.saveSettings();

      // Save undo/redo history if manager is provided
      if (this.undoRedoManager) {
        this.saveUndoHistory();
      }

      return true;
    } catch (error) {
      console.error('Error saving data:', error);

      // Check if it's a quota exceeded error
      if (error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }

      return false;
    }
  }

  /**
   * Load all data from localStorage
   * @returns {boolean} True if loaded successfully
   */
  loadAll() {
    if (!this.isLocalStorageAvailable()) {
      console.error('localStorage not available');
      return false;
    }

    try {
      // Check app version and migrate if needed
      const storedVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
      if (storedVersion && storedVersion !== this.appVersion) {
        this.migrateData(storedVersion, this.appVersion);
      }

      // Load projects
      const projects = this.loadProjects();

      // Load settings
      const settings = this.loadSettings();

      // Load current project ID
      const currentProjectId = this.loadCurrentProjectId();

      // Load undo/redo history if manager is provided
      if (this.undoRedoManager) {
        this.loadUndoHistory();
      }

      // Update state manager if provided
      if (this.stateManager) {
        this.stateManager.loadState({
          projects,
          settings,
          currentProjectId
        });
      }

      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  }

  /**
   * Save projects to localStorage
   */
  saveProjects() {
    if (!this.stateManager) return;

    const projects = this.stateManager.getAllProjects();
    const serialized = projects.map(p => p.toJSON());

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(serialized));
  }

  /**
   * Load projects from localStorage
   * @returns {Array} Array of Project instances
   */
  loadProjects() {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);

    if (!data) return [];

    try {
      const parsed = JSON.parse(data);
      return parsed.map(p => Project.fromJSON(p));
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  /**
   * Save current project ID
   */
  saveCurrentProjectId() {
    if (!this.stateManager) return;

    const id = this.stateManager.state.currentProjectId || '';
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT_ID, id);
  }

  /**
   * Load current project ID
   * @returns {string|null} Project ID or null
   */
  loadCurrentProjectId() {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT_ID);
    return id || null;
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    if (!this.stateManager) return;

    const settings = this.stateManager.getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  /**
   * Load settings from localStorage
   * @returns {Object} Settings object
   */
  loadSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (!data) {
      return this.stateManager
        ? this.stateManager.getDefaultSettings()
        : {};
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.stateManager
        ? this.stateManager.getDefaultSettings()
        : {};
    }
  }

  /**
   * Save undo/redo history
   */
  saveUndoHistory() {
    if (!this.undoRedoManager) return;

    const serialized = this.undoRedoManager.serialize();
    localStorage.setItem(STORAGE_KEYS.UNDO_HISTORY, JSON.stringify(serialized));
  }

  /**
   * Load undo/redo history
   */
  loadUndoHistory() {
    if (!this.undoRedoManager) return;

    const data = localStorage.getItem(STORAGE_KEYS.UNDO_HISTORY);

    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      this.undoRedoManager.deserialize(parsed);
    } catch (error) {
      console.error('Error loading undo history:', error);
    }
  }

  /**
   * Schedule auto-save (debounced)
   */
  scheduleAutoSave() {
    if (!this.autoSaveEnabled) return;

    this.debouncedSave();
  }

  /**
   * Enable or disable auto-save
   * @param {boolean} enabled - Whether to enable auto-save
   */
  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled;
  }

  /**
   * Export project as JSON file
   * @param {string} projectId - ID of project to export
   */
  exportProject(projectId) {
    if (!this.stateManager) {
      console.error('StateManager not provided');
      return;
    }

    const project = this.stateManager.getProject(projectId);

    if (!project) {
      console.error('Project not found:', projectId);
      return;
    }

    const exportData = project.exportData();
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Import project from JSON file
   * @param {File} file - JSON file to import
   * @returns {Promise<Project|null>} Imported project or null
   */
  async importProject(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const project = Project.importData(data);

          if (!project) {
            reject(new Error('Failed to import project'));
            return;
          }

          // Add to state manager if provided
          if (this.stateManager) {
            this.stateManager.addProject(project);
            this.saveProjects();
          }

          resolve(project);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Export all data (all projects and settings)
   */
  exportAllData() {
    const exportData = {
      version: this.appVersion,
      exportedAt: new Date().toISOString(),
      application: 'Land Distance & Area Calculator',
      projects: this.stateManager ? this.stateManager.getAllProjects().map(p => p.toJSON()) : [],
      settings: this.stateManager ? this.stateManager.getSettings() : {}
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `land_calc_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * Import all data from backup file
   * @param {File} file - JSON backup file
   * @returns {Promise<boolean>} True if imported successfully
   */
  async importAllData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.projects || !data.version) {
            reject(new Error('Invalid backup file format'));
            return;
          }

          // Load projects
          const projects = data.projects.map(p => Project.fromJSON(p));

          // Load settings
          const settings = data.settings || {};

          // Update state manager
          if (this.stateManager) {
            this.stateManager.state.projects = projects;
            this.stateManager.updateSettings(settings);
          }

          // Save to localStorage
          this.saveAll();

          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Clear all data from localStorage
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    if (this.stateManager) {
      this.stateManager.clearAll();
    }

    if (this.undoRedoManager) {
      this.undoRedoManager.clear();
    }
  }

  /**
   * Handle localStorage quota exceeded
   */
  handleQuotaExceeded() {
    console.warn('localStorage quota exceeded');

    // Strategy: Try to free up space by removing old undo history
    localStorage.removeItem(STORAGE_KEYS.UNDO_HISTORY);

    // Show warning to user (this should be implemented in the UI layer)
    if (window.alert) {
      alert(
        'Storage quota exceeded. Undo history has been cleared. ' +
        'Consider exporting old projects and removing them to free up space.'
      );
    }
  }

  /**
   * Migrate data between versions
   * @param {string} fromVersion - Source version
   * @param {string} toVersion - Target version
   */
  migrateData(fromVersion, toVersion) {
    console.log(`Migrating data from ${fromVersion} to ${toVersion}`);

    // Add version-specific migration logic here as needed
    // For now, just update the version
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, toVersion);
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage quota and usage
   */
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      } catch (error) {
        console.error('Error getting storage info:', error);
      }
    }

    return {
      quota: null,
      usage: null,
      percentUsed: null
    };
  }
}

export default PersistenceManager;

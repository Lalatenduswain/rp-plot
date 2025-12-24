/**
 * Settings Component
 * Manages application settings
 */

export class Settings {
  constructor(stateManager, persistenceManager) {
    this.stateManager = stateManager;
    this.persistenceManager = persistenceManager;

    // Modal
    this.modal = null;

    // Form elements
    this.unitMetricRadio = document.getElementById('unitMetric');
    this.unitImperialRadio = document.getElementById('unitImperial');
    this.showGridCheckbox = document.getElementById('showGrid');
    this.showLabelsCheckbox = document.getElementById('showLabels');
    this.themeSelect = document.getElementById('themeSelect');
    this.autoSaveCheckbox = document.getElementById('autoSave');

    // Buttons
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    this.exportAllDataBtn = document.getElementById('exportAllDataBtn');
    this.importDataBtn = document.getElementById('importDataBtn');
    this.importDataFile = document.getElementById('importDataFile');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    const modalEl = document.getElementById('settingsModal');

    if (modalEl && typeof bootstrap !== 'undefined') {
      this.modal = new bootstrap.Modal(modalEl);

      // Load settings when modal is shown
      modalEl.addEventListener('show.bs.modal', () => {
        this.loadSettings();
      });
    }

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Save settings button
    if (this.saveSettingsBtn) {
      this.saveSettingsBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // Export all data
    if (this.exportAllDataBtn) {
      this.exportAllDataBtn.addEventListener('click', () => {
        this.exportAllData();
      });
    }

    // Import data
    if (this.importDataBtn) {
      this.importDataBtn.addEventListener('click', () => {
        if (this.importDataFile) {
          this.importDataFile.click();
        }
      });
    }

    if (this.importDataFile) {
      this.importDataFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importData(file);
        }
      });
    }

    // Clear all data
    if (this.clearAllDataBtn) {
      this.clearAllDataBtn.addEventListener('click', () => {
        this.clearAllData();
      });
    }

    // Theme changes
    if (this.themeSelect) {
      this.themeSelect.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
      });
    }
  }

  /**
   * Load current settings into form
   */
  loadSettings() {
    const settings = this.stateManager.getSettings();

    // Unit system
    if (this.unitMetricRadio && this.unitImperialRadio) {
      if (settings.defaultUnit === 'meters') {
        this.unitMetricRadio.checked = true;
      } else {
        this.unitImperialRadio.checked = true;
      }
    }

    // Display options
    if (this.showGridCheckbox) {
      this.showGridCheckbox.checked = settings.showGrid ?? true;
    }

    if (this.showLabelsCheckbox) {
      this.showLabelsCheckbox.checked = settings.showLabels ?? true;
    }

    // Theme
    if (this.themeSelect) {
      this.themeSelect.value = settings.theme || 'light';
    }

    // Auto-save
    if (this.autoSaveCheckbox) {
      this.autoSaveCheckbox.checked = settings.autoSave ?? true;
    }
  }

  /**
   * Save settings
   */
  saveSettings() {
    const settings = {};

    // Unit system
    if (this.unitMetricRadio && this.unitMetricRadio.checked) {
      settings.defaultUnit = 'meters';
    } else if (this.unitImperialRadio && this.unitImperialRadio.checked) {
      settings.defaultUnit = 'feet';
    }

    // Display options
    if (this.showGridCheckbox) {
      settings.showGrid = this.showGridCheckbox.checked;
    }

    if (this.showLabelsCheckbox) {
      settings.showLabels = this.showLabelsCheckbox.checked;
    }

    // Theme
    if (this.themeSelect) {
      settings.theme = this.themeSelect.value;
      this.applyTheme(settings.theme);
    }

    // Auto-save
    if (this.autoSaveCheckbox) {
      settings.autoSave = this.autoSaveCheckbox.checked;
    }

    // Update state
    this.stateManager.updateSettings(settings);

    // Save to localStorage
    this.persistenceManager.saveAll();

    // Close modal
    if (this.modal) {
      this.modal.hide();
    }

    // Show success message
    this.showNotification('Settings saved', 'success');

    // Dispatch event for canvas to update
    const event = new CustomEvent('settingsChanged', {
      detail: { settings }
    });
    window.dispatchEvent(event);
  }

  /**
   * Apply theme
   */
  applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else if (theme === 'auto') {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.removeAttribute('data-theme');
    }
  }

  /**
   * Export all data
   */
  exportAllData() {
    const projects = this.stateManager.getAllProjects();
    const settings = this.stateManager.getSettings();

    // Dispatch event to export
    const event = new CustomEvent('exportAllData', {
      detail: { projects, settings }
    });
    window.dispatchEvent(event);
  }

  /**
   * Import data from file
   */
  async importData(file) {
    try {
      const success = await this.persistenceManager.importAllData(file);

      if (success) {
        this.showNotification('Data imported successfully', 'success');

        // Reload the page to refresh everything
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Import error:', error);
      this.showNotification('Failed to import data: ' + error.message, 'error');
    }

    // Clear file input
    if (this.importDataFile) {
      this.importDataFile.value = '';
    }
  }

  /**
   * Clear all data
   */
  clearAllData() {
    const projects = this.stateManager.getAllProjects();
    const totalMeasurements = projects.reduce((sum, p) => sum + p.measurementCount, 0);

    const confirmMsg = `Clear ALL data?\n\n` +
      `This will delete:\n` +
      `- ${projects.length} project(s)\n` +
      `- ${totalMeasurements} measurement(s)\n` +
      `- All settings\n\n` +
      `This action CANNOT be undone!`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Second confirmation
    const confirmMsg2 = 'Are you absolutely sure? This will delete everything!';

    if (!confirm(confirmMsg2)) {
      return;
    }

    // Clear all data
    this.persistenceManager.clearAll();

    // Close modal
    if (this.modal) {
      this.modal.hide();
    }

    this.showNotification('All data cleared', 'info');

    // Reload page
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const event = new CustomEvent('showNotification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
}

export default Settings;

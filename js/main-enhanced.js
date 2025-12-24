/**
 * Enhanced Main Application Entry Point
 * Integrates all components for the Land Distance & Area Calculator
 */

import { StateManager } from './state/StateManager.js';
import { UndoRedoManager } from './state/UndoRedoManager.js';
import { PersistenceManager } from './state/PersistenceManager.js';
import { Project } from './models/Project.js';
import { Measurement } from './models/Measurement.js';
import { CanvasRenderer } from './components/CanvasRenderer.js';
import { ProjectSelector } from './components/ProjectSelector.js';
import { HistoryPanel } from './components/HistoryPanel.js';
import { ToastNotification } from './components/ToastNotification.js';
import { Settings } from './components/Settings.js';
import {
  parseXY,
  calculateMeasurements,
  formatTimeAgo,
  metersToFeetInches
} from './utils/calculations.js';
import {
  validateCoordinate,
  autoFormatCoordinate
} from './utils/validation.js';
import {
  exportToPDF,
  exportToExcel,
  exportToCSV,
  exportAllData
} from './utils/export.js';

/**
 * Enhanced Land Calculator Application
 */
class LandCalculatorApp {
  constructor() {
    // Initialize managers
    this.stateManager = new StateManager();
    this.undoRedoManager = new UndoRedoManager();
    this.persistenceManager = new PersistenceManager(this.stateManager, this.undoRedoManager);

    // Initialize components
    this.canvasRenderer = null;
    this.projectSelector = null;
    this.historyPanel = null;
    this.toast = null;
    this.settings = null;

    // UI state
    this.currentInputCount = { left: 2, right: 2 };
    this.lastCalculation = null;

    // Initialize the application
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Load saved data
      this.persistenceManager.loadAll();

      // If no projects exist, create a default one
      if (this.stateManager.getAllProjects().length === 0) {
        const defaultProject = new Project('Default Project', 'My first land calculation project');
        this.stateManager.addProject(defaultProject);
        this.stateManager.setCurrentProject(defaultProject.id);
        this.persistenceManager.saveAll();
      } else if (!this.stateManager.state.currentProject) {
        // Set first project as current
        const firstProject = this.stateManager.getAllProjects()[0];
        this.stateManager.setCurrentProject(firstProject.id);
      }

      // Initialize components
      this.initializeComponents();

      // Create initial input fields
      this.createInputs('left', 2);
      this.createInputs('right', 2);

      // Setup event listeners
      this.setupEventListeners();

      // Setup undo/redo keyboard shortcuts
      this.setupUndoRedoShortcuts();

      // Subscribe to state changes
      this.stateManager.subscribe(this.handleStateChange.bind(this));

      // Update UI with current state
      this.updateUI();

      // Apply saved theme
      const settings = this.stateManager.getSettings();
      if (this.settings) {
        this.settings.applyTheme(settings.theme || 'light');
      }

      console.log('✅ Enhanced Land Calculator App initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      alert('Error initializing application. Please refresh the page.');
    }
  }

  /**
   * Initialize UI components
   */
  initializeComponents() {
    // Canvas Renderer
    this.canvasRenderer = new CanvasRenderer('plotCanvas', {
      showGrid: this.stateManager.state.settings.showGrid ?? true,
      showLabels: this.stateManager.state.settings.showLabels ?? true
    });

    // Project Selector
    this.projectSelector = new ProjectSelector(this.stateManager, this.persistenceManager);

    // History Panel
    this.historyPanel = new HistoryPanel(this.stateManager, this.persistenceManager, this.canvasRenderer);

    // Toast Notifications
    this.toast = new ToastNotification();

    // Settings
    this.settings = new Settings(this.stateManager, this.persistenceManager);
  }

  /**
   * Create coordinate input fields
   */
  createInputs(side, count) {
    const container = document.getElementById(`${side}Inputs`);
    if (!container) return;

    // Save existing values before clearing
    const existingValues = [];
    const existingInputs = container.querySelectorAll('.coordinate-input');
    existingInputs.forEach(input => {
      existingValues.push(input.value);
    });

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const inputGroup = this.createInputField(side, i);
      container.appendChild(inputGroup);

      // Restore previous value if it existed
      if (i < existingValues.length && existingValues[i]) {
        const input = inputGroup.querySelector('.coordinate-input');
        if (input) {
          input.value = existingValues[i];
          // Trigger validation to show correct state
          this.validateInput(input);
        }
      }
    }

    this.currentInputCount[side] = count;
    this.updatePointCounters();
  }

  /**
   * Update point counter badges
   */
  updatePointCounters() {
    const leftCount = this.currentInputCount.left || 0;
    const rightCount = this.currentInputCount.right || 0;

    const leftBadge = document.getElementById('leftPointCount');
    const rightBadge = document.getElementById('rightPointCount');

    if (leftBadge) {
      leftBadge.textContent = leftCount;
      leftBadge.classList.toggle('pulse', leftCount > 0);
    }

    if (rightBadge) {
      rightBadge.textContent = rightCount;
      rightBadge.classList.toggle('pulse', rightCount > 0);
    }

    // Update point status in footer
    this.updatePointStatus(leftCount, rightCount);
  }

  /**
   * Update point status display and match button
   */
  updatePointStatus(leftCount, rightCount) {
    const statusDiv = document.getElementById('pointStatus');
    const matchBtn = document.getElementById('matchPointsBtn');
    const statusLeftCount = document.getElementById('statusLeftCount');
    const statusRightCount = document.getElementById('statusRightCount');

    if (!statusDiv || !matchBtn || !statusLeftCount || !statusRightCount) return;

    // Update counts
    statusLeftCount.textContent = leftCount;
    statusRightCount.textContent = rightCount;

    // Show status if either side has points
    if (leftCount > 0 || rightCount > 0) {
      statusDiv.style.display = 'block';

      // Show match button only if counts differ and both have at least 1 point
      if (leftCount !== rightCount && leftCount > 0 && rightCount > 0) {
        matchBtn.style.display = 'inline-block';

        // Update button text to show what will happen
        const difference = Math.abs(leftCount - rightCount);
        const targetSide = leftCount < rightCount ? 'left' : 'right';
        matchBtn.innerHTML = `<i class="bi bi-arrow-left-right"></i> Add ${difference} to ${targetSide}`;
      } else {
        matchBtn.style.display = 'none';
      }
    } else {
      statusDiv.style.display = 'none';
    }
  }

  /**
   * Match point counts by adding empty points to the side with fewer
   */
  matchPointCounts() {
    const leftCount = this.currentInputCount.left || 0;
    const rightCount = this.currentInputCount.right || 0;

    if (leftCount === rightCount) {
      this.toast.info('Point counts already match');
      return;
    }

    if (leftCount < rightCount) {
      // Add points to left to match right
      this.createInputs('left', rightCount);
      this.toast.success(`Added ${rightCount - leftCount} empty point(s) to Left side`);

      // Switch to left tab to fill them
      const leftTab = document.getElementById('leftTab');
      if (leftTab) leftTab.click();
    } else {
      // Add points to right to match left
      this.createInputs('right', leftCount);
      this.toast.success(`Added ${leftCount - rightCount} empty point(s) to Right side`);

      // Switch to right tab to fill them
      const rightTab = document.getElementById('rightTab');
      if (rightTab) rightTab.click();
    }
  }

  /**
   * Create a single input field
   */
  createInputField(side, index) {
    const div = document.createElement('div');
    div.className = 'coordinate-input-group';
    div.dataset.side = side;
    div.dataset.index = index;

    div.innerHTML = `
      <label class="input-label">
        Point ${index + 1}
        ${index >= 2 ? `<button class="btn-remove" type="button" aria-label="Remove point"><i class="bi bi-x"></i></button>` : ''}
      </label>
      <div class="input-wrapper">
        <input
          type="text"
          class="form-control coordinate-input"
          placeholder="e.g., 100.5, 200.75"
          id="${side}${index + 1}"
          data-side="${side}"
          data-index="${index}"
          aria-label="Point ${index + 1} coordinates"
          autocomplete="off"
        />
        <button class="btn-input-clear" type="button" tabindex="-1" title="Clear" aria-label="Clear input">
          <i class="bi bi-x-lg"></i>
        </button>
        <span class="validation-icon" aria-hidden="true">✓</span>
      </div>
      <div class="validation-message" role="alert"></div>
    `;

    // Add event listeners
    const input = div.querySelector('.coordinate-input');
    const clearBtn = div.querySelector('.btn-input-clear');
    const removeBtn = div.querySelector('.btn-remove');

    // Input validation
    input.addEventListener('input', (e) => {
      this.handleInputChange(e.target);
    });

    input.addEventListener('blur', (e) => {
      this.validateInput(e.target);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      this.validateInput(input);
    });

    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.removeInputField(side, index);
      });
    }

    return div;
  }

  /**
   * Handle input change (with auto-formatting)
   */
  handleInputChange(input) {
    const formatted = autoFormatCoordinate(input.value);
    if (formatted !== input.value) {
      const cursorPos = input.selectionStart;
      input.value = formatted;
      input.setSelectionRange(cursorPos, cursorPos);
    }

    // Real-time validation feedback
    this.validateInput(input);
  }

  /**
   * Validate input field
   */
  validateInput(input) {
    const wrapper = input.closest('.input-wrapper');
    const messageEl = wrapper.nextElementSibling;
    const validation = validateCoordinate(input.value);

    wrapper.classList.remove('is-valid', 'is-invalid');
    messageEl.textContent = '';

    if (input.value.trim() === '') {
      return;
    }

    if (validation.valid) {
      wrapper.classList.add('is-valid');
    } else {
      wrapper.classList.add('is-invalid');
      messageEl.textContent = validation.error;
    }
  }

  /**
   * Remove an input field
   */
  removeInputField(side, index) {
    const count = this.currentInputCount[side];

    if (count <= 2) {
      this.toast.warning('At least 2 points are required');
      return;
    }

    // Save existing values
    const container = document.getElementById(`${side}Inputs`);
    const existingInputs = container.querySelectorAll('.coordinate-input');
    const existingValues = [];
    existingInputs.forEach(input => {
      existingValues.push(input.value);
    });

    // Remove the value at the specified index
    existingValues.splice(index, 1);

    // Clear and recreate with one less input
    container.innerHTML = '';

    for (let i = 0; i < count - 1; i++) {
      const inputGroup = this.createInputField(side, i);
      container.appendChild(inputGroup);

      // Restore value
      if (i < existingValues.length && existingValues[i]) {
        const input = inputGroup.querySelector('.coordinate-input');
        if (input) {
          input.value = existingValues[i];
          this.validateInput(input);
        }
      }
    }

    this.currentInputCount[side] = count - 1;
    this.updatePointCounters();
  }

  /**
   * Add a new input field
   */
  addInputField(side) {
    const count = this.currentInputCount[side];

    if (count >= 10) {
      this.toast.warning('Maximum 10 points allowed');
      return;
    }

    this.createInputs(side, count + 1);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Calculate button
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.calculate());
    }

    // Clear all button
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // Add point buttons
    const addLeftBtn = document.getElementById('addLeftPointBtn');
    if (addLeftBtn) {
      addLeftBtn.addEventListener('click', () => this.addInputField('left'));
    }

    const addRightBtn = document.getElementById('addRightPointBtn');
    if (addRightBtn) {
      addRightBtn.addEventListener('click', () => this.addInputField('right'));
    }

    // Match points button
    const matchPointsBtn = document.getElementById('matchPointsBtn');
    if (matchPointsBtn) {
      matchPointsBtn.addEventListener('click', () => this.matchPointCounts());
    }

    // Undo/Redo buttons
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }

    const redoBtn = document.getElementById('redoBtn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }

    // History panel toggle
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        if (this.historyPanel) {
          this.historyPanel.toggle();
        }
      });
    }

    // Canvas zoom buttons
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (this.canvasRenderer) {
          this.canvasRenderer.setZoom(this.canvasRenderer.zoom * 1.2);
          this.redrawCanvas();
        }
      });
    }

    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (this.canvasRenderer) {
          this.canvasRenderer.setZoom(this.canvasRenderer.zoom * 0.8);
          this.redrawCanvas();
        }
      });
    }

    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => {
        if (this.canvasRenderer) {
          this.canvasRenderer.reset();
          this.redrawCanvas();
        }
      });
    }

    const downloadCanvasBtn = document.getElementById('downloadCanvasBtn');
    if (downloadCanvasBtn) {
      downloadCanvasBtn.addEventListener('click', () => {
        if (this.canvasRenderer) {
          this.canvasRenderer.exportAsImage();
          this.toast.success('Plot image downloaded');
        }
      });
    }

    // Save to history
    const saveToHistoryBtn = document.getElementById('saveToHistoryBtn');
    if (saveToHistoryBtn) {
      saveToHistoryBtn.addEventListener('click', () => this.saveToHistory());
    }

    // Export buttons
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
      exportPDFBtn.addEventListener('click', () => this.exportCurrentAsPDF());
    }

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => this.exportCurrentAsExcel());
    }

    const exportCSVBtn = document.getElementById('exportCSVBtn');
    if (exportCSVBtn) {
      exportCSVBtn.addEventListener('click', () => this.exportCurrentAsCSV());
    }

    // Custom events from components
    window.addEventListener('loadMeasurement', (e) => {
      this.loadMeasurement(e.detail.measurement);
    });

    window.addEventListener('exportMeasurement', (e) => {
      this.exportMeasurementAsPDF(e.detail.measurement);
    });

    window.addEventListener('exportAllMeasurements', (e) => {
      this.exportProjectAsExcel(e.detail.project);
    });

    window.addEventListener('exportAllData', (e) => {
      exportAllData(e.detail.projects, e.detail.settings);
      this.toast.success('Backup exported successfully');
    });

    window.addEventListener('settingsChanged', () => {
      const settings = this.stateManager.getSettings();
      if (this.canvasRenderer) {
        this.canvasRenderer.updateOptions({
          showGrid: settings.showGrid,
          showLabels: settings.showLabels
        });
        this.redrawCanvas();
      }
    });
  }

  /**
   * Setup undo/redo keyboard shortcuts
   */
  setupUndoRedoShortcuts() {
    this.undoRedoManager.setupKeyboardShortcuts(
      (state) => this.restoreState(state),
      (state) => this.restoreState(state)
    );

    // Additional keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+S: Save to history
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveToHistory();
      }

      // Ctrl+H: Toggle history
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        if (this.historyPanel) {
          this.historyPanel.toggle();
        }
      }

      // Escape: Close panels
      if (e.key === 'Escape') {
        if (this.historyPanel) {
          this.historyPanel.close();
        }
      }
    });
  }

  /**
   * Collect points from input fields
   */
  collectPoints(side) {
    const points = [];
    const inputs = document.querySelectorAll(`.coordinate-input[data-side="${side}"]`);

    inputs.forEach(input => {
      const value = input.value.trim();
      if (value) {
        const point = parseXY(value);
        if (point) {
          points.push(point);
        }
      }
    });

    return points;
  }

  /**
   * Calculate measurements
   */
  calculate() {
    // Save current state for undo
    this.saveStateForUndo();

    // Collect points
    const leftPoints = this.collectPoints('left');
    const rightPoints = this.collectPoints('right');

    // Enhanced validation with helpful messages
    const leftCount = leftPoints.length;
    const rightCount = rightPoints.length;

    // Check minimum requirements
    if (leftCount < 2 && rightCount < 2) {
      this.toast.error('Please enter at least 2 points on both Left and Right sides');
      return;
    }

    if (leftCount < 2) {
      this.toast.error(`Left side needs ${2 - leftCount} more point(s). Currently: ${leftCount}/2 minimum`);
      // Auto-switch to left tab
      const leftTab = document.getElementById('leftTab');
      if (leftTab) leftTab.click();
      return;
    }

    if (rightCount < 2) {
      this.toast.error(`Right side needs ${2 - rightCount} more point(s). Currently: ${rightCount}/2 minimum`);
      // Auto-switch to right tab
      const rightTab = document.getElementById('rightTab');
      if (rightTab) rightTab.click();
      return;
    }

    // Warn if point counts don't match (but still allow calculation)
    if (leftCount !== rightCount) {
      this.toast.warning(`Point count mismatch: Left has ${leftCount} points, Right has ${rightCount} points. Results may vary.`, 4000);
    }

    // Calculate
    const calculations = calculateMeasurements(leftPoints, rightPoints);

    // Store last calculation
    this.lastCalculation = {
      leftPoints,
      rightPoints,
      calculations
    };

    // Display results
    this.displayResults(calculations, leftPoints, rightPoints);

    // Draw plot
    if (this.canvasRenderer) {
      this.canvasRenderer.drawPlot(leftPoints, rightPoints);
    }

    // Enable export buttons
    this.enableExportButtons(true);

    // Announce to screen readers
    this.announceToScreenReader(
      `Calculation complete. Area: ${calculations.area.toFixed(0)} square feet`
    );

    // Auto-save if enabled
    if (this.stateManager.state.settings.autoSave) {
      this.saveToHistory();
    }

    this.toast.success('Calculation complete!');
  }

  /**
   * Display calculation results
   */
  displayResults(calculations, leftPoints, rightPoints) {
    const container = document.getElementById('resultsContent');
    if (!container) return;

    const { leftDistance, rightDistance, avgWidth, length, area, areaDecimal } = calculations;

    container.innerHTML = `
      <div class="result-card">
        <div class="d-flex align-items-center gap-3">
          <div class="result-icon">
            <i class="bi bi-rulers"></i>
          </div>
          <div class="result-content flex-grow-1">
            <label class="text-muted small">Left Distance</label>
            <div class="result-value">
              <span class="primary">${leftDistance.toFixed(3)} m</span>
              <span class="secondary">${metersToFeetInches(leftDistance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="result-card">
        <div class="d-flex align-items-center gap-3">
          <div class="result-icon">
            <i class="bi bi-rulers"></i>
          </div>
          <div class="result-content flex-grow-1">
            <label class="text-muted small">Right Distance</label>
            <div class="result-value">
              <span class="primary">${rightDistance.toFixed(3)} m</span>
              <span class="secondary">${metersToFeetInches(rightDistance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="result-card result-highlight">
        <div class="d-flex align-items-center gap-3">
          <div class="result-icon">
            <i class="bi bi-bounding-box"></i>
          </div>
          <div class="result-content flex-grow-1">
            <label class="text-muted small">Total Area</label>
            <div class="result-value">
              <span class="primary">${area.toFixed(2)} ft²</span>
              <span class="secondary">${areaDecimal.toFixed(3)} decimal</span>
            </div>
          </div>
        </div>
      </div>

      <div class="result-details">
        <div class="detail-row">
          <span>Average Width:</span>
          <span>${avgWidth.toFixed(2)} m</span>
        </div>
        <div class="detail-row">
          <span>Length:</span>
          <span>${length.toFixed(2)} m</span>
        </div>
        <div class="detail-row">
          <span>Points Used:</span>
          <span>Left: ${leftPoints.length}, Right: ${rightPoints.length}</span>
        </div>
      </div>
    `;
  }

  /**
   * Redraw canvas with current data
   */
  redrawCanvas() {
    if (!this.lastCalculation || !this.canvasRenderer) return;

    this.canvasRenderer.drawPlot(
      this.lastCalculation.leftPoints,
      this.lastCalculation.rightPoints
    );
  }

  /**
   * Clear all inputs
   */
  clearAll() {
    document.querySelectorAll('.coordinate-input').forEach(input => {
      input.value = '';
      const wrapper = input.closest('.input-wrapper');
      wrapper.classList.remove('is-valid', 'is-invalid');
    });

    // Clear results
    const resultsContent = document.getElementById('resultsContent');
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-calculator"></i>
          <p>Enter coordinates and click Calculate</p>
        </div>
      `;
    }

    // Clear canvas
    if (this.canvasRenderer) {
      this.canvasRenderer.clear();
    }

    // Clear last calculation
    this.lastCalculation = null;

    // Disable export buttons
    this.enableExportButtons(false);

    this.toast.info('Inputs cleared');
  }

  /**
   * Save current state for undo
   */
  saveStateForUndo() {
    const state = {
      leftInputs: this.collectInputValues('left'),
      rightInputs: this.collectInputValues('right'),
      timestamp: Date.now()
    };

    this.undoRedoManager.push(state, 'CALCULATE');
  }

  /**
   * Collect input values
   */
  collectInputValues(side) {
    const values = [];
    const inputs = document.querySelectorAll(`.coordinate-input[data-side="${side}"]`);

    inputs.forEach(input => {
      values.push(input.value);
    });

    return values;
  }

  /**
   * Restore state from undo/redo
   */
  restoreState(historyItem) {
    const state = historyItem.state;

    // Restore left inputs
    const leftInputs = document.querySelectorAll('.coordinate-input[data-side="left"]');
    state.leftInputs.forEach((value, index) => {
      if (leftInputs[index]) {
        leftInputs[index].value = value;
      }
    });

    // Restore right inputs
    const rightInputs = document.querySelectorAll('.coordinate-input[data-side="right"]');
    state.rightInputs.forEach((value, index) => {
      if (rightInputs[index]) {
        rightInputs[index].value = value;
      }
    });

    // Recalculate if there are points
    const leftPoints = this.collectPoints('left');
    const rightPoints = this.collectPoints('right');

    if (leftPoints.length >= 2 && rightPoints.length >= 2) {
      const calculations = calculateMeasurements(leftPoints, rightPoints);
      this.lastCalculation = { leftPoints, rightPoints, calculations };
      this.displayResults(calculations, leftPoints, rightPoints);

      if (this.canvasRenderer) {
        this.canvasRenderer.drawPlot(leftPoints, rightPoints);
      }
    }
  }

  /**
   * Undo last action
   */
  undo() {
    const state = this.undoRedoManager.undo();
    if (state) {
      this.restoreState(state);
      this.toast.info('Undo');
    }
  }

  /**
   * Redo last undone action
   */
  redo() {
    const state = this.undoRedoManager.redo();
    if (state) {
      this.restoreState(state);
      this.toast.info('Redo');
    }
  }

  /**
   * Save to history
   */
  saveToHistory() {
    if (!this.lastCalculation) {
      this.toast.warning('Please calculate first');
      return;
    }

    const { leftPoints, rightPoints } = this.lastCalculation;
    const measurement = new Measurement(leftPoints, rightPoints);

    this.stateManager.addMeasurement(measurement);
    this.persistenceManager.saveAll();

    this.toast.success('Saved to history');
  }

  /**
   * Load a measurement
   */
  loadMeasurement(measurement) {
    // Clear and recreate inputs
    this.createInputs('left', measurement.leftPoints.length);
    this.createInputs('right', measurement.rightPoints.length);

    // Fill in values
    measurement.leftPoints.forEach((point, index) => {
      const input = document.getElementById(`left${index + 1}`);
      if (input) {
        input.value = `${point.x}, ${point.y}`;
      }
    });

    measurement.rightPoints.forEach((point, index) => {
      const input = document.getElementById(`right${index + 1}`);
      if (input) {
        input.value = `${point.x}, ${point.y}`;
      }
    });

    // Calculate
    this.calculate();

    this.toast.success('Measurement loaded');
  }

  /**
   * Export current measurement as PDF
   */
  exportCurrentAsPDF() {
    if (!this.lastCalculation) {
      this.toast.warning('Please calculate first');
      return;
    }

    const measurement = new Measurement(
      this.lastCalculation.leftPoints,
      this.lastCalculation.rightPoints
    );

    this.exportMeasurementAsPDF(measurement);
  }

  /**
   * Export a measurement as PDF
   */
  exportMeasurementAsPDF(measurement) {
    const canvasDataURL = this.canvasRenderer ? this.canvasRenderer.toDataURL() : null;
    const projectInfo = this.stateManager.state.currentProject || {};

    exportToPDF(measurement, canvasDataURL, projectInfo);
    this.toast.success('PDF exported successfully');
  }

  /**
   * Export current as Excel
   */
  exportCurrentAsExcel() {
    if (!this.lastCalculation) {
      this.toast.warning('Please calculate first');
      return;
    }

    const measurement = new Measurement(
      this.lastCalculation.leftPoints,
      this.lastCalculation.rightPoints
    );

    const projectInfo = this.stateManager.state.currentProject || {};
    exportToExcel([measurement], projectInfo);
    this.toast.success('Excel exported successfully');
  }

  /**
   * Export project as Excel
   */
  exportProjectAsExcel(project) {
    exportToExcel(project.measurements, { name: project.name });
    this.toast.success('Excel exported successfully');
  }

  /**
   * Export current as CSV
   */
  exportCurrentAsCSV() {
    if (!this.lastCalculation) {
      this.toast.warning('Please calculate first');
      return;
    }

    const measurement = new Measurement(
      this.lastCalculation.leftPoints,
      this.lastCalculation.rightPoints
    );

    exportToCSV(measurement);
    this.toast.success('CSV exported successfully');
  }

  /**
   * Enable/disable export buttons
   */
  enableExportButtons(enabled) {
    const buttons = [
      document.getElementById('exportPDFBtn'),
      document.getElementById('exportExcelBtn'),
      document.getElementById('exportCSVBtn')
    ];

    buttons.forEach(btn => {
      if (btn) {
        btn.disabled = !enabled;
      }
    });
  }

  /**
   * Handle state changes
   */
  handleStateChange({ state, action, payload }) {
    // Update undo/redo button states
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) undoBtn.disabled = !this.undoRedoManager.canUndo();
    if (redoBtn) redoBtn.disabled = !this.undoRedoManager.canRedo();
  }

  /**
   * Update UI
   */
  updateUI() {
    this.handleStateChange({
      state: this.stateManager.getState(),
      action: 'INIT',
      payload: null
    });
  }

  /**
   * Announce to screen reader
   */
  announceToScreenReader(message) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.landCalculatorApp = new LandCalculatorApp();
});

// Export for debugging
export { LandCalculatorApp };

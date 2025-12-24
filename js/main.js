/**
 * Main Application Entry Point
 * Initializes the Land Distance & Area Calculator
 */

import { StateManager } from './state/StateManager.js';
import { UndoRedoManager } from './state/UndoRedoManager.js';
import { PersistenceManager } from './state/PersistenceManager.js';
import { Project } from './models/Project.js';
import { Measurement } from './models/Measurement.js';
import {
  parseXY,
  dist,
  metersToFeetInches,
  sqftToDecimal,
  calculateMeasurements,
  formatTimeAgo
} from './utils/calculations.js';
import {
  validateCoordinate,
  autoFormatCoordinate,
  sanitizeInput
} from './utils/validation.js';

/**
 * Main Application Class
 */
class LandCalculatorApp {
  constructor() {
    // Initialize managers
    this.stateManager = new StateManager();
    this.undoRedoManager = new UndoRedoManager();
    this.persistenceManager = new PersistenceManager(this.stateManager, this.undoRedoManager);

    // UI state
    this.currentInputCount = { left: 2, right: 2 };
    this.canvasZoom = 1;
    this.canvasPan = { x: 0, y: 0 };

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

      console.log('✅ Land Calculator App initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      this.showNotification('Error initializing application', 'error');
    }
  }

  /**
   * Create coordinate input fields
   */
  createInputs(side, count) {
    const container = document.getElementById(`${side}Inputs`);
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const inputGroup = this.createInputField(side, i);
      container.appendChild(inputGroup);
    }

    this.currentInputCount[side] = count;
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
      // Empty is okay
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
    const container = document.getElementById(`${side}Inputs`);
    const count = this.currentInputCount[side];

    if (count <= 2) {
      this.showNotification('At least 2 points are required', 'warning');
      return;
    }

    // Recreate inputs with one less
    this.createInputs(side, count - 1);
  }

  /**
   * Add a new input field
   */
  addInputField(side) {
    const count = this.currentInputCount[side];

    if (count >= 10) {
      this.showNotification('Maximum 10 points allowed', 'warning');
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
      historyBtn.addEventListener('click', () => this.toggleHistoryPanel());
    }

    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => this.toggleHistoryPanel());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }

    // Help button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.openHelp());
    }

    // New project button
    const newProjectBtn = document.getElementById('newProjectBtn');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', () => this.openNewProjectModal());
    }

    // Canvas zoom buttons
    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomCanvas(1.2));
    }

    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomCanvas(0.8));
    }

    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
      resetZoomBtn.addEventListener('click', () => this.resetCanvasView());
    }

    // Save to history
    const saveToHistoryBtn = document.getElementById('saveToHistoryBtn');
    if (saveToHistoryBtn) {
      saveToHistoryBtn.addEventListener('click', () => this.saveToHistory());
    }
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
        this.toggleHistoryPanel();
      }

      // Escape: Close panels/modals
      if (e.key === 'Escape') {
        this.closeAllPanels();
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

    // Validate
    if (leftPoints.length < 2 || rightPoints.length < 2) {
      this.showNotification('Please enter at least 2 points on each side', 'warning');
      return;
    }

    // Calculate
    const calculations = calculateMeasurements(leftPoints, rightPoints);

    // Display results
    this.displayResults(calculations, leftPoints, rightPoints);

    // Draw plot
    this.drawPlot(leftPoints, rightPoints);

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
   * Draw plot on canvas
   */
  drawPlot(leftPoints, rightPoints) {
    const canvas = document.getElementById('plotCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size to container
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    canvas.width = Math.min(800, rect.width - 32);
    canvas.height = Math.min(600, rect.height - 32);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (leftPoints.length < 2 || rightPoints.length < 2) return;

    // Calculate bounds
    const allPoints = [...leftPoints, ...rightPoints];
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));

    // Calculate scale
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
    const scaleY = (canvas.height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY) * this.canvasZoom;

    // Map function
    const map = (p) => ({
      x: padding + (p.x - minX) * scale + this.canvasPan.x,
      y: canvas.height - (padding + (p.y - minY) * scale) + this.canvasPan.y
    });

    // Draw grid if enabled
    if (this.stateManager.state.settings.showGrid) {
      this.drawGrid(ctx, canvas.width, canvas.height);
    }

    // Map points
    const l1 = map(leftPoints[0]);
    const l2 = map(leftPoints[1]);
    const r1 = map(rightPoints[0]);
    const r2 = map(rightPoints[1]);

    // Draw left line (blue)
    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(l1.x, l1.y);
    ctx.lineTo(l2.x, l2.y);
    ctx.stroke();

    // Draw right line (green)
    ctx.strokeStyle = '#198754';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y);
    ctx.lineTo(r2.x, r2.y);
    ctx.stroke();

    // Connect top and bottom (gray)
    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(l1.x, l1.y);
    ctx.lineTo(r1.x, r1.y);
    ctx.moveTo(l2.x, l2.y);
    ctx.lineTo(r2.x, r2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    [l1, l2, r1, r2].forEach((point, idx) => {
      ctx.fillStyle = idx < 2 ? '#0d6efd' : '#198754';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw labels if enabled
    if (this.stateManager.state.settings.showLabels) {
      this.drawLabels(ctx, l1, l2, r1, r2);
    }
  }

  /**
   * Draw grid on canvas
   */
  drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;

    const gridSize = 50;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  /**
   * Draw labels on canvas
   */
  drawLabels(ctx, l1, l2, r1, r2) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#212529';

    // Point labels
    ctx.fillText('L1', l1.x + 10, l1.y - 10);
    ctx.fillText('L2', l2.x + 10, l2.y + 20);
    ctx.fillText('R1', r1.x - 30, r1.y - 10);
    ctx.fillText('R2', r2.x - 30, r2.y + 20);
  }

  /**
   * Zoom canvas
   */
  zoomCanvas(factor) {
    this.canvasZoom *= factor;
    this.canvasZoom = Math.max(0.5, Math.min(3, this.canvasZoom));

    // Redraw
    const leftPoints = this.collectPoints('left');
    const rightPoints = this.collectPoints('right');
    if (leftPoints.length >= 2 && rightPoints.length >= 2) {
      this.drawPlot(leftPoints, rightPoints);
    }
  }

  /**
   * Reset canvas view
   */
  resetCanvasView() {
    this.canvasZoom = 1;
    this.canvasPan = { x: 0, y: 0 };

    const leftPoints = this.collectPoints('left');
    const rightPoints = this.collectPoints('right');
    if (leftPoints.length >= 2 && rightPoints.length >= 2) {
      this.drawPlot(leftPoints, rightPoints);
    }
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
    const canvas = document.getElementById('plotCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Disable export buttons
    this.enableExportButtons(false);
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
      this.displayResults(calculations, leftPoints, rightPoints);
      this.drawPlot(leftPoints, rightPoints);
    }
  }

  /**
   * Undo last action
   */
  undo() {
    const state = this.undoRedoManager.undo();
    if (state) {
      this.restoreState(state);
      this.showNotification('Undo', 'success');
    }
  }

  /**
   * Redo last undone action
   */
  redo() {
    const state = this.undoRedoManager.redo();
    if (state) {
      this.restoreState(state);
      this.showNotification('Redo', 'success');
    }
  }

  /**
   * Save to history
   */
  saveToHistory() {
    const leftPoints = this.collectPoints('left');
    const rightPoints = this.collectPoints('right');

    if (leftPoints.length < 2 || rightPoints.length < 2) {
      this.showNotification('Please calculate first', 'warning');
      return;
    }

    const measurement = new Measurement(leftPoints, rightPoints);
    this.stateManager.addMeasurement(measurement);
    this.persistenceManager.saveAll();

    this.showNotification('Saved to history', 'success');
    this.updateHistoryPanel();
  }

  /**
   * Toggle history panel
   */
  toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    if (panel) {
      panel.classList.toggle('open');
      this.updateHistoryPanel();
    }
  }

  /**
   * Update history panel
   */
  updateHistoryPanel() {
    const container = document.getElementById('historyList');
    if (!container) return;

    const project = this.stateManager.state.currentProject;

    if (!project || project.measurements.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-inbox"></i>
          <p>No measurements yet</p>
          <small>Calculations will appear here</small>
        </div>
      `;
      return;
    }

    // Render measurements (most recent first)
    const measurements = [...project.measurements].reverse();
    container.innerHTML = measurements.map(m => this.renderHistoryItem(m)).join('');

    // Add event listeners
    container.querySelectorAll('[data-action="load"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.history-item').dataset.id;
        this.loadMeasurement(id);
      });
    });
  }

  /**
   * Render a history item
   */
  renderHistoryItem(measurement) {
    const timeAgo = formatTimeAgo(measurement.timestamp);
    const { leftDistance, rightDistance, area } = measurement.calculations;

    return `
      <div class="history-item" data-id="${measurement.id}">
        <div class="history-header">
          <span class="history-time">${timeAgo}</span>
        </div>
        <div class="history-body">
          <div class="history-stats">
            <div class="stat">
              <label>Area:</label>
              <span>${area.toFixed(0)} ft²</span>
            </div>
            <div class="stat">
              <label>Left:</label>
              <span>${leftDistance.toFixed(1)} m</span>
            </div>
            <div class="stat">
              <label>Right:</label>
              <span>${rightDistance.toFixed(1)} m</span>
            </div>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn btn-sm btn-primary" data-action="load">
            <i class="bi bi-box-arrow-in-down"></i> Load
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Load a measurement from history
   */
  loadMeasurement(measurementId) {
    const measurement = this.stateManager.getMeasurement(measurementId);
    if (!measurement) return;

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

    // Close history panel
    this.toggleHistoryPanel();

    this.showNotification('Measurement loaded', 'success');
  }

  /**
   * Open settings modal
   */
  openSettings() {
    const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
    modal.show();
  }

  /**
   * Open help modal
   */
  openHelp() {
    const modal = new bootstrap.Modal(document.getElementById('helpModal'));
    modal.show();
  }

  /**
   * Open new project modal
   */
  openNewProjectModal() {
    const modal = new bootstrap.Modal(document.getElementById('newProjectModal'));
    modal.show();
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

    // Update project name display
    if (state.currentProject) {
      const nameEl = document.getElementById('currentProjectName');
      if (nameEl) {
        nameEl.textContent = state.currentProject.name;
      }
    }
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
   * Close all panels
   */
  closeAllPanels() {
    const historyPanel = document.getElementById('historyPanel');
    if (historyPanel) {
      historyPanel.classList.remove('open');
    }
  }

  /**
   * Show notification/toast
   */
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Implement visual toast notifications
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

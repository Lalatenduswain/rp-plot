/**
 * History Panel Component
 * Displays and manages measurement history
 */

import { formatTimeAgo } from '../utils/calculations.js';
import { CanvasRenderer } from './CanvasRenderer.js';

export class HistoryPanel {
  constructor(stateManager, persistenceManager, canvasRenderer) {
    this.stateManager = stateManager;
    this.persistenceManager = persistenceManager;
    this.canvasRenderer = canvasRenderer;

    // DOM elements
    this.panel = document.getElementById('historyPanel');
    this.historyList = document.getElementById('historyList');
    this.searchInput = document.getElementById('historySearch');
    this.closeBtn = document.getElementById('closeHistoryBtn');
    this.clearAllBtn = document.getElementById('clearHistoryBtn');
    this.exportAllBtn = document.getElementById('exportAllBtn');

    // State
    this.isOpen = false;
    this.searchTerm = '';

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    if (!this.panel) return;

    this.setupEventListeners();
    this.render();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close button
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Clear all button
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // Export all button
    if (this.exportAllBtn) {
      this.exportAllBtn.addEventListener('click', () => this.exportAll());
    }

    // Subscribe to state changes
    this.stateManager.subscribe((update) => {
      if (update.action === 'MEASUREMENT_ADDED' ||
          update.action === 'MEASUREMENT_REMOVED' ||
          update.action === 'PROJECT_CHANGED') {
        this.render();
      }
    });

    // Listen for history toggle events
    window.addEventListener('toggleHistory', () => this.toggle());
  }

  /**
   * Toggle panel
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open panel
   */
  open() {
    if (!this.panel) return;

    this.isOpen = true;
    this.panel.classList.add('open');
    this.render();

    // Focus search input
    if (this.searchInput) {
      setTimeout(() => this.searchInput.focus(), 300);
    }
  }

  /**
   * Close panel
   */
  close() {
    if (!this.panel) return;

    this.isOpen = false;
    this.panel.classList.remove('open');
  }

  /**
   * Render component
   */
  render() {
    if (!this.historyList) return;

    const project = this.stateManager.state.currentProject;

    if (!project || project.measurements.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Filter measurements
    let measurements = [...project.measurements];

    if (this.searchTerm) {
      measurements = measurements.filter(m => {
        const searchStr = `${m.name || ''} ${m.notes || ''} ${m.calculations.area || ''}`.toLowerCase();
        return searchStr.includes(this.searchTerm);
      });
    }

    // Sort by timestamp (most recent first)
    measurements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (measurements.length === 0) {
      this.historyList.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-search"></i>
          <p>No measurements found</p>
          <small>Try a different search term</small>
        </div>
      `;
      return;
    }

    // Render measurements
    this.historyList.innerHTML = measurements.map(m => this.renderHistoryItem(m)).join('');

    // Attach event listeners
    this.attachItemEventListeners();
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    this.historyList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>No measurements yet</p>
        <small>Calculations will appear here</small>
      </div>
    `;
  }

  /**
   * Render a single history item
   */
  renderHistoryItem(measurement) {
    const timeAgo = formatTimeAgo(measurement.timestamp);
    const { leftDistance, rightDistance, area, areaDecimal } = measurement.calculations;

    // Generate thumbnail (placeholder for now - actual thumbnail would be generated)
    const thumbnailId = `thumb-${measurement.id}`;

    return `
      <div class="history-item" data-id="${measurement.id}">
        <div class="history-header">
          <span class="history-time">${timeAgo}</span>
          <button class="btn-icon btn-sm" data-action="menu" title="More options">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
        </div>

        <div class="history-body">
          <canvas
            class="history-thumbnail"
            id="${thumbnailId}"
            width="100"
            height="80"
            data-left='${JSON.stringify(measurement.leftPoints)}'
            data-right='${JSON.stringify(measurement.rightPoints)}'>
          </canvas>

          <div class="history-stats">
            <div class="stat">
              <label>Area:</label>
              <span>${area.toFixed(0)} ft² (${areaDecimal.toFixed(3)} decimal)</span>
            </div>
            <div class="stat">
              <label>Left:</label>
              <span>${leftDistance.toFixed(1)} m</span>
            </div>
            <div class="stat">
              <label>Right:</label>
              <span>${rightDistance.toFixed(1)} m</span>
            </div>
            <div class="stat">
              <label>Points:</label>
              <span>L:${measurement.leftPoints.length}, R:${measurement.rightPoints.length}</span>
            </div>
          </div>
        </div>

        <div class="history-actions">
          <button class="btn btn-sm btn-primary" data-action="load" title="Load this measurement">
            <i class="bi bi-box-arrow-in-down"></i> Load
          </button>
          <button class="btn btn-sm btn-outline-secondary" data-action="export" title="Export as PDF">
            <i class="bi bi-file-earmark-pdf"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to history items
   */
  attachItemEventListeners() {
    // Load buttons
    this.historyList.querySelectorAll('[data-action="load"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.history-item').dataset.id;
        this.loadMeasurement(id);
      });
    });

    // Export buttons
    this.historyList.querySelectorAll('[data-action="export"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.history-item').dataset.id;
        this.exportMeasurement(id);
      });
    });

    // Delete buttons
    this.historyList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.history-item').dataset.id;
        this.deleteMeasurement(id);
      });
    });

    // Draw thumbnails using Intersection Observer (lazy loading)
    this.drawThumbnails();
  }

  /**
   * Draw thumbnails for visible items
   */
  drawThumbnails() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const canvas = entry.target;
          const leftPoints = JSON.parse(canvas.dataset.left);
          const rightPoints = JSON.parse(canvas.dataset.right);

          // Create a temporary renderer for the thumbnail
          const thumbRenderer = new CanvasRenderer(canvas.id, {
            showGrid: false,
            showLabels: false,
            padding: 10,
            pointRadius: 3,
            lineWidth: 2
          });

          thumbRenderer.drawPlot(leftPoints, rightPoints);

          // Stop observing this canvas
          observer.unobserve(canvas);
        }
      });
    });

    // Observe all thumbnail canvases
    this.historyList.querySelectorAll('.history-thumbnail').forEach(canvas => {
      observer.observe(canvas);
    });
  }

  /**
   * Load a measurement
   */
  loadMeasurement(measurementId) {
    const measurement = this.stateManager.getMeasurement(measurementId);

    if (!measurement) {
      console.error('Measurement not found:', measurementId);
      return;
    }

    // Dispatch event to load measurement
    const event = new CustomEvent('loadMeasurement', {
      detail: { measurement }
    });
    window.dispatchEvent(event);

    // Close panel
    this.close();

    // Show notification
    this.showNotification('Measurement loaded', 'success');
  }

  /**
   * Export a single measurement
   */
  exportMeasurement(measurementId) {
    const measurement = this.stateManager.getMeasurement(measurementId);

    if (!measurement) return;

    // Dispatch event to export measurement
    const event = new CustomEvent('exportMeasurement', {
      detail: { measurement }
    });
    window.dispatchEvent(event);
  }

  /**
   * Delete a measurement
   */
  deleteMeasurement(measurementId) {
    const measurement = this.stateManager.getMeasurement(measurementId);

    if (!measurement) return;

    // Confirm deletion
    const confirmMsg = `Delete this measurement?\n\nArea: ${measurement.calculations.area.toFixed(0)} ft²`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Delete measurement
    const success = this.stateManager.removeMeasurement(measurementId);

    if (success) {
      // Save
      this.persistenceManager.saveAll();

      // Re-render
      this.render();

      // Show notification
      this.showNotification('Measurement deleted', 'success');
    }
  }

  /**
   * Clear all measurements
   */
  clearAll() {
    const project = this.stateManager.state.currentProject;

    if (!project || project.measurements.length === 0) {
      return;
    }

    // Confirm
    const confirmMsg = `Delete all ${project.measurements.length} measurements from "${project.name}"?\n\nThis cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Clear all measurements
    project.measurements = [];
    project.updatedAt = new Date().toISOString();

    // Save
    this.persistenceManager.saveAll();

    // Re-render
    this.render();

    // Show notification
    this.showNotification('All measurements cleared', 'success');
  }

  /**
   * Export all measurements
   */
  exportAll() {
    const project = this.stateManager.state.currentProject;

    if (!project || project.measurements.length === 0) {
      this.showNotification('No measurements to export', 'warning');
      return;
    }

    // Dispatch event to export all
    const event = new CustomEvent('exportAllMeasurements', {
      detail: { project }
    });
    window.dispatchEvent(event);
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

export default HistoryPanel;

/**
 * Canvas Renderer Component
 * Handles enhanced plot visualization with zoom, pan, and labels
 */

export class CanvasRenderer {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Options
    this.options = {
      showGrid: options.showGrid ?? true,
      showLabels: options.showLabels ?? true,
      showCoordinates: options.showCoordinates ?? false,
      padding: options.padding ?? 40,
      pointRadius: options.pointRadius ?? 6,
      lineWidth: options.lineWidth ?? 3,
      ...options
    };

    // Zoom and pan state
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };

    // Colors
    this.colors = {
      leftLine: '#0d6efd',
      rightLine: '#198754',
      connectLine: '#6c757d',
      grid: '#e9ecef',
      background: '#ffffff',
      text: '#212529'
    };

    this.init();
  }

  /**
   * Initialize canvas
   */
  init() {
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Set up high-DPI support
    this.setupHighDPI();

    // Resize observer
    this.setupResizeObserver();
  }

  /**
   * Setup high-DPI (retina) display support
   */
  setupHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.ctx.scale(dpr, dpr);
  }

  /**
   * Setup resize observer
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) return;

    const resizeObserver = new ResizeObserver(() => {
      this.setupHighDPI();
    });

    resizeObserver.observe(this.canvas.parentElement);
  }

  /**
   * Draw plot with left and right points
   * @param {Array} leftPoints - Array of {x, y} points
   * @param {Array} rightPoints - Array of {x, y} points
   */
  drawPlot(leftPoints, rightPoints) {
    if (!this.ctx || leftPoints.length < 2 || rightPoints.length < 2) {
      this.clear();
      return;
    }

    // Clear canvas
    this.clear();

    // Calculate bounds and scale
    const bounds = this.calculateBounds(leftPoints, rightPoints);
    const scale = this.calculateScale(bounds);

    // Map function
    const map = (p) => this.mapPoint(p, bounds, scale);

    // Draw grid
    if (this.options.showGrid) {
      this.drawGrid();
    }

    // Map all points
    const mappedLeft = leftPoints.map(map);
    const mappedRight = rightPoints.map(map);

    // Draw connecting lines
    this.drawConnectingLines(mappedLeft, mappedRight);

    // Draw main lines
    this.drawLine(mappedLeft, this.colors.leftLine, 'Left');
    this.drawLine(mappedRight, this.colors.rightLine, 'Right');

    // Draw points
    this.drawPoints(mappedLeft, this.colors.leftLine);
    this.drawPoints(mappedRight, this.colors.rightLine);

    // Draw labels
    if (this.options.showLabels) {
      this.drawPointLabels(mappedLeft, 'L');
      this.drawPointLabels(mappedRight, 'R');
    }

    // Draw coordinates if enabled
    if (this.options.showCoordinates) {
      this.drawCoordinates(leftPoints, mappedLeft);
      this.drawCoordinates(rightPoints, mappedRight);
    }
  }

  /**
   * Draw thumbnail version of plot
   * @param {Array} leftPoints - Left side points
   * @param {Array} rightPoints - Right side points
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @returns {string} Data URL of thumbnail
   */
  drawThumbnail(leftPoints, rightPoints, width = 100, height = 80) {
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (leftPoints.length < 2 || rightPoints.length < 2) {
      return tempCanvas.toDataURL();
    }

    // Calculate bounds
    const allPoints = [...leftPoints, ...rightPoints];
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));

    // Calculate scale
    const padding = 10;
    const scaleX = (width - padding * 2) / (maxX - minX || 1);
    const scaleY = (height - padding * 2) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    // Map function
    const map = (p) => ({
      x: padding + (p.x - minX) * scale,
      y: height - (padding + (p.y - minY) * scale)
    });

    // Map points
    const l1 = map(leftPoints[0]);
    const l2 = map(leftPoints[1]);
    const r1 = map(rightPoints[0]);
    const r2 = map(rightPoints[1]);

    // Fill background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, width, height);

    // Draw left line
    tempCtx.strokeStyle = this.colors.leftLine;
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.moveTo(l1.x, l1.y);
    tempCtx.lineTo(l2.x, l2.y);
    tempCtx.stroke();

    // Draw right line
    tempCtx.strokeStyle = this.colors.rightLine;
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.moveTo(r1.x, r1.y);
    tempCtx.lineTo(r2.x, r2.y);
    tempCtx.stroke();

    // Draw connecting lines
    tempCtx.strokeStyle = this.colors.connectLine;
    tempCtx.lineWidth = 1;
    tempCtx.setLineDash([3, 3]);
    tempCtx.beginPath();
    tempCtx.moveTo(l1.x, l1.y);
    tempCtx.lineTo(r1.x, r1.y);
    tempCtx.moveTo(l2.x, l2.y);
    tempCtx.lineTo(r2.x, r2.y);
    tempCtx.stroke();
    tempCtx.setLineDash([]);

    // Draw points
    [l1, l2, r1, r2].forEach((point, idx) => {
      tempCtx.fillStyle = idx < 2 ? this.colors.leftLine : this.colors.rightLine;
      tempCtx.beginPath();
      tempCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      tempCtx.fill();
    });

    return tempCanvas.toDataURL();
  }

  /**
   * Calculate bounds of all points
   */
  calculateBounds(leftPoints, rightPoints) {
    const allPoints = [...leftPoints, ...rightPoints];

    return {
      minX: Math.min(...allPoints.map(p => p.x)),
      maxX: Math.max(...allPoints.map(p => p.x)),
      minY: Math.min(...allPoints.map(p => p.y)),
      maxY: Math.max(...allPoints.map(p => p.y))
    };
  }

  /**
   * Calculate scale factor
   */
  calculateScale(bounds) {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const scaleX = (width - this.options.padding * 2) / (bounds.maxX - bounds.minX || 1);
    const scaleY = (height - this.options.padding * 2) / (bounds.maxY - bounds.minY || 1);

    return Math.min(scaleX, scaleY) * this.zoom;
  }

  /**
   * Map point from data coordinates to canvas coordinates
   */
  mapPoint(point, bounds, scale) {
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: this.options.padding + (point.x - bounds.minX) * scale + this.pan.x,
      y: rect.height - (this.options.padding + (point.y - bounds.minY) * scale) + this.pan.y
    };
  }

  /**
   * Draw grid
   */
  drawGrid() {
    const rect = this.canvas.getBoundingClientRect();
    const gridSize = 50;

    this.ctx.save();
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < rect.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, rect.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < rect.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(rect.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * Draw a line through points
   */
  drawLine(points, color, label) {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Draw connecting lines between left and right
   */
  drawConnectingLines(leftPoints, rightPoints) {
    if (leftPoints.length < 2 || rightPoints.length < 2) return;

    this.ctx.save();
    this.ctx.strokeStyle = this.colors.connectLine;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    // Connect first points
    this.ctx.beginPath();
    this.ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
    this.ctx.lineTo(rightPoints[0].x, rightPoints[0].y);
    this.ctx.stroke();

    // Connect second points
    this.ctx.beginPath();
    this.ctx.moveTo(leftPoints[1].x, leftPoints[1].y);
    this.ctx.lineTo(rightPoints[1].x, rightPoints[1].y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  /**
   * Draw points
   */
  drawPoints(points, color) {
    this.ctx.save();

    points.forEach(point => {
      // Draw point
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, this.options.pointRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw white border
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  /**
   * Draw point labels
   */
  drawPointLabels(points, prefix) {
    this.ctx.save();
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = this.colors.text;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    points.forEach((point, index) => {
      const label = `${prefix}${index + 1}`;
      const offsetX = index === 0 ? -15 : 15;
      const offsetY = index === 0 ? -15 : 15;

      // Draw background
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const metrics = this.ctx.measureText(label);
      const width = metrics.width + 8;
      const height = 20;
      this.ctx.fillRect(
        point.x + offsetX - width / 2,
        point.y + offsetY - height / 2,
        width,
        height
      );

      // Draw text
      this.ctx.fillStyle = this.colors.text;
      this.ctx.fillText(label, point.x + offsetX, point.y + offsetY);
    });

    this.ctx.restore();
  }

  /**
   * Draw coordinates
   */
  drawCoordinates(originalPoints, mappedPoints) {
    this.ctx.save();
    this.ctx.font = '10px monospace';
    this.ctx.fillStyle = this.colors.text;

    mappedPoints.forEach((point, index) => {
      const orig = originalPoints[index];
      const text = `(${orig.x}, ${orig.y})`;

      this.ctx.fillText(text, point.x + 10, point.y - 20);
    });

    this.ctx.restore();
  }

  /**
   * Clear canvas
   */
  clear() {
    if (!this.ctx) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  /**
   * Zoom in/out
   */
  setZoom(zoom) {
    this.zoom = Math.max(0.5, Math.min(3, zoom));
  }

  /**
   * Set pan offset
   */
  setPan(x, y) {
    this.pan = { x, y };
  }

  /**
   * Reset zoom and pan
   */
  reset() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  /**
   * Export canvas as image
   */
  exportAsImage(filename = 'plot.png') {
    if (!this.canvas) return;

    const url = this.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Get canvas as data URL
   */
  toDataURL() {
    return this.canvas ? this.canvas.toDataURL() : null;
  }

  /**
   * Update options
   */
  updateOptions(options) {
    this.options = { ...this.options, ...options };
  }
}

export default CanvasRenderer;

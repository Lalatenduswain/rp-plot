/**
 * Toast Notification Component
 * Displays temporary notification messages
 */

export class ToastNotification {
  constructor() {
    this.container = null;
    this.activeToasts = new Map();
    this.defaultDuration = 3000; // 3 seconds

    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    // Create container if it doesn't exist
    this.container = document.getElementById('toast-container');

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }

    // Listen for custom events
    window.addEventListener('showNotification', (e) => {
      this.show(e.detail.message, e.detail.type, e.detail.duration);
    });
  }

  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
   */
  show(message, type = 'info', duration = this.defaultDuration) {
    const id = Date.now() + Math.random();
    const toast = this.createToast(id, message, type);

    // Add to container
    this.container.appendChild(toast);
    this.activeToasts.set(id, toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Create a toast element
   */
  createToast(id, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.dataset.toastId = id;

    // Icon based on type
    const icons = {
      success: 'check-circle-fill',
      error: 'x-circle-fill',
      warning: 'exclamation-triangle-fill',
      info: 'info-circle-fill'
    };

    const icon = icons[type] || icons.info;

    toast.innerHTML = `
      <div class="toast-content">
        <i class="bi bi-${icon} toast-icon"></i>
        <span class="toast-message">${this.escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Close">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.dismiss(id);
    });

    return toast;
  }

  /**
   * Dismiss a toast
   */
  dismiss(id) {
    const toast = this.activeToasts.get(id);

    if (!toast) return;

    // Remove show class to trigger exit animation
    toast.classList.remove('show');
    toast.classList.add('hide');

    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToasts.delete(id);
    }, 300);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.activeToasts.forEach((_, id) => {
      this.dismiss(id);
    });
  }

  /**
   * Show success toast
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error toast
   */
  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show warning toast
   */
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show info toast
   */
  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
export const toast = new ToastNotification();

export default ToastNotification;

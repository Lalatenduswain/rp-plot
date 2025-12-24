/**
 * Undo/Redo Manager
 * Manages history stack for undo/redo operations
 */

export class UndoRedoManager {
  constructor(maxHistory = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
    this.listeners = [];
    this.isEnabled = true;
  }

  /**
   * Subscribe to undo/redo state changes
   * @param {Function} listener - Callback function
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
   * Notify listeners of state changes
   */
  notifyListeners() {
    const state = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      historyLength: this.history.length,
      currentIndex: this.currentIndex
    };

    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in undo/redo listener:', error);
      }
    });
  }

  /**
   * Push a new state to history
   * @param {Object} state - State snapshot to save
   * @param {string} action - Action description
   */
  push(state, action = 'UPDATE') {
    if (!this.isEnabled) return;

    // Remove any states after current index (we're creating a new branch)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Create deep copy of state to prevent mutations
    const stateCopy = JSON.parse(JSON.stringify(state));

    // Add new state to history
    this.history.push({
      state: stateCopy,
      action,
      timestamp: Date.now()
    });

    // Limit history size (remove oldest if exceeded)
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }

    this.notifyListeners();
  }

  /**
   * Undo to previous state
   * @returns {Object|null} Previous state or null if can't undo
   */
  undo() {
    if (!this.canUndo()) {
      return null;
    }

    this.currentIndex--;
    const historyItem = this.history[this.currentIndex];
    this.notifyListeners();

    return {
      state: historyItem.state,
      action: historyItem.action,
      timestamp: historyItem.timestamp
    };
  }

  /**
   * Redo to next state
   * @returns {Object|null} Next state or null if can't redo
   */
  redo() {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    const historyItem = this.history[this.currentIndex];
    this.notifyListeners();

    return {
      state: historyItem.state,
      action: historyItem.action,
      timestamp: historyItem.timestamp
    };
  }

  /**
   * Check if undo is possible
   * @returns {boolean} True if can undo
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is possible
   * @returns {boolean} True if can redo
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Clear all history
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  /**
   * Get current state from history
   * @returns {Object|null} Current state or null
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex].state;
    }
    return null;
  }

  /**
   * Get history size
   * @returns {number} Number of states in history
   */
  getHistorySize() {
    return this.history.length;
  }

  /**
   * Get current position in history
   * @returns {number} Current index
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Peek at previous state without undoing
   * @returns {Object|null} Previous state or null
   */
  peekUndo() {
    if (!this.canUndo()) {
      return null;
    }

    return this.history[this.currentIndex - 1].state;
  }

  /**
   * Peek at next state without redoing
   * @returns {Object|null} Next state or null
   */
  peekRedo() {
    if (!this.canRedo()) {
      return null;
    }

    return this.history[this.currentIndex + 1].state;
  }

  /**
   * Enable or disable undo/redo tracking
   * @param {boolean} enabled - Whether to enable tracking
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Get history summary for debugging
   * @returns {Array} Array of history items with metadata
   */
  getHistorySummary() {
    return this.history.map((item, index) => ({
      index,
      action: item.action,
      timestamp: new Date(item.timestamp).toISOString(),
      isCurrent: index === this.currentIndex
    }));
  }

  /**
   * Setup keyboard shortcuts for undo/redo
   * @param {Function} undoCallback - Function to call on undo
   * @param {Function} redoCallback - Function to call on redo
   */
  setupKeyboardShortcuts(undoCallback, redoCallback) {
    const handleKeyDown = (event) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const ctrlOrCmd = event.ctrlKey || event.metaKey;

      // Ctrl/Cmd + Z = Undo
      if (ctrlOrCmd && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (this.canUndo()) {
          const state = this.undo();
          if (state && undoCallback) {
            undoCallback(state);
          }
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z = Redo
      if (
        (ctrlOrCmd && event.key === 'y') ||
        (ctrlOrCmd && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault();
        if (this.canRedo()) {
          const state = this.redo();
          if (state && redoCallback) {
            redoCallback(state);
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Serialize history for persistence
   * @returns {Object} Serialized history
   */
  serialize() {
    return {
      history: this.history,
      currentIndex: this.currentIndex,
      maxHistory: this.maxHistory
    };
  }

  /**
   * Restore history from serialized data
   * @param {Object} data - Serialized history data
   */
  deserialize(data) {
    if (!data) return;

    this.history = data.history || [];
    this.currentIndex = data.currentIndex ?? -1;
    this.maxHistory = data.maxHistory || 50;

    // Ensure currentIndex is within bounds
    if (this.currentIndex >= this.history.length) {
      this.currentIndex = this.history.length - 1;
    }

    this.notifyListeners();
  }
}

// Create singleton instance
export const undoRedoManager = new UndoRedoManager();

export default UndoRedoManager;

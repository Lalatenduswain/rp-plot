/**
 * Project Selector Component
 * Manages project selection, creation, and deletion
 */

import { Project } from '../models/Project.js';
import { sanitizeInput } from '../utils/validation.js';

export class ProjectSelector {
  constructor(stateManager, persistenceManager) {
    this.stateManager = stateManager;
    this.persistenceManager = persistenceManager;

    // DOM elements
    this.dropdownBtn = document.getElementById('projectDropdownBtn');
    this.dropdown = document.getElementById('projectDropdown');
    this.projectList = document.getElementById('projectList');
    this.searchInput = document.getElementById('projectSearch');
    this.newProjectBtn = document.getElementById('newProjectBtn');
    this.currentProjectName = document.getElementById('currentProjectName');

    // Modal elements
    this.newProjectModal = null;
    this.projectNameInput = document.getElementById('projectName');
    this.projectDescInput = document.getElementById('projectDescription');
    this.createProjectBtn = document.getElementById('createProjectBtn');

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    if (!this.dropdownBtn) return;

    // Setup Bootstrap modal
    const modalEl = document.getElementById('newProjectModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      this.newProjectModal = new bootstrap.Modal(modalEl);
    }

    this.setupEventListeners();
    this.render();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Dropdown toggle
    if (this.dropdownBtn) {
      this.dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.dropdownBtn) {
        this.closeDropdown();
      }
    });

    // Search projects
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filterProjects(e.target.value);
      });
    }

    // New project button
    if (this.newProjectBtn) {
      this.newProjectBtn.addEventListener('click', () => {
        this.closeDropdown();
        this.openNewProjectModal();
      });
    }

    // Create project button in modal
    if (this.createProjectBtn) {
      this.createProjectBtn.addEventListener('click', () => {
        this.createProject();
      });
    }

    // Enter key in project name input
    if (this.projectNameInput) {
      this.projectNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.createProject();
        }
      });
    }

    // Subscribe to state changes
    this.stateManager.subscribe((update) => {
      if (update.action === 'PROJECT_CHANGED' || update.action === 'PROJECT_ADDED') {
        this.render();
      }
    });
  }

  /**
   * Toggle dropdown
   */
  toggleDropdown() {
    if (!this.dropdown) return;

    const isHidden = this.dropdown.hasAttribute('hidden');

    if (isHidden) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  /**
   * Open dropdown
   */
  openDropdown() {
    if (!this.dropdown) return;

    this.dropdown.removeAttribute('hidden');
    this.dropdownBtn.setAttribute('aria-expanded', 'true');

    // Clear search and re-render
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.renderProjectList();

    // Focus search input
    if (this.searchInput) {
      setTimeout(() => this.searchInput.focus(), 100);
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    if (!this.dropdown) return;

    this.dropdown.setAttribute('hidden', '');
    this.dropdownBtn.setAttribute('aria-expanded', 'false');
  }

  /**
   * Render component
   */
  render() {
    this.updateCurrentProjectName();
    this.renderProjectList();
  }

  /**
   * Update current project name display
   */
  updateCurrentProjectName() {
    if (!this.currentProjectName) return;

    const currentProject = this.stateManager.state.currentProject;

    if (currentProject) {
      this.currentProjectName.textContent = currentProject.name;
    } else {
      this.currentProjectName.textContent = 'No Project';
    }
  }

  /**
   * Render project list
   */
  renderProjectList(filteredProjects = null) {
    if (!this.projectList) return;

    const projects = filteredProjects || this.stateManager.getAllProjects();
    const currentId = this.stateManager.state.currentProjectId;

    if (projects.length === 0) {
      this.projectList.innerHTML = `
        <div class="text-center text-muted p-3">
          <small>No projects yet. Create one to get started!</small>
        </div>
      `;
      return;
    }

    this.projectList.innerHTML = projects.map(project => {
      const isActive = project.id === currentId;
      const sanitizedName = sanitizeInput(project.name);
      const sanitizedDesc = sanitizeInput(project.description);

      return `
        <div class="dropdown-item ${isActive ? 'active' : ''}" data-project-id="${project.id}" role="menuitem">
          <div class="d-flex align-items-center justify-content-between">
            <div class="flex-grow-1" style="min-width: 0;">
              <div class="d-flex align-items-center gap-2">
                ${isActive ? '<i class="bi bi-check-circle-fill text-primary"></i>' : '<i class="bi bi-folder"></i>'}
                <span class="fw-medium" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sanitizedName}</span>
              </div>
              ${sanitizedDesc ? `<small class="text-muted d-block" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sanitizedDesc}</small>` : ''}
              <small class="text-muted">${project.measurementCount} measurements</small>
            </div>
            <div class="dropdown-actions">
              <button class="btn btn-sm btn-icon" data-action="delete" data-project-id="${project.id}" title="Delete project">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to project items
    this.projectList.querySelectorAll('.dropdown-item').forEach(item => {
      const projectId = item.dataset.projectId;

      item.addEventListener('click', (e) => {
        // Don't switch if clicking delete button
        if (e.target.closest('[data-action="delete"]')) {
          return;
        }

        this.switchProject(projectId);
      });
    });

    // Add event listeners to delete buttons
    this.projectList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = btn.dataset.projectId;
        this.deleteProject(projectId);
      });
    });
  }

  /**
   * Filter projects by search term
   */
  filterProjects(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.renderProjectList();
      return;
    }

    const allProjects = this.stateManager.getAllProjects();
    const filtered = allProjects.filter(project => {
      return project.name.toLowerCase().includes(term) ||
             project.description.toLowerCase().includes(term);
    });

    this.renderProjectList(filtered);
  }

  /**
   * Switch to a different project
   */
  switchProject(projectId) {
    const success = this.stateManager.setCurrentProject(projectId);

    if (success) {
      this.persistenceManager.saveAll();
      this.closeDropdown();

      // Dispatch custom event
      const event = new CustomEvent('projectChanged', {
        detail: { projectId }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Open new project modal
   */
  openNewProjectModal() {
    if (!this.newProjectModal) return;

    // Clear form
    if (this.projectNameInput) this.projectNameInput.value = '';
    if (this.projectDescInput) this.projectDescInput.value = '';

    // Remove validation states
    if (this.projectNameInput) {
      this.projectNameInput.classList.remove('is-invalid');
      const errorEl = document.getElementById('projectNameError');
      if (errorEl) errorEl.textContent = '';
    }

    this.newProjectModal.show();
  }

  /**
   * Create a new project
   */
  createProject() {
    if (!this.projectNameInput) return;

    const name = this.projectNameInput.value.trim();
    const description = this.projectDescInput ? this.projectDescInput.value.trim() : '';

    // Validate
    const existingProjects = this.stateManager.getAllProjects();
    const project = new Project(name, description);
    const validation = project.validate(existingProjects);

    if (!validation.valid) {
      this.showValidationError(validation.error);
      return;
    }

    // Create project
    const success = this.stateManager.addProject(project);

    if (success) {
      // Set as current project
      this.stateManager.setCurrentProject(project.id);

      // Save
      this.persistenceManager.saveAll();

      // Close modal
      if (this.newProjectModal) {
        this.newProjectModal.hide();
      }

      // Show success message
      this.showSuccess(`Project "${name}" created successfully`);

      // Dispatch custom event
      const event = new CustomEvent('projectCreated', {
        detail: { projectId: project.id }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Delete a project
   */
  deleteProject(projectId) {
    const project = this.stateManager.getProject(projectId);

    if (!project) return;

    // Confirm deletion
    const confirmMsg = `Delete project "${project.name}"?\n\nThis will delete all ${project.measurementCount} measurements.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // Delete project
    const success = this.stateManager.removeProject(projectId);

    if (success) {
      // If deleted project was current, switch to first available
      if (this.stateManager.state.currentProjectId === projectId) {
        const projects = this.stateManager.getAllProjects();
        if (projects.length > 0) {
          this.stateManager.setCurrentProject(projects[0].id);
        }
      }

      // Save
      this.persistenceManager.saveAll();

      // Re-render
      this.render();

      // Show success message
      this.showSuccess(`Project "${project.name}" deleted`);

      // Dispatch custom event
      const event = new CustomEvent('projectDeleted', {
        detail: { projectId }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Show validation error
   */
  showValidationError(message) {
    if (!this.projectNameInput) return;

    this.projectNameInput.classList.add('is-invalid');

    const errorEl = document.getElementById('projectNameError');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // Dispatch event for toast notification
    const event = new CustomEvent('showNotification', {
      detail: { message, type: 'success' }
    });
    window.dispatchEvent(event);
  }
}

export default ProjectSelector;

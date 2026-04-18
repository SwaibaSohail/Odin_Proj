// ==========================================
// TODO CLASS - Defines the structure of a todo item
// ==========================================
class Todo {
    constructor(title, description, dueDate, priority, projectId, notes = '') {
        this.id = this.generateId();
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.priority = priority;
        this.projectId = projectId;
        this.notes = notes;
        this.completed = false;
        this.createdAt = new Date().toISOString();
    }

    generateId() {
        return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    toggleComplete() {
        this.completed = !this.completed;
    }

    update(updates) {
        Object.assign(this, updates);
    }

    // Helper method to check if todo is overdue
    isOverdue() {
        if (!this.dueDate || this.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(this.dueDate);
        return due < today;
    }

    // Format due date for display
    getFormattedDueDate() {
        if (!this.dueDate) return null;
        const date = new Date(this.dueDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Reset hours for comparison
        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
            return 'Today';
        } else if (date.getTime() === tomorrow.getTime()) {
            return 'Tomorrow';
        } else {
            const options = { month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
    }
}

// ==========================================
// PROJECT CLASS - Defines the structure of a project
// ==========================================
class Project {
    constructor(name) {
        this.id = this.generateId();
        this.name = name;
        this.createdAt = new Date().toISOString();
    }

    generateId() {
        return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    update(updates) {
        Object.assign(this, updates);
    }
}

// ==========================================
// STORAGE MODULE - Handles localStorage operations
// ==========================================
const StorageModule = {
    STORAGE_KEYS: {
        PROJECTS: 'taskflow_projects',
        TODOS: 'taskflow_todos',
        CURRENT_PROJECT: 'taskflow_current_project'
    },

    // Save projects to localStorage
    saveProjects(projects) {
        try {
            const projectsData = projects.map(p => ({
                id: p.id,
                name: p.name,
                createdAt: p.createdAt
            }));
            localStorage.setItem(this.STORAGE_KEYS.PROJECTS, JSON.stringify(projectsData));
        } catch (error) {
            console.error('Error saving projects:', error);
        }
    },

    // Load projects from localStorage
    loadProjects() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.PROJECTS);
            if (!data) return [];
            
            const projectsData = JSON.parse(data);
            return projectsData.map(p => {
                const project = new Project(p.name);
                project.id = p.id;
                project.createdAt = p.createdAt;
                return project;
            });
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    },

    // Save todos to localStorage
    saveTodos(todos) {
        try {
            const todosData = todos.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                dueDate: t.dueDate,
                priority: t.priority,
                projectId: t.projectId,
                notes: t.notes,
                completed: t.completed,
                createdAt: t.createdAt
            }));
            localStorage.setItem(this.STORAGE_KEYS.TODOS, JSON.stringify(todosData));
        } catch (error) {
            console.error('Error saving todos:', error);
        }
    },

    // Load todos from localStorage
    loadTodos() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.TODOS);
            if (!data) return [];
            
            const todosData = JSON.parse(data);
            return todosData.map(t => {
                const todo = new Todo(
                    t.title,
                    t.description,
                    t.dueDate,
                    t.priority,
                    t.projectId,
                    t.notes
                );
                todo.id = t.id;
                todo.completed = t.completed;
                todo.createdAt = t.createdAt;
                return todo;
            });
        } catch (error) {
            console.error('Error loading todos:', error);
            return [];
        }
    },

    // Save current project ID
    saveCurrentProject(projectId) {
        try {
            localStorage.setItem(this.STORAGE_KEYS.CURRENT_PROJECT, projectId);
        } catch (error) {
            console.error('Error saving current project:', error);
        }
    },

    // Load current project ID
    loadCurrentProject() {
        try {
            return localStorage.getItem(this.STORAGE_KEYS.CURRENT_PROJECT);
        } catch (error) {
            console.error('Error loading current project:', error);
            return null;
        }
    }
};

// ==========================================
// APP LOGIC MODULE - Business logic for managing todos and projects
// ==========================================
const AppLogic = {
    projects: [],
    todos: [],
    currentProjectId: null,

    // Initialize app
    init() {
        // Load data from localStorage
        this.projects = StorageModule.loadProjects();
        this.todos = StorageModule.loadTodos();
        
        // Create default project if none exist
        if (this.projects.length === 0) {
            this.addProject('Inbox');
        }
        
        // Set current project
        const savedProjectId = StorageModule.loadCurrentProject();
        this.currentProjectId = savedProjectId || this.projects[0].id;
    },

    // Project methods
    addProject(name) {
        const project = new Project(name);
        this.projects.push(project);
        StorageModule.saveProjects(this.projects);
        return project;
    },

    deleteProject(projectId) {
        // Don't allow deleting the last project
        if (this.projects.length === 1) {
            return false;
        }

        // Delete all todos in this project
        this.todos = this.todos.filter(todo => todo.projectId !== projectId);
        StorageModule.saveTodos(this.todos);

        // Delete the project
        this.projects = this.projects.filter(p => p.id !== projectId);
        StorageModule.saveProjects(this.projects);

        // If we deleted the current project, switch to the first one
        if (this.currentProjectId === projectId) {
            this.currentProjectId = this.projects[0].id;
            StorageModule.saveCurrentProject(this.currentProjectId);
        }

        return true;
    },

    setCurrentProject(projectId) {
        this.currentProjectId = projectId;
        StorageModule.saveCurrentProject(projectId);
    },

    getProject(projectId) {
        return this.projects.find(p => p.id === projectId);
    },

    // Todo methods
    addTodo(title, description, dueDate, priority, projectId, notes) {
        const todo = new Todo(title, description, dueDate, priority, projectId, notes);
        this.todos.push(todo);
        StorageModule.saveTodos(this.todos);
        return todo;
    },

    updateTodo(todoId, updates) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            todo.update(updates);
            StorageModule.saveTodos(this.todos);
            return true;
        }
        return false;
    },

    deleteTodo(todoId) {
        this.todos = this.todos.filter(t => t.id !== todoId);
        StorageModule.saveTodos(this.todos);
    },

    toggleTodoComplete(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            todo.toggleComplete();
            StorageModule.saveTodos(this.todos);
            return true;
        }
        return false;
    },

    getTodo(todoId) {
        return this.todos.find(t => t.id === todoId);
    },

    getTodosForProject(projectId) {
        return this.todos.filter(t => t.projectId === projectId);
    },

    // Get count of incomplete todos for a project
    getProjectTodoCount(projectId) {
        return this.todos.filter(t => t.projectId === projectId && !t.completed).length;
    }
};

// ==========================================
// UI MODULE - Handles all DOM manipulation and rendering
// ==========================================
const UIModule = {
    elements: {},

    init() {
        // Cache DOM elements
        this.elements = {
            projectsList: document.getElementById('projectsList'),
            addProjectBtn: document.getElementById('addProjectBtn'),
            currentProjectTitle: document.getElementById('currentProjectTitle'),
            projectMeta: document.getElementById('projectMeta'),
            addTodoBtn: document.getElementById('addTodoBtn'),
            todosContainer: document.getElementById('todosContainer'),
            
            // Todo Modal
            todoModal: document.getElementById('todoModal'),
            todoForm: document.getElementById('todoForm'),
            todoTitle: document.getElementById('todoTitle'),
            todoDescription: document.getElementById('todoDescription'),
            todoDueDate: document.getElementById('todoDueDate'),
            todoPriority: document.getElementById('todoPriority'),
            todoProject: document.getElementById('todoProject'),
            todoNotes: document.getElementById('todoNotes'),
            modalTitle: document.getElementById('modalTitle'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            
            // Project Modal
            projectModal: document.getElementById('projectModal'),
            projectForm: document.getElementById('projectForm'),
            projectName: document.getElementById('projectName'),
            closeProjectModalBtn: document.getElementById('closeProjectModalBtn'),
            cancelProjectBtn: document.getElementById('cancelProjectBtn'),
            
            // Detail Modal
            detailModal: document.getElementById('detailModal'),
            detailTitle: document.getElementById('detailTitle'),
            detailContent: document.getElementById('detailContent'),
            closeDetailBtn: document.getElementById('closeDetailBtn'),
            editDetailBtn: document.getElementById('editDetailBtn'),
            deleteDetailBtn: document.getElementById('deleteDetailBtn')
        };

        this.currentEditingTodoId = null;
        this.currentDetailTodoId = null;
    },

    // Render projects list
    renderProjects() {
        const { projectsList } = this.elements;
        projectsList.innerHTML = '';

        AppLogic.projects.forEach(project => {
            const todoCount = AppLogic.getProjectTodoCount(project.id);
            const isActive = project.id === AppLogic.currentProjectId;
            
            const li = document.createElement('li');
            li.className = `project-item ${isActive ? 'active' : ''}`;
            li.innerHTML = `
                <span class="project-name">${this.escapeHtml(project.name)}</span>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="project-count">${todoCount}</span>
                    ${AppLogic.projects.length > 1 ? `
                        <button class="delete-project" data-project-id="${project.id}" aria-label="Delete project">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-project')) {
                    AppLogic.setCurrentProject(project.id);
                    this.renderProjects();
                    this.renderCurrentProject();
                }
            });

            const deleteBtn = li.querySelector('.delete-project');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete project "${project.name}"? All todos in this project will be deleted.`)) {
                        AppLogic.deleteProject(project.id);
                        this.renderProjects();
                        this.renderCurrentProject();
                    }
                });
            }

            projectsList.appendChild(li);
        });

        // Update project dropdown in todo form
        this.updateProjectDropdown();
    },

    // Update project dropdown in todo form
    updateProjectDropdown() {
        const { todoProject } = this.elements;
        todoProject.innerHTML = '';

        AppLogic.projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            if (project.id === AppLogic.currentProjectId) {
                option.selected = true;
            }
            todoProject.appendChild(option);
        });
    },

    // Render current project and its todos
    renderCurrentProject() {
        const project = AppLogic.getProject(AppLogic.currentProjectId);
        if (!project) return;

        const todos = AppLogic.getTodosForProject(project.id);
        const incompleteTodos = todos.filter(t => !t.completed).length;
        const completedTodos = todos.filter(t => t.completed).length;

        this.elements.currentProjectTitle.textContent = project.name;
        this.elements.projectMeta.textContent = `${incompleteTodos} active, ${completedTodos} completed`;

        this.renderTodos(todos);
    },

    // Render todos
    renderTodos(todos) {
        const { todosContainer } = this.elements;
        todosContainer.innerHTML = '';

        if (todos.length === 0) {
            todosContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11l3 3L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h3>No tasks yet</h3>
                    <p>Add a task to get started</p>
                </div>
            `;
            return;
        }

        // Sort todos: incomplete first, then by priority, then by due date
        const sortedTodos = [...todos].sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            
            return 0;
        });

        sortedTodos.forEach(todo => {
            const todoElement = this.createTodoElement(todo);
            todosContainer.appendChild(todoElement);
        });
    },

    // Create a todo element
    createTodoElement(todo) {
        const div = document.createElement('div');
        div.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        div.style.setProperty('--priority-color', `var(--color-priority-${todo.priority})`);

        const formattedDate = todo.getFormattedDueDate();
        const isOverdue = todo.isOverdue();

        div.innerHTML = `
            <div class="todo-header">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-todo-id="${todo.id}"></div>
                <div class="todo-content">
                    <h3 class="todo-title">${this.escapeHtml(todo.title)}</h3>
                    ${todo.description ? `<p class="todo-description">${this.escapeHtml(todo.description)}</p>` : ''}
                    <div class="todo-meta">
                        <span class="todo-tag priority-tag priority-${todo.priority}">
                            ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                        </span>
                        ${formattedDate ? `
                            <span class="todo-tag date-tag ${isOverdue ? 'overdue' : ''}">
                                ${formattedDate}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Checkbox toggle
        const checkbox = div.querySelector('.todo-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            AppLogic.toggleTodoComplete(todo.id);
            this.renderCurrentProject();
        });

        // Click to view details
        div.addEventListener('click', () => {
            this.showTodoDetails(todo.id);
        });

        return div;
    },

    // Show todo modal for adding/editing
    showTodoModal(todoId = null) {
        this.currentEditingTodoId = todoId;
        const { todoModal, modalTitle, todoForm } = this.elements;

        if (todoId) {
            // Edit mode
            const todo = AppLogic.getTodo(todoId);
            if (!todo) return;

            modalTitle.textContent = 'Edit Task';
            this.elements.todoTitle.value = todo.title;
            this.elements.todoDescription.value = todo.description;
            this.elements.todoDueDate.value = todo.dueDate;
            this.elements.todoPriority.value = todo.priority;
            this.elements.todoProject.value = todo.projectId;
            this.elements.todoNotes.value = todo.notes;
        } else {
            // Add mode
            modalTitle.textContent = 'New Task';
            todoForm.reset();
            this.elements.todoProject.value = AppLogic.currentProjectId;
        }

        todoModal.classList.add('active');
    },

    hideTodoModal() {
        this.elements.todoModal.classList.remove('active');
        this.currentEditingTodoId = null;
    },

    // Show project modal
    showProjectModal() {
        this.elements.projectModal.classList.add('active');
        this.elements.projectForm.reset();
    },

    hideProjectModal() {
        this.elements.projectModal.classList.remove('active');
    },

    // Show todo details modal
    showTodoDetails(todoId) {
        const todo = AppLogic.getTodo(todoId);
        if (!todo) return;

        this.currentDetailTodoId = todoId;
        const project = AppLogic.getProject(todo.projectId);

        this.elements.detailTitle.textContent = todo.title;
        this.elements.detailContent.innerHTML = `
            <div class="detail-field">
                <div class="detail-label">Description</div>
                <div class="detail-value">${todo.description || 'No description'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Project</div>
                <div class="detail-value">${project ? this.escapeHtml(project.name) : 'Unknown'}</div>
            </div>
            <div class="detail-field">
                <div class="detail-label">Priority</div>
                <div class="detail-value">
                    <span class="todo-tag priority-tag priority-${todo.priority}">
                        ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                    </span>
                </div>
            </div>
            ${todo.dueDate ? `
                <div class="detail-field">
                    <div class="detail-label">Due Date</div>
                    <div class="detail-value">${new Date(todo.dueDate).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</div>
                </div>
            ` : ''}
            ${todo.notes ? `
                <div class="detail-field">
                    <div class="detail-label">Notes</div>
                    <div class="detail-value">${this.escapeHtml(todo.notes)}</div>
                </div>
            ` : ''}
            <div class="detail-field">
                <div class="detail-label">Status</div>
                <div class="detail-value">${todo.completed ? 'Completed' : 'Active'}</div>
            </div>
        `;

        this.elements.detailModal.classList.add('active');
    },

    hideDetailModal() {
        this.elements.detailModal.classList.remove('active');
        this.currentDetailTodoId = null;
    },

    // Helper to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ==========================================
// APP CONTROLLER - Coordinates app logic and UI
// ==========================================
const AppController = {
    init() {
        // Initialize modules
        AppLogic.init();
        UIModule.init();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        UIModule.renderProjects();
        UIModule.renderCurrentProject();
    },

    setupEventListeners() {
        const { elements } = UIModule;

        // Add project button
        elements.addProjectBtn.addEventListener('click', () => {
            UIModule.showProjectModal();
        });

        // Add todo button
        elements.addTodoBtn.addEventListener('click', () => {
            UIModule.showTodoModal();
        });

        // Project form submission
        elements.projectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = elements.projectName.value.trim();
            if (name) {
                AppLogic.addProject(name);
                UIModule.hideProjectModal();
                UIModule.renderProjects();
            }
        });

        // Todo form submission
        elements.todoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = elements.todoTitle.value.trim();
            const description = elements.todoDescription.value.trim();
            const dueDate = elements.todoDueDate.value;
            const priority = elements.todoPriority.value;
            const projectId = elements.todoProject.value;
            const notes = elements.todoNotes.value.trim();

            if (title) {
                if (UIModule.currentEditingTodoId) {
                    // Update existing todo
                    AppLogic.updateTodo(UIModule.currentEditingTodoId, {
                        title,
                        description,
                        dueDate,
                        priority,
                        projectId,
                        notes
                    });
                } else {
                    // Create new todo
                    AppLogic.addTodo(title, description, dueDate, priority, projectId, notes);
                }

                UIModule.hideTodoModal();
                UIModule.renderProjects(); // Update counts
                UIModule.renderCurrentProject();
            }
        });

        // Modal close buttons
        elements.closeModalBtn.addEventListener('click', () => UIModule.hideTodoModal());
        elements.cancelBtn.addEventListener('click', () => UIModule.hideTodoModal());
        elements.closeProjectModalBtn.addEventListener('click', () => UIModule.hideProjectModal());
        elements.cancelProjectBtn.addEventListener('click', () => UIModule.hideProjectModal());
        elements.closeDetailBtn.addEventListener('click', () => UIModule.hideDetailModal());

        // Detail modal actions
        elements.editDetailBtn.addEventListener('click', () => {
            UIModule.hideDetailModal();
            UIModule.showTodoModal(UIModule.currentDetailTodoId);
        });

        elements.deleteDetailBtn.addEventListener('click', () => {
            if (confirm('Delete this task?')) {
                AppLogic.deleteTodo(UIModule.currentDetailTodoId);
                UIModule.hideDetailModal();
                UIModule.renderProjects();
                UIModule.renderCurrentProject();
            }
        });

        // Close modals on backdrop click
        [elements.todoModal, elements.projectModal, elements.detailModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                UIModule.hideTodoModal();
                UIModule.hideProjectModal();
                UIModule.hideDetailModal();
            }

            // Ctrl/Cmd + N to add new todo
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                UIModule.showTodoModal();
            }
        });
    }
};

// ==========================================
// INITIALIZE APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    AppController.init();
});
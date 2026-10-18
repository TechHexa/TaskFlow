/**
 * TaskFlow Pro — Fully Functional To-Do Application
 * Internship Final Project
 * Author: Raj Kumar
 */

// ==========================================================================
// 1. Initial State & Configuration
// ==========================================================================

const STORAGE_KEY_TASKS = 'taskflow_pro_tasks';
const STORAGE_KEY_THEME = 'taskflow_pro_theme';
const STORAGE_KEY_SOUND = 'taskflow_pro_sound';

// App State
let tasks = [];
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'newest';
let soundEnabled = true;
let lastDeletedTask = null;
let lastDeletedIndex = null;
let toastTimeout = null;

// Audio Context for synthetic sound feedback (no external sound files required)
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'add') {
            // Uplifting two-tone chime (C5 -> G5)
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'complete') {
            // Rewarding completion chord (E5 -> A5)
            osc.frequency.setValueAtTime(659.25, now);
            osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'delete') {
            // Subtle pop down
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    } catch (e) {
        console.warn('Audio playback not supported or blocked:', e);
    }
}

// Sample initial data if user starts with empty list
const SAMPLE_TASKS = [
    {
        id: 'task_sample_1',
        title: 'Complete Week 4 Web Development Final Project',
        notes: 'Implement full CRUD, local storage, responsive UI, and prepare internship documentation.',
        category: 'Work',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        completed: false,
        starred: true,
        createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 'task_sample_2',
        title: 'Review JavaScript ES6+ Features & DOM Events',
        notes: 'Brush up on arrow functions, destructuring, promises, and event delegation.',
        category: 'Coding',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0], // Today
        completed: true,
        starred: false,
        createdAt: new Date(Date.now() - 18000000).toISOString()
    },
    {
        id: 'task_sample_3',
        title: 'Design Modern Responsive UI with CSS Grid & Flexbox',
        notes: 'Ensure fluid dark mode theme, badge tags, and mobile navigation.',
        category: 'Study',
        priority: 'medium',
        dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        completed: false,
        starred: false,
        createdAt: new Date(Date.now() - 36000000).toISOString()
    },
    {
        id: 'task_sample_4',
        title: 'Submit Project Link & Video Demo to InternNova Portal',
        notes: 'Record short video walkthrough and push source code to GitHub repository.',
        category: 'Work',
        priority: 'high',
        dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
        completed: false,
        starred: true,
        createdAt: new Date(Date.now() - 50000000).toISOString()
    }
];

// ==========================================================================
// 2. DOM Elements
// ==========================================================================

const elements = {
    // Top Bar
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    iconSoundOn: document.querySelector('.icon-sound-on'),
    iconSoundOff: document.querySelector('.icon-sound-off'),
    currentDateDisplay: document.getElementById('currentDateDisplay'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    dataMenuBtn: document.getElementById('dataMenuBtn'),
    dataMenuDropdown: document.getElementById('dataMenuDropdown'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importFileInput: document.getElementById('importFileInput'),
    loadDemoBtn: document.getElementById('loadDemoBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),

    // Stats Hero
    greetingMessage: document.getElementById('greetingMessage'),
    progressSummary: document.getElementById('progressSummary'),
    progressPercentNum: document.getElementById('progressPercentNum'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressRingContainer: document.querySelector('.progress-ring-container'),
    countAll: document.getElementById('countAll'),
    countActive: document.getElementById('countActive'),
    countCompleted: document.getElementById('countCompleted'),
    countStarred: document.getElementById('countStarred'),
    countOverdue: document.getElementById('countOverdue'),
    counterItems: document.querySelectorAll('.counter-item'),

    // Task Form
    taskInputForm: document.getElementById('taskInputForm'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    toggleOptionsBtn: document.getElementById('toggleOptionsBtn'),
    extendedFormOptions: document.getElementById('extendedFormOptions'),
    taskCategorySelect: document.getElementById('taskCategorySelect'),
    taskPrioritySelect: document.getElementById('taskPrioritySelect'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskStarCheckbox: document.getElementById('taskStarCheckbox'),
    taskNotesInput: document.getElementById('taskNotesInput'),

    // Toolbar & Filters
    filterTabs: document.querySelectorAll('.filter-tab'),
    tabBadgeAll: document.getElementById('tabBadgeAll'),
    tabBadgeActive: document.getElementById('tabBadgeActive'),
    tabBadgeCompleted: document.getElementById('tabBadgeCompleted'),
    tabBadgeToday: document.getElementById('tabBadgeToday'),
    categoryFilterSelect: document.getElementById('categoryFilterSelect'),
    sortSelect: document.getElementById('sortSelect'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),

    // Filter Banner
    filterBanner: document.getElementById('filterBanner'),
    filterBannerMessage: document.getElementById('filterBannerMessage'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),

    // Task List & Empty State
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateDesc: document.getElementById('emptyStateDesc'),
    emptyStateActionBtn: document.getElementById('emptyStateActionBtn'),

    // Modal
    editModal: document.getElementById('editModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    editTaskForm: document.getElementById('editTaskForm'),
    editTaskId: document.getElementById('editTaskId'),
    editTaskTitle: document.getElementById('editTaskTitle'),
    editTaskNotes: document.getElementById('editTaskNotes'),
    editTaskCategory: document.getElementById('editTaskCategory'),
    editTaskPriority: document.getElementById('editTaskPriority'),
    editTaskDueDate: document.getElementById('editTaskDueDate'),
    editTaskStarred: document.getElementById('editTaskStarred'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// 3. Application Initialization
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadSavedSettings();
    updateDateAndGreeting();
    loadTasksFromStorage();
    renderAll();
    setupEventListeners();
});

// Load Settings from LocalStorage
function loadSavedSettings() {
    // Theme
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Sound
    const savedSound = localStorage.getItem(STORAGE_KEY_SOUND);
    if (savedSound !== null) {
        soundEnabled = savedSound === 'true';
    }
    updateSoundButtonIcon();

    // Default today's date in form picker
    const todayStr = new Date().toISOString().split('T')[0];
    elements.taskDueDateInput.min = todayStr;
    elements.editTaskDueDate.min = todayStr;
}

// Update live header date and dynamic greeting
function updateDateAndGreeting() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);

    const hours = now.getHours();
    let greeting = 'Good morning';
    if (hours >= 12 && hours < 17) {
        greeting = 'Good afternoon';
    } else if (hours >= 17) {
        greeting = 'Good evening';
    }
    elements.greetingMessage.textContent = `${greeting}, Raj! 👋`;
}

// Load Tasks from LocalStorage
function loadTasksFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_TASKS);
        if (stored) {
            tasks = JSON.parse(stored);
        } else {
            // First time load with sample tasks
            tasks = [...SAMPLE_TASKS];
            saveTasksToStorage();
        }
    } catch (e) {
        console.error('Error loading tasks from localStorage:', e);
        tasks = [...SAMPLE_TASKS];
    }
}

// Save Tasks to LocalStorage
function saveTasksToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
        console.error('Error saving tasks to localStorage:', e);
        showToast('Storage error: Could not save tasks locally', 'danger');
    }
}

// ==========================================================================
// 4. Task Management Actions (CRUD)
// ==========================================================================

// Add New Task
function addTask(title, notes = '', category = 'General', priority = 'medium', dueDate = '', starred = false) {
    if (!title || title.trim() === '') {
        showToast('Please enter a task title', 'warning');
        return;
    }

    const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: title.trim(),
        notes: notes.trim(),
        category: category || 'General',
        priority: priority || 'medium',
        dueDate: dueDate || '',
        completed: false,
        starred: Boolean(starred),
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasksToStorage();
    renderAll();
    playSound('add');
    showToast('Task added successfully! 🎉', 'success');

    // Reset Form
    elements.taskInputForm.reset();
    elements.taskPrioritySelect.value = 'medium';
    elements.taskCategorySelect.value = 'General';
    elements.extendedFormOptions.classList.remove('open');
    elements.taskTitleInput.focus();
}

// Toggle Task Completion
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    saveTasksToStorage();
    renderAll();

    if (task.completed) {
        playSound('complete');
        showToast('Task completed! Great job! ✨', 'success');
    } else {
        playSound('add');
    }
}

// Toggle Starred / Important
function toggleTaskStarred(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.starred = !task.starred;
    saveTasksToStorage();
    renderAll();
    playSound('add');
    showToast(task.starred ? 'Task starred as important ⭐' : 'Star removed', 'info');
}

// Delete Task (with Undo option)
function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    lastDeletedTask = tasks[taskIndex];
    lastDeletedIndex = taskIndex;

    tasks.splice(taskIndex, 1);
    saveTasksToStorage();
    renderAll();
    playSound('delete');

    showToast(`Task deleted.`, 'danger', true);
}

// Undo Delete
function undoDelete() {
    if (!lastDeletedTask) return;

    tasks.splice(lastDeletedIndex !== null ? lastDeletedIndex : 0, 0, lastDeletedTask);
    lastDeletedTask = null;
    lastDeletedIndex = null;

    saveTasksToStorage();
    renderAll();
    playSound('add');
    showToast('Task restored! ↩️', 'success');
}

// Edit Task Modal
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    elements.editTaskId.value = task.id;
    elements.editTaskTitle.value = task.title;
    elements.editTaskNotes.value = task.notes || '';
    elements.editTaskCategory.value = task.category || 'General';
    elements.editTaskPriority.value = task.priority || 'medium';
    elements.editTaskDueDate.value = task.dueDate || '';
    elements.editTaskStarred.checked = Boolean(task.starred);

    elements.editModal.style.display = 'flex';
    elements.editTaskTitle.focus();
}

function closeEditModal() {
    elements.editModal.style.display = 'none';
}

function saveEditedTask() {
    const id = elements.editTaskId.value;
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = elements.editTaskTitle.value.trim();
    if (!newTitle) {
        showToast('Task title cannot be empty', 'warning');
        return;
    }

    task.title = newTitle;
    task.notes = elements.editTaskNotes.value.trim();
    task.category = elements.editTaskCategory.value;
    task.priority = elements.editTaskPriority.value;
    task.dueDate = elements.editTaskDueDate.value;
    task.starred = elements.editTaskStarred.checked;

    saveTasksToStorage();
    closeEditModal();
    renderAll();
    playSound('add');
    showToast('Task updated successfully! ✏️', 'success');
}

// Clear Completed Tasks
function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        showToast('No completed tasks to clear.', 'info');
        return;
    }

    if (confirm(`Are you sure you want to delete ${completedCount} completed task(s)?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasksToStorage();
        renderAll();
        playSound('delete');
        showToast(`Cleared ${completedCount} completed task(s).`, 'success');
    }
}

// Delete All Tasks
function clearAllTasks() {
    if (tasks.length === 0) {
        showToast('Task list is already empty.', 'info');
        return;
    }

    if (confirm('Are you sure you want to permanently delete ALL tasks? This cannot be undone.')) {
        tasks = [];
        saveTasksToStorage();
        renderAll();
        playSound('delete');
        showToast('All tasks cleared.', 'danger');
    }
}

// Load Demo Sample Tasks
function loadSampleTasks() {
    if (tasks.length > 0) {
        if (!confirm('This will append sample internship tasks to your list. Proceed?')) {
            return;
        }
    }
    tasks = [...SAMPLE_TASKS, ...tasks];
    saveTasksToStorage();
    renderAll();
    playSound('add');
    showToast('Sample tasks loaded! 📋', 'success');
}

// ==========================================================================
// 5. Data Backup: Export & Import
// ==========================================================================

function exportTasksToJson() {
    if (tasks.length === 0) {
        showToast('No tasks to export.', 'warning');
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `taskflow_backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Tasks exported to JSON file! 💾', 'success');
}

function importTasksFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                tasks = imported;
                saveTasksToStorage();
                renderAll();
                playSound('add');
                showToast(`Successfully imported ${imported.length} tasks! 📂`, 'success');
            } else {
                throw new Error('Invalid JSON format: expected an array of tasks.');
            }
        } catch (err) {
            console.error('Import error:', err);
            showToast('Failed to import: Invalid JSON file', 'danger');
        }
        // Reset file input
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ==========================================================================
// 6. Filtering, Searching, & Sorting Logic
// ==========================================================================

function getFilteredAndSortedTasks() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Step 1: Filter by Status / Filter Tab
    let filtered = tasks.filter(task => {
        // Status filter
        if (currentFilter === 'active' && task.completed) return false;
        if (currentFilter === 'completed' && !task.completed) return false;
        if (currentFilter === 'starred' && !task.starred) return false;
        if (currentFilter === 'today') {
            if (task.dueDate !== todayStr) return false;
        }
        if (currentFilter === 'overdue') {
            if (!task.dueDate || task.dueDate >= todayStr || task.completed) return false;
        }

        // Category filter
        if (currentCategory !== 'all' && task.category !== currentCategory) {
            return false;
        }

        // Search Query filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase().trim();
            const inTitle = task.title.toLowerCase().includes(query);
            const inNotes = (task.notes || '').toLowerCase().includes(query);
            const inCategory = (task.category || '').toLowerCase().includes(query);
            if (!inTitle && !inNotes && !inCategory) return false;
        }

        return true;
    });

    // Step 2: Sorting
    filtered.sort((a, b) => {
        // Keep starred tasks prioritized if not sorting alphabetically
        if (currentSort === 'priority') {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const weightA = priorityWeight[a.priority] || 2;
            const weightB = priorityWeight[b.priority] || 2;
            if (weightA !== weightB) return weightB - weightA;
            return new Date(b.createdAt) - new Date(a.createdAt);
        } else if (currentSort === 'dueDate') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        } else if (currentSort === 'alphabetical') {
            return a.title.localeCompare(b.title);
        } else if (currentSort === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        } else {
            // Newest first default
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return filtered;
}

// ==========================================================================
// 7. Rendering Engine
// ==========================================================================

function renderAll() {
    renderStats();
    renderTaskList();
    renderFilterBanner();
}

// Render Stats & Progress Bar
function renderStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const starred = tasks.filter(t => t.starred).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    const todayCount = tasks.filter(t => t.dueDate === todayStr).length;

    // Percent Calculation
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update Counter Numbers
    elements.countAll.textContent = total;
    elements.countActive.textContent = active;
    elements.countCompleted.textContent = completed;
    elements.countStarred.textContent = starred;
    elements.countOverdue.textContent = overdue;

    // Badges in tabs
    elements.tabBadgeAll.textContent = total;
    elements.tabBadgeActive.textContent = active;
    elements.tabBadgeCompleted.textContent = completed;
    elements.tabBadgeToday.textContent = todayCount;

    // Progress Bar & Ring
    elements.progressBarFill.style.width = `${percent}%`;
    elements.progressPercentNum.textContent = percent;
    elements.progressRingContainer.style.setProperty('--percent', percent);

    // Summary Text
    if (total === 0) {
        elements.progressSummary.textContent = "No tasks yet. Create one below to kickstart productivity!";
    } else if (completed === total) {
        elements.progressSummary.textContent = "🎉 Outstanding! You have completed all tasks!";
    } else {
        elements.progressSummary.textContent = `You've completed ${completed} of ${total} tasks (${active} remaining).`;
    }
}

// Render Task List
function renderTaskList() {
    const list = elements.taskList;
    list.innerHTML = '';

    const visibleTasks = getFilteredAndSortedTasks();

    if (visibleTasks.length === 0) {
        elements.emptyState.style.display = 'flex';
        list.style.display = 'none';

        if (searchQuery.trim() !== '') {
            elements.emptyStateTitle.textContent = `No matches for "${searchQuery}"`;
            elements.emptyStateDesc.textContent = "Try searching for a different keyword or resetting filters.";
            elements.emptyStateActionBtn.textContent = "Clear Search";
            elements.emptyStateActionBtn.onclick = () => {
                elements.searchInput.value = '';
                searchQuery = '';
                elements.clearSearchBtn.hidden = true;
                renderAll();
            };
        } else if (currentFilter !== 'all' || currentCategory !== 'all') {
            elements.emptyStateTitle.textContent = "No tasks in this view";
            elements.emptyStateDesc.textContent = "There are no tasks matching the selected filter criteria.";
            elements.emptyStateActionBtn.textContent = "View All Tasks";
            elements.emptyStateActionBtn.onclick = resetAllFilters;
        } else {
            elements.emptyStateTitle.textContent = "No tasks found";
            elements.emptyStateDesc.textContent = "You're all clear! Add a new task above to stay productive.";
            elements.emptyStateActionBtn.textContent = "Add Your First Task";
            elements.emptyStateActionBtn.onclick = () => elements.taskTitleInput.focus();
        }
        return;
    }

    elements.emptyState.style.display = 'none';
    list.style.display = 'flex';

    const todayStr = new Date().toISOString().split('T')[0];

    visibleTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-card ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        // Due date calculation & badge
        let dueDateBadgeHtml = '';
        if (task.dueDate) {
            let statusClass = '';
            let dateLabel = task.dueDate;

            if (task.dueDate < todayStr && !task.completed) {
                statusClass = 'status-overdue';
                dateLabel = `⚠️ Overdue (${task.dueDate})`;
            } else if (task.dueDate === todayStr) {
                statusClass = 'status-today';
                dateLabel = `⏰ Due Today`;
            } else {
                dateLabel = `📅 ${task.dueDate}`;
            }

            dueDateBadgeHtml = `<span class="pill-badge pill-date ${statusClass}">${dateLabel}</span>`;
        }

        // Priority Badge
        const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        const priorityBadgeHtml = `<span class="pill-badge pill-priority priority-${task.priority}">${priorityLabel} Priority</span>`;

        // Category Badge
        const categoryBadgeHtml = `<span class="pill-badge pill-category cat-${task.category}">${task.category}</span>`;

        // Notes HTML
        const notesHtml = task.notes ? `<div class="task-notes-text">${escapeHtml(task.notes)}</div>` : '';

        li.innerHTML = `
            <div class="task-chk-col">
                <button class="task-checkbox-btn" title="${task.completed ? 'Mark incomplete' : 'Mark completed'}" aria-label="Toggle task completion">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            </div>
            
            <div class="task-main-col">
                <div class="task-header-row">
                    <span class="task-title-text">${escapeHtml(task.title)}</span>
                </div>
                ${notesHtml}
                <div class="task-meta-row">
                    ${categoryBadgeHtml}
                    ${priorityBadgeHtml}
                    ${dueDateBadgeHtml}
                </div>
            </div>

            <div class="task-actions-col">
                <button class="action-btn star-btn ${task.starred ? 'starred' : ''}" title="${task.starred ? 'Unstar' : 'Star as important'}" aria-label="Star task">
                    <svg viewBox="0 0 24 24" fill="${task.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        // Event Delegations
        const chkBtn = li.querySelector('.task-checkbox-btn');
        chkBtn.addEventListener('click', () => toggleTaskCompletion(task.id));

        const starBtn = li.querySelector('.star-btn');
        starBtn.addEventListener('click', () => toggleTaskStarred(task.id));

        const editBtn = li.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => openEditModal(task.id));

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        list.appendChild(li);
    });
}

// Render Active Filter Banner
function renderFilterBanner() {
    const isFiltered = currentFilter !== 'all' || currentCategory !== 'all' || searchQuery.trim() !== '';

    if (!isFiltered) {
        elements.filterBanner.style.display = 'none';
        return;
    }

    elements.filterBanner.style.display = 'flex';
    const messages = [];

    if (searchQuery.trim() !== '') {
        messages.push(`Searching for "${searchQuery}"`);
    }
    if (currentFilter !== 'all') {
        const filterNames = { active: 'In Progress', completed: 'Completed', today: 'Due Today', starred: 'Starred', overdue: 'Overdue' };
        messages.push(`Status: ${filterNames[currentFilter] || currentFilter}`);
    }
    if (currentCategory !== 'all') {
        messages.push(`Category: ${currentCategory}`);
    }

    elements.filterBannerMessage.textContent = messages.join(' • ');
}

function resetAllFilters() {
    currentFilter = 'all';
    currentCategory = 'all';
    searchQuery = '';
    elements.searchInput.value = '';
    elements.clearSearchBtn.hidden = true;
    elements.categoryFilterSelect.value = 'all';

    elements.filterTabs.forEach(tab => {
        if (tab.dataset.filter === 'all') {
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
        } else {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        }
    });

    renderAll();
    showToast('Filters reset to default view.', 'info');
}

// ==========================================================================
// 8. Event Listeners & User Interactions
// ==========================================================================

function setupEventListeners() {
    // 1. Task Creation Form
    elements.taskInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addTask(
            elements.taskTitleInput.value,
            elements.taskNotesInput.value,
            elements.taskCategorySelect.value,
            elements.taskPrioritySelect.value,
            elements.taskDueDateInput.value,
            elements.taskStarCheckbox.checked
        );
    });

    // Toggle detailed form options
    elements.toggleOptionsBtn.addEventListener('click', () => {
        elements.extendedFormOptions.classList.toggle('open');
    });

    // 2. Filter Tabs
    elements.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.filterTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            currentFilter = tab.dataset.filter;
            renderAll();
        });
    });

    // Stats Hero counters clickable to filter
    elements.counterItems.forEach(item => {
        item.addEventListener('click', () => {
            const filter = item.dataset.filter;
            currentFilter = filter;

            elements.filterTabs.forEach(tab => {
                if (tab.dataset.filter === filter) {
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                } else {
                    tab.classList.remove('active');
                    tab.setAttribute('aria-selected', 'false');
                }
            });
            renderAll();
        });
    });

    // 3. Category Filter
    elements.categoryFilterSelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderAll();
    });

    // 4. Sort Selector
    elements.sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderAll();
    });

    // 5. Live Search Input
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        elements.clearSearchBtn.hidden = searchQuery === '';
        renderAll();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        searchQuery = '';
        elements.clearSearchBtn.hidden = true;
        renderAll();
        elements.searchInput.focus();
    });

    // Reset Filters Button
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // 6. Clear Completed & Clear All
    elements.clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    elements.clearAllBtn.addEventListener('click', () => {
        elements.dataMenuDropdown.classList.remove('active');
        clearAllTasks();
    });
    elements.loadDemoBtn.addEventListener('click', () => {
        elements.dataMenuDropdown.classList.remove('active');
        loadSampleTasks();
    });

    // 7. Theme Toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // 8. Sound Toggle
    elements.soundToggleBtn.addEventListener('click', toggleSound);

    // 9. Data Menu Dropdown
    elements.dataMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.dataMenuDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        elements.dataMenuDropdown.classList.remove('active');
    });

    elements.exportDataBtn.addEventListener('click', () => {
        elements.dataMenuDropdown.classList.remove('active');
        exportTasksToJson();
    });

    elements.importFileInput.addEventListener('change', (e) => {
        elements.dataMenuDropdown.classList.remove('active');
        importTasksFromJson(e);
    });

    // 10. Modal Actions
    elements.closeModalBtn.addEventListener('click', closeEditModal);
    elements.cancelEditBtn.addEventListener('click', closeEditModal);
    elements.editModal.addEventListener('click', (e) => {
        if (e.target === elements.editModal) {
            closeEditModal();
        }
    });

    elements.editTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedTask();
    });

    // 11. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + K or Cmd + K or / to search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            elements.searchInput.focus();
            elements.searchInput.select();
        }

        // 'N' to focus new task input (when not already in an input/textarea)
        if (e.key.toLowerCase() === 'n' && !isFormInputActive()) {
            e.preventDefault();
            elements.taskTitleInput.focus();
        }

        // Escape to close modal or clear search
        if (e.key === 'Escape') {
            if (elements.editModal.style.display === 'flex') {
                closeEditModal();
            } else if (document.activeElement === elements.searchInput) {
                elements.searchInput.blur();
            }
        }
    });
}

function isFormInputActive() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
}

// Toggle Theme (Dark / Light)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
}

// Toggle Sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(STORAGE_KEY_SOUND, soundEnabled.toString());
    updateSoundButtonIcon();
    if (soundEnabled) {
        playSound('add');
        showToast('Sound feedback enabled 🔊', 'info');
    } else {
        showToast('Sound feedback muted 🔇', 'info');
    }
}

function updateSoundButtonIcon() {
    if (soundEnabled) {
        elements.iconSoundOn.style.display = 'block';
        elements.iconSoundOff.style.display = 'none';
    } else {
        elements.iconSoundOn.style.display = 'none';
        elements.iconSoundOff.style.display = 'block';
    }
}

// ==========================================================================
// 9. Toast Notification System
// ==========================================================================

function showToast(message, type = 'info', showUndo = false) {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    elements.toastContainer.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '🗑️';
    if (type === 'warning') icon = '⚠️';

    let undoBtnHtml = '';
    if (showUndo) {
        undoBtnHtml = `<button class="toast-undo-btn" id="toastUndoAction">Undo</button>`;
    }

    toast.innerHTML = `
        <span>${icon} ${message}</span>
        ${undoBtnHtml}
    `;

    elements.toastContainer.appendChild(toast);

    if (showUndo) {
        const undoBtn = toast.querySelector('#toastUndoAction');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                undoDelete();
                toast.remove();
            });
        }
    }

    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Utility: Escape HTML to avoid XSS injections
function escapeHtml(string) {
    if (!string) return '';
    return String(string)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

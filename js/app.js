// js/app.js — To-Do List Life Dashboard

// ---------------------------------------------------------------------------
// StorageModule
// Handles all localStorage reads, writes, and removals.
// All external keys must be prefixed with 'dld_' before calling these methods.
// ---------------------------------------------------------------------------
const StorageModule = (() => {
  /**
   * Un-hides the #storage-warning banner to inform the user that data will
   * not be persisted during the current session.
   */
  function _showStorageBanner() {
    const banner = document.getElementById('storage-warning');
    if (banner) {
      banner.hidden = false;
    }
  }

  /**
   * Probes localStorage with a harmless write/remove pair.
   * @returns {boolean} true if localStorage is available, false otherwise.
   */
  function isAvailable() {
    try {
      const probe = '__dld_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Reads a value from localStorage and parses it as JSON.
   * Returns `fallback` when the key is absent or the value is not valid JSON.
   * @template T
   * @param {string} key - The storage key (should include dld_ prefix).
   * @param {T} fallback - Value returned when the key is missing or unreadable.
   * @returns {T}
   */
  function read(key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[Dashboard] Failed to parse Storage key "${key}":`, raw);
      return fallback;
    }
  }

  /**
   * Serialises `value` as JSON and writes it to localStorage.
   * Shows the storage warning banner if a quota exception is thrown.
   * @param {string} key - The storage key (should include dld_ prefix).
   * @param {unknown} value - The value to persist.
   */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        _showStorageBanner();
      }
    }
  }

  /**
   * Removes a key from localStorage.
   * @param {string} key - The storage key to remove.
   */
  function remove(key) {
    localStorage.removeItem(key);
  }

  return { isAvailable, read, write, remove };
})();

// ---------------------------------------------------------------------------
// ThemeModule
// Handles light/dark theme toggling and early application of the stored theme
// to prevent a flash of the wrong theme on page load.
// ---------------------------------------------------------------------------
const ThemeModule = (() => {
  const VALID_THEMES = ['light', 'dark'];
  const STORAGE_KEY = 'dld_theme';

  /**
   * Reads the stored theme from Storage and applies it to <html> immediately.
   * If the stored value is not 'light' or 'dark', defaults to 'light'.
   * Must be called as the very first operation inside DOMContentLoaded.
   */
  function applyStoredTheme() {
    const stored = StorageModule.read(STORAGE_KEY, 'light');
    const theme = VALID_THEMES.includes(stored) ? stored : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Toggles between 'light' and 'dark' themes, persists the choice, and
   * updates the toggle button's aria-label and icon text.
   */
  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    StorageModule.write(STORAGE_KEY, newTheme);

    // Update the toggle button's accessible label and icon
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      if (newTheme === 'dark') {
        btn.setAttribute('aria-label', 'Switch to light mode');
        btn.textContent = '☀️';
      } else {
        btn.setAttribute('aria-label', 'Switch to dark mode');
        btn.textContent = '🌙';
      }
    }
  }

  /**
   * Wires the theme-toggle button click event.
   * Call this during app initialisation (DOMContentLoaded).
   */
  function init() {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggle);

      // Set initial button state to match whatever theme is currently active
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      if (current === 'dark') {
        btn.setAttribute('aria-label', 'Switch to light mode');
        btn.textContent = '☀️';
      } else {
        btn.setAttribute('aria-label', 'Switch to dark mode');
        btn.textContent = '🌙';
      }
    }
  }

  return { applyStoredTheme, toggle, init };
})();

// ---------------------------------------------------------------------------
// GreetingModule
// Handles the live clock, date display, and contextual greeting with name.
// ---------------------------------------------------------------------------
const GreetingModule = (() => {
  /** Module-scoped name storage; updated by NameModule via updateName(). */
  let _currentName = '';

  /**
   * Pure function: returns a greeting string for the given hour (0–23).
   * - 05–11 → "Good Morning"
   * - 12–17 → "Good Afternoon"
   * - 18–21 → "Good Evening"
   * - 22–23, 0–4 → "Good Night"
   * Never returns an empty string; never throws.
   * @param {number} hour - Integer in range 0–23.
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 21) return 'Good Evening';
    return 'Good Night'; // 22–23 and 0–4
  }

  /**
   * Pure function: formats a Date object as a zero-padded HH:MM string.
   * @param {Date} date
   * @returns {string} e.g. "09:05"
   */
  function formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /**
   * Pure function: formats a Date object as a human-readable date string.
   * Uses the browser's locale (defaults to English if none set) with
   * weekday, day, month, and year parts.
   * @param {Date} date
   * @returns {string} e.g. "Monday, 7 September 2026"
   */
  function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Pure helper: truncates a name to at most 50 characters.
   * Exposed on the module so property tests can target it directly (P12).
   * @param {string} storedName
   * @returns {string}
   */
  function renderName(storedName) {
    return storedName.slice(0, 50);
  }

  /**
   * Reads the current date/time and updates the three greeting DOM elements:
   *   #greeting-time    — HH:MM clock
   *   #greeting-date    — human-readable date
   *   #greeting-message — greeting + optional name
   * Safe to call before those elements exist (guards with optional-chaining).
   */
  function renderDateTime() {
    const now = new Date();

    const timeEl = document.getElementById('greeting-time');
    const dateEl = document.getElementById('greeting-date');
    const msgEl  = document.getElementById('greeting-message');

    if (timeEl) timeEl.textContent = formatTime(now);
    if (dateEl) dateEl.textContent = formatDate(now);

    if (msgEl) {
      const greeting = getGreeting(now.getHours());
      const safeName = renderName(_currentName).trim();
      msgEl.textContent = safeName ? `${greeting}, ${safeName}` : greeting;
    }
  }

  /**
   * Stores the name in the module-scoped variable and re-renders the greeting.
   * Called by NameModule after a save or clear operation.
   * @param {string} name - The (possibly empty) display name.
   */
  function updateName(name) {
    _currentName = name || '';
    renderDateTime();
  }

  /**
   * Initialises the Greeting widget:
   *   1. Renders immediately so the user sees the time within 1 second of load.
   *   2. Schedules a refresh every 60 seconds to keep the clock current.
   */
  function init() {
    renderDateTime();
    setInterval(renderDateTime, 60_000);
  }

  return { init, getGreeting, formatTime, formatDate, renderName, renderDateTime, updateName };
})();

// ---------------------------------------------------------------------------
// NameModule
// Handles the custom name input: pre-filling from Storage on load, saving a
// new name (with validation), and clearing the name when the input is blank.
// Delegates greeting updates to GreetingModule after every change.
// ---------------------------------------------------------------------------
const NameModule = (() => {
  /**
   * Saves the raw input value to Storage (if non-empty after trim) or removes
   * it (if blank). Notifies GreetingModule in either case so the greeting
   * updates within 500 ms without a page reload.
   *
   * Rules (Requirements 2.1–2.5):
   *   - Trim the raw string first.
   *   - Empty / whitespace-only  → remove 'dld_name' from Storage, clear name.
   *   - Non-empty, length ≤ 50   → write trimmed name to Storage, update name.
   *   - Length > 50 is silently clamped here; NameModule.init() pre-fills
   *     the input with whatever was stored, so >50 should never be submitted
   *     through normal UI flow, but we guard it anyway.
   *
   * @param {string} rawInput - The current value of the name input element.
   */
  function save(rawInput) {
    const trimmed = (rawInput || '').trim();

    if (trimmed === '') {
      // Blank or whitespace-only → clear the stored name
      StorageModule.remove('dld_name');
      GreetingModule.updateName('');
    } else {
      // Non-empty: enforce max 50 chars before persisting
      const safe = trimmed.slice(0, 50);
      StorageModule.write('dld_name', safe);
      GreetingModule.updateName(safe);
    }
  }

  /**
   * Initialises the Name widget (Requirement 2.6):
   *   1. Reads the stored name and pre-fills the #name-input element.
   *   2. Calls GreetingModule.updateName() so the greeting renders the stored
   *      name immediately on page load.
   *   3. Wires the #name-save button click event to call save() with the
   *      current input value.
   */
  function init() {
    const storedName = StorageModule.read('dld_name', '');

    const input = document.getElementById('name-input');
    if (input) {
      input.value = storedName;
    }

    // Render the greeting with the stored name right away
    GreetingModule.updateName(storedName);

    // Wire the Save button
    const saveBtn = document.getElementById('name-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const currentInput = document.getElementById('name-input');
        save(currentInput ? currentInput.value : '');
      });
    }
  }

  return { init, save };
})();

// ---------------------------------------------------------------------------
// TimerModule
// Implements the Pomodoro-style countdown timer state machine.
// States: IDLE → RUNNING → PAUSED → IDLE (via reset)
//                RUNNING → COMPLETE (when reaches 0)
//
// saveDuration() and init() are added in task 6.2.
// ---------------------------------------------------------------------------
const TimerModule = (() => {
  // -------------------------------------------------------------------------
  // State variables
  // -------------------------------------------------------------------------

  /** @type {'IDLE'|'RUNNING'|'PAUSED'|'COMPLETE'} */
  let state = 'IDLE';

  /** Remaining seconds left in the current countdown. */
  let remainingSeconds = 25 * 60; // default 25 min until init() overrides

  /** Full duration in seconds for the currently configured Pomodoro. */
  let fullDuration = 25 * 60;

  /** Handle returned by setInterval; null when no interval is active. */
  let _intervalId = null;

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Updates the timer countdown display element (#timer-display) with the
   * current remaining seconds formatted as MM:SS.
   */
  function _updateDisplay() {
    const el = document.getElementById('timer-display');
    if (el) {
      el.textContent = formatCountdown(remainingSeconds);
    }
  }

  /**
   * Locks the duration input (#timer-duration-input) and its Save button
   * (#timer-duration-save) so the user cannot change the duration mid-session.
   * Requirement 3.9
   */
  function _lockDurationControls() {
    const input = document.getElementById('timer-duration-input');
    const btn   = document.getElementById('timer-duration-save');
    if (input) input.disabled = true;
    if (btn)   btn.disabled   = true;
  }

  /**
   * Unlocks the duration input and Save button so the user can change the
   * duration when the timer is not running (IDLE state).
   */
  function _unlockDurationControls() {
    const input = document.getElementById('timer-duration-input');
    const btn   = document.getElementById('timer-duration-save');
    if (input) input.disabled = false;
    if (btn)   btn.disabled   = false;
  }

  // -------------------------------------------------------------------------
  // Public pure function
  // -------------------------------------------------------------------------

  /**
   * Pure function: converts a non-negative integer number of seconds into a
   * zero-padded "MM:SS" string.
   * Safe for any s in the range 0–7199 (0:00 – 119:59). Never throws.
   * @param {number} s - Non-negative integer seconds (0 ≤ s ≤ 7199).
   * @returns {string} e.g. "25:00", "09:05", "00:00"
   */
  function formatCountdown(s) {
    const totalSeconds = Math.floor(Math.max(0, s));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // -------------------------------------------------------------------------
  // State machine — internal tick
  // -------------------------------------------------------------------------

  /**
   * Called every second by setInterval while the timer is RUNNING.
   * Guards against stale interval callbacks (e.g., after a reset race).
   * Requirement 3.4
   */
  function _tick() {
    if (state !== 'RUNNING') return; // no-op guard
    remainingSeconds -= 1;
    _updateDisplay();
    if (remainingSeconds === 0) {
      onComplete();
    }
  }

  // -------------------------------------------------------------------------
  // Public state-machine methods
  // -------------------------------------------------------------------------

  /**
   * Starts the countdown from the current remainingSeconds.
   * Only transitions from IDLE or PAUSED → RUNNING.
   * Locks the duration input and Save button while running.
   * Requirement 3.4, 3.9
   */
  function start() {
    if (state !== 'IDLE' && state !== 'PAUSED') return;
    state = 'RUNNING';
    _lockDurationControls();
    _intervalId = setInterval(_tick, 1000);
  }

  /**
   * Pauses the countdown, preserving remainingSeconds.
   * Only transitions from RUNNING → PAUSED.
   * Requirement 3.5
   */
  function stop() {
    if (state !== 'RUNNING') return;
    clearInterval(_intervalId);
    _intervalId = null;
    state = 'PAUSED';
  }

  /**
   * Stops any active countdown, restores the display to the full duration,
   * unlocks the duration controls, and returns the timer to IDLE.
   * Works from any state.
   * Requirement 3.6
   */
  function reset() {
    clearInterval(_intervalId);
    _intervalId = null;
    remainingSeconds = fullDuration;
    state = 'IDLE';
    _updateDisplay();
    _unlockDurationControls();
  }

  /**
   * Called automatically when remainingSeconds reaches 0.
   * Transitions state to COMPLETE, shows the on-screen banner for ≥3 seconds,
   * and fires a browser notification if permission has been granted.
   * Requirements 3.7, 3.8
   */
  function onComplete() {
    clearInterval(_intervalId);
    _intervalId = null;
    state = 'COMPLETE';

    // Ensure display reads 00:00
    remainingSeconds = 0;
    _updateDisplay();

    // Show on-screen completion banner for at least 3 seconds (Requirement 3.7)
    // Supports both id="timer-completion" (index.html) and id="timer-complete-banner" (legacy)
    const banner =
      document.getElementById('timer-completion') ||
      document.getElementById('timer-complete-banner');
    if (banner) {
      banner.hidden = false;
      banner.setAttribute('aria-live', 'assertive');
      setTimeout(() => {
        banner.hidden = true;
      }, 3000);
    }

    // Fire browser notification only if permission has been granted (Requirement 3.7, 3.8)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Focus session complete!', {
        body: 'Your Pomodoro timer has finished. Time for a break!',
        icon: 'favicon.ico',
      });
    }
  }

  // -------------------------------------------------------------------------
  // saveDuration — Task 6.2
  // -------------------------------------------------------------------------

  /**
   * Validates the given duration in minutes, persists it to Storage, and
   * resets the timer display.
   *
   * Validation rules (Requirements 3.10, 3.12):
   *   - Must be an integer in the range 1–120 (inclusive).
   *   - Non-integer, NaN, or out-of-range values are rejected with an inline error.
   *
   * On success (Requirements 3.11):
   *   - Writes integer value to Storage under 'dld_pomodoro_duration'.
   *   - Updates fullDuration to mins * 60.
   *   - Calls reset() so the display reflects the new duration immediately.
   *
   * @param {number} mins - Duration in minutes (should be an integer, 1–120).
   */
  function saveDuration(mins) {
    const errorEl = document.getElementById('duration-error');

    /**
     * Shows an inline validation error and aborts.
     * @param {string} message
     */
    function _showDurationError(message) {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    }

    function _clearDurationError() {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    // Coerce to number (handles string inputs from <input type="number">)
    const num = Number(mins);

    if (
      !Number.isInteger(num) ||
      num < 1 ||
      num > 120
    ) {
      _showDurationError('Please enter a whole number between 1 and 120.');
      return;
    }

    _clearDurationError();

    // Persist and update state (Requirements 3.11)
    StorageModule.write('dld_pomodoro_duration', num);
    fullDuration = num * 60;
    reset(); // also updates the display and unlocks controls
  }

  // -------------------------------------------------------------------------
  // init — Task 6.2
  // -------------------------------------------------------------------------

  /**
   * Initialises the Focus Timer widget:
   *   1. Reads the stored Pomodoro duration from Storage (default 25 min).
   *   2. Sets fullDuration and remainingSeconds accordingly.
   *   3. Updates the display to show the initial MM:SS.
   *   4. Wires Start, Stop, and Reset button click events.
   *   5. Wires the duration-save button click event to saveDuration().
   *
   * Requirements: 3.2, 3.3, 3.9, 3.10, 3.11
   */
  function init() {
    // Restore persisted duration (Requirement 3.3); fall back to 25 min (Requirement 3.2)
    const storedMins = StorageModule.read('dld_pomodoro_duration', 25);
    const safeMins   = Number.isInteger(storedMins) && storedMins >= 1 && storedMins <= 120
      ? storedMins
      : 25;

    fullDuration      = safeMins * 60;
    remainingSeconds  = fullDuration;

    // Pre-fill the duration input with the stored/default value
    const durationInput = document.getElementById('duration-input');
    if (durationInput) {
      durationInput.value = safeMins;
    }

    // Update the countdown display
    _updateDisplay();

    // Wire timer control buttons
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn) startBtn.addEventListener('click', start);
    if (stopBtn)  stopBtn.addEventListener('click', stop);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    // Wire duration-save button (Requirement 3.10, 3.11)
    const durationSaveBtn = document.getElementById('duration-save');
    if (durationSaveBtn) {
      durationSaveBtn.addEventListener('click', () => {
        const input = document.getElementById('duration-input');
        saveDuration(input ? input.value : '');
      });
    }
  }

  // -------------------------------------------------------------------------
  // Expose public API
  // -------------------------------------------------------------------------
  return {
    formatCountdown,
    start,
    stop,
    reset,
    onComplete,
    saveDuration,
    init,
  };
})();

// ---------------------------------------------------------------------------
// TasksModule
// Manages the to-do list: in-memory task array, CRUD operations, validation,
// and Storage persistence.
// renderAll() and edit logic (beginEdit, confirmEdit, cancelEdit) are
// completed in task 7.2 — a stub is exposed here so data methods can call it.
// ---------------------------------------------------------------------------
const TasksModule = (() => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * In-memory source of truth for all tasks.
   * Populated from Storage by init() (task 7.2).
   * @type {Array<{id: string, description: string, completed: boolean, createdAt: number}>}
   */
  let tasks = [];

  // -------------------------------------------------------------------------
  // Pure validation
  // -------------------------------------------------------------------------

  /**
   * Pure function: validates a task description.
   * Returns true iff the trimmed text is between 1 and 200 characters
   * (inclusive) and contains at least one non-whitespace character.
   * Returns false for empty strings, whitespace-only strings, or strings
   * whose trimmed length exceeds 200 characters.
   * Requirements 4.1, 4.3
   *
   * @param {string} text - Raw description string from the user.
   * @returns {boolean}
   */
  function validateDescription(text) {
    if (typeof text !== 'string') return false;
    const trimmed = text.trim();
    return trimmed.length >= 1 && trimmed.length <= 200;
  }

  // -------------------------------------------------------------------------
  // Inline error helper
  // -------------------------------------------------------------------------

  /**
   * Displays or clears an inline validation error message adjacent to the
   * new-task input field (#task-input-error).
   * @param {string} message - The error text to show; pass '' to clear.
   */
  function _setTaskInputError(message) {
    const errorEl = document.getElementById('task-input-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }
  }

  // -------------------------------------------------------------------------
  // DOM rendering (task 7.2)
  // -------------------------------------------------------------------------

  /**
   * Full re-render of the task list from the in-memory `tasks` array.
   * Clears #task-list-items and rebuilds it.
   * If the array is empty, the list is left empty with no error (Requirement 4.13).
   * Each task row contains:
   *   - a completion toggle button (visually a checkbox)
   *   - description text (line-through when completed)
   *   - an edit button
   *   - a delete button
   * Requirements: 4.4, 4.6, 4.12, 4.13
   */
  function renderAll() {
    const listEl = document.getElementById('task-list-items');
    if (!listEl) return;

    // Wipe existing children
    listEl.innerHTML = '';

    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' task-item--completed' : '');
      li.dataset.id = task.id;

      // --- Completion toggle ---
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'task-toggle';
      toggleBtn.setAttribute(
        'aria-label',
        task.completed ? `Mark "${task.description}" as incomplete` : `Mark "${task.description}" as complete`
      );
      toggleBtn.setAttribute('aria-pressed', String(task.completed));
      toggleBtn.textContent = task.completed ? '✅' : '⬜';
      toggleBtn.addEventListener('click', () => toggleComplete(task.id));

      // --- Description text ---
      const descSpan = document.createElement('span');
      descSpan.className = 'task-description';
      if (task.completed) {
        descSpan.style.textDecoration = 'line-through';
        descSpan.style.opacity = '0.6';
      }
      descSpan.textContent = task.description;

      // --- Edit button ---
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit-btn';
      editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => beginEdit(task.id));

      // --- Delete button ---
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'task-delete-btn';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      li.appendChild(toggleBtn);
      li.appendChild(descSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    }
  }

  // -------------------------------------------------------------------------
  // Edit-mode operations (task 7.2)
  // -------------------------------------------------------------------------

  /**
   * Switches a task row into edit mode.
   * Finds the task's <li> element and replaces the description span +
   * action buttons with a pre-filled <input>, a confirm button, and a
   * cancel button.
   * Requirement 4.7
   *
   * @param {string} id - UUID of the task to edit.
   */
  function beginEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const listEl = document.getElementById('task-list-items');
    if (!listEl) return;

    const li = listEl.querySelector(`[data-id="${id}"]`);
    if (!li) return;

    // Clear the row content and rebuild in edit mode
    li.innerHTML = '';

    // Pre-filled input (Requirement 4.7)
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = task.description;
    editInput.maxLength = 200;
    editInput.setAttribute('aria-label', 'Edit task description');

    // Inline error span for validation feedback
    const editErrorSpan = document.createElement('span');
    editErrorSpan.className = 'inline-error task-edit-error';
    editErrorSpan.setAttribute('aria-live', 'polite');
    editErrorSpan.hidden = true;

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'task-confirm-btn';
    confirmBtn.setAttribute('aria-label', 'Confirm edit');
    confirmBtn.textContent = '✔️';
    confirmBtn.addEventListener('click', () => confirmEdit(id, editInput.value));

    // Allow Enter key to confirm edit
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmEdit(id, editInput.value);
      if (e.key === 'Escape') cancelEdit(id);
    });

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'task-cancel-btn';
    cancelBtn.setAttribute('aria-label', 'Cancel edit');
    cancelBtn.textContent = '✖️';
    cancelBtn.addEventListener('click', () => cancelEdit(id));

    li.appendChild(editInput);
    li.appendChild(editErrorSpan);
    li.appendChild(confirmBtn);
    li.appendChild(cancelBtn);

    // Focus the input for immediate typing
    editInput.focus();
    editInput.select();
  }

  /**
   * Confirms an in-progress edit.
   * Validates the new text; if invalid, shows an inline error and keeps the
   * task in edit state (Requirement 4.9). If valid, updates the in-memory
   * array, persists to Storage, and calls renderAll() (Requirement 4.8).
   *
   * @param {string} id   - UUID of the task being edited.
   * @param {string} text - Current value of the edit input.
   */
  function confirmEdit(id, text) {
    if (!validateDescription(text)) {
      // Keep edit mode active; show inline error (Requirement 4.9)
      const listEl = document.getElementById('task-list-items');
      if (listEl) {
        const li = listEl.querySelector(`[data-id="${id}"]`);
        if (li) {
          const errorSpan = li.querySelector('.task-edit-error');
          if (errorSpan) {
            errorSpan.textContent = 'Description must be 1–200 non-whitespace characters.';
            errorSpan.hidden = false;
          }
        }
      }
      return;
    }

    const task = tasks.find(t => t.id === id);
    if (task) {
      task.description = text.trim();
      StorageModule.write('dld_tasks', tasks);
    }

    renderAll();
  }

  /**
   * Cancels an in-progress edit, discarding any changes.
   * Re-renders from the unchanged in-memory array (Requirement 4.10).
   *
   * @param {string} id - UUID of the task whose edit is cancelled.
   */
  function cancelEdit(id) {
    renderAll();
  }

  // -------------------------------------------------------------------------
  // Module initialisation (task 7.2)
  // -------------------------------------------------------------------------

  /**
   * Initialises the Task List widget:
   *   1. Loads the persisted task array from Storage (Requirement 4.12).
   *   2. Renders the list immediately (empty list if none, Requirement 4.13).
   *   3. Wires the new-task form submit event (Requirement 4.1, 4.2, 4.3).
   */
  function init() {
    // Load persisted tasks; fall back to empty array if absent or unreadable
    const stored = StorageModule.read('dld_tasks', []);
    tasks = Array.isArray(stored) ? stored : [];

    renderAll();

    const form = document.getElementById('task-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('task-input');
        if (input) {
          const value = input.value;
          addTask(value);
          // Clear the input only when the description was valid
          if (validateDescription(value)) {
            input.value = '';
          }
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Core data operations
  // -------------------------------------------------------------------------

  /**
   * Adds a new task to the list if the description is valid.
   * Shows an inline error and returns early if validation fails.
   * On success: creates a Task object, appends it to the in-memory array,
   * persists to Storage, and re-renders the list.
   * Requirement 4.1, 4.2, 4.3
   *
   * @param {string} description - Raw text entered by the user.
   */
  function addTask(description) {
    if (!validateDescription(description)) {
      _setTaskInputError('Please enter a task description (1–200 characters).');
      return;
    }

    // Clear any previous error
    _setTaskInputError('');

    const task = {
      id: crypto.randomUUID(),
      description: description.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    tasks.push(task);
    StorageModule.write('dld_tasks', tasks);
    renderAll();
  }

  /**
   * Removes the task with the given id from the list.
   * Persists the updated array to Storage and re-renders.
   * Requirement 4.11
   *
   * @param {string} id - The UUID of the task to delete.
   */
  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    StorageModule.write('dld_tasks', tasks);
    renderAll();
  }

  /**
   * Flips the `completed` boolean of the task with the given id.
   * Persists the updated array to Storage and re-renders.
   * Requirements 4.5, 4.6
   *
   * @param {string} id - The UUID of the task to toggle.
   */
  function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      StorageModule.write('dld_tasks', tasks);
      renderAll();
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  return {
    validateDescription,
    addTask,
    deleteTask,
    toggleComplete,
    renderAll,
    beginEdit,
    confirmEdit,
    cancelEdit,
    init,
  };
})();

// ---------------------------------------------------------------------------
// QuickLinksModule
// Manages the quick-links launcher: in-memory links array, URL normalisation,
// validation, CRUD operations, Storage persistence, and DOM rendering.
// Max 20 links enforced; add form is disabled when the cap is reached.
// ---------------------------------------------------------------------------
const QuickLinksModule = (() => {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * In-memory source of truth for all quick links.
   * Populated from Storage by init().
   * @type {Array<{id: string, label: string, url: string}>}
   */
  let links = [];

  // -------------------------------------------------------------------------
  // DOM helpers
  // -------------------------------------------------------------------------

  /**
   * Enables or disables the add-link form controls.
   * When disabled, the label/url inputs and Add button are all disabled and
   * the max-reached message is shown.
   * @param {boolean} disabled
   */
  function _setFormDisabled(disabled) {
    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    const addBtn     = document.getElementById('link-add-btn');
    const maxMsg     = document.getElementById('link-max-reached');

    if (labelInput) labelInput.disabled = disabled;
    if (urlInput)   urlInput.disabled   = disabled;
    if (addBtn)     addBtn.disabled     = disabled;
    if (maxMsg)     maxMsg.hidden       = !disabled;
  }

  /**
   * Shows or clears the inline error message on the add-link form.
   * @param {string} message - Error text; pass '' to clear.
   */
  function _setFormError(message) {
    const errorEl = document.getElementById('link-form-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }
  }

  // -------------------------------------------------------------------------
  // Pure functions
  // -------------------------------------------------------------------------

  /**
   * Pure function: ensures the URL starts with a valid http/https scheme.
   * If the URL already begins with 'http://' or 'https://', it is returned
   * unchanged. Otherwise, 'https://' is prepended.
   * The function is idempotent: normaliseUrl(normaliseUrl(url)) === normaliseUrl(url).
   * Requirement 5.4
   *
   * @param {string} url - Raw URL string from the user.
   * @returns {string} URL guaranteed to begin with 'http://' or 'https://'.
   */
  function normaliseUrl(url) {
    if (typeof url !== 'string') return 'https://';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
  }

  /**
   * Pure function: validates a label/url pair before adding a link.
   * Returns { ok: true, errors: [] } when both fields are non-empty after trim.
   * Returns { ok: false, errors: [...] } listing each missing field.
   * Requirement 5.3
   *
   * @param {string} label - Display label for the link.
   * @param {string} url   - Target URL for the link.
   * @returns {{ ok: boolean, errors: string[] }}
   */
  function validateLink(label, url) {
    const errors = [];
    if (!label || label.trim() === '') {
      errors.push('Label is required');
    }
    if (!url || url.trim() === '') {
      errors.push('URL is required');
    }
    return { ok: errors.length === 0, errors };
  }

  // -------------------------------------------------------------------------
  // DOM rendering
  // -------------------------------------------------------------------------

  /**
   * Full re-render of the quick-links list from the in-memory `links` array.
   * Clears #quick-links-items and rebuilds it.
   * If the array is empty, the list is left empty with no error (Requirement 5.9).
   * Each link row contains:
   *   - a launch button (opens url in a new tab, rel="noopener noreferrer")
   *   - a delete button
   * Requirements: 5.5, 5.6, 5.9
   */
  function renderAll() {
    const listEl = document.getElementById('quick-links-items');
    if (!listEl) return;

    // Wipe existing children
    listEl.innerHTML = '';

    for (const link of links) {
      const li = document.createElement('li');
      li.className = 'quick-link-item';
      li.dataset.id = link.id;

      // --- Launch button (opens URL in new tab) ---
      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'quick-link-btn';
      launchBtn.setAttribute('aria-label', `Open ${link.label}`);
      launchBtn.textContent = link.label;
      launchBtn.addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      // --- Delete button ---
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'quick-link-delete-btn';
      deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', () => deleteLink(link.id));

      li.appendChild(launchBtn);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    }
  }

  // -------------------------------------------------------------------------
  // Core data operations
  // -------------------------------------------------------------------------

  /**
   * Adds a new link to the list if validation passes and the 20-link cap
   * has not been reached.
   *
   * Steps (Requirement 5.2, 5.3, 5.4, 5.10, 5.11):
   *   1. If links.length >= 20, disable the form and show max-reached, return.
   *   2. Validate label and url; if invalid, show inline errors, return.
   *   3. Normalise the URL (prepend https:// if no scheme).
   *   4. Create a Link object and push to `links`.
   *   5. Attempt to persist to Storage; on failure, roll back and show error.
   *   6. Re-render the list.
   *   7. If links.length is now 20, disable the form.
   *
   * @param {string} label - Display label entered by the user.
   * @param {string} url   - Target URL entered by the user.
   */
  function addLink(label, url) {
    // Cap guard (Requirement 5.10)
    if (links.length >= 20) {
      _setFormDisabled(true);
      return;
    }

    // Validation (Requirement 5.3)
    const { ok, errors } = validateLink(label, url);
    if (!ok) {
      _setFormError(errors.join(' · '));
      return;
    }

    // Clear any previous error
    _setFormError('');

    // Normalise URL (Requirement 5.4)
    const normalisedUrl = normaliseUrl(url.trim());

    // Build Link object
    const link = {
      id: crypto.randomUUID(),
      label: label.trim(),
      url: normalisedUrl,
    };

    // Optimistically push, then try to persist
    links.push(link);

    try {
      StorageModule.write('dld_links', links);
    } catch (e) {
      // Roll back on storage failure (Requirement 5.11)
      links.pop();
      _setFormError('Save failed');
      return;
    }

    renderAll();

    // Disable form if cap is now reached (Requirement 5.10)
    if (links.length >= 20) {
      _setFormDisabled(true);
    }
  }

  /**
   * Removes the link with the given id from the list.
   * Persists the updated array to Storage, re-renders, and re-enables the
   * add form if the count drops below 20.
   * Requirement 5.7
   *
   * @param {string} id - The UUID of the link to delete.
   */
  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    StorageModule.write('dld_links', links);
    renderAll();

    // Re-enable add form if below cap (Requirement 5.10)
    if (links.length < 20) {
      _setFormDisabled(false);
    }
  }

  // -------------------------------------------------------------------------
  // Module initialisation
  // -------------------------------------------------------------------------

  /**
   * Initialises the Quick Links widget:
   *   1. Loads the persisted links array from Storage (Requirement 5.8).
   *   2. Renders the list immediately (empty list if none, Requirement 5.9).
   *   3. Disables the add form if already at the 20-link cap (Requirement 5.10).
   *   4. Wires the add-link form submit event (Requirement 5.1, 5.2).
   */
  function init() {
    // Restore persisted links; fall back to empty array if absent or unreadable
    const stored = StorageModule.read('dld_links', []);
    links = Array.isArray(stored) ? stored : [];

    renderAll();

    // If already at cap on load, disable the form immediately (Requirement 5.10)
    if (links.length >= 20) {
      _setFormDisabled(true);
    }

    // Wire the add-link form submit event
    const form = document.getElementById('link-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const labelInput = document.getElementById('link-label-input');
        const urlInput   = document.getElementById('link-url-input');
        const label = labelInput ? labelInput.value : '';
        const url   = urlInput   ? urlInput.value   : '';

        addLink(label, url);

        // Clear inputs only on successful add (check form is still enabled / error is clear)
        const errorEl = document.getElementById('link-form-error');
        const hasError = errorEl && !errorEl.hidden && errorEl.textContent !== '';
        if (!hasError) {
          if (labelInput) labelInput.value = '';
          if (urlInput)   urlInput.value   = '';
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  return {
    normaliseUrl,
    validateLink,
    addLink,
    deleteLink,
    renderAll,
    init,
  };
})();

// ---------------------------------------------------------------------------
// Bootstrap — top-level DOMContentLoaded listener
// Boot order (critical):
//   1. ThemeModule.applyStoredTheme()  ← MUST run first to prevent FOUC
//   2. StorageModule.isAvailable()     ← show warning banner if unavailable
//   3. ThemeModule.init()              ← wire theme-toggle click event
//   4. GreetingModule.init()
//   5. NameModule.init()
//   6. TimerModule.init()
//   7. TasksModule.init()
//   8. QuickLinksModule.init()
// Requirements: 8.1, 8.4, 8.5, 8.6, 7.5
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Step 1: Apply stored theme immediately — before any widget renders —
  // so no frame with the wrong theme is ever painted (Requirement 6.4).
  ThemeModule.applyStoredTheme();

  // Step 2: Check localStorage availability; show the non-blocking warning
  // banner if unavailable (Requirement 7.5).
  if (!StorageModule.isAvailable()) {
    const banner = document.getElementById('storage-warning');
    if (banner) {
      banner.hidden = false;
    }
  }

  // Step 3: Wire the theme-toggle button click event (Requirement 6.1, 6.8).
  ThemeModule.init();

  // Step 4–8: Initialise feature modules in dependency order.
  GreetingModule.init();
  NameModule.init();
  TimerModule.init();
  TasksModule.init();
  QuickLinksModule.init();
});

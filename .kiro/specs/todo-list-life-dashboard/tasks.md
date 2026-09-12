# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement the To-Do List Life Dashboard as three static files (`index.html`, `css/styles.css`, `js/app.js`) with no build tooling or external dependencies. All modules are written as ES6+ namespace objects inside a single `app.js`. Work proceeds bottom-up: StorageModule first (shared by all others), then ThemeModule (must run before first paint), then the four feature modules, then HTML/CSS, and finally wiring and tests.

---

## Tasks

- [x] 1. Scaffold project files and directory structure
  - Create `index.html` at the project root with the full HTML skeleton: `<head>` with charset, viewport, title, `<link>` to `css/styles.css`; `<body>` containing a storage-warning banner (`id="storage-warning"`, hidden), a `<header>` with app title and theme-toggle `<button>`, a settings row (`<div class="settings-row">`) holding the name input + save button and the pomodoro-duration input + save button, a `<main class="dashboard-grid">` with four `<section>` cards (ids: `greeting-widget`, `focus-timer`, `task-list`, `quick-links`), and a `<script src="js/app.js" defer>` tag.
  - Create empty `css/styles.css` and `js/app.js` placeholder files.
  - Create `tests/` directory with a blank `property-tests.html`.
  - _Requirements: 8.1, 8.2, 8.3, 8.6_

- [x] 2. Implement StorageModule
  - [x] 2.1 Write the `StorageModule` namespace object in `js/app.js`
    - Implement `isAvailable()`: wraps a `localStorage.setItem`/`removeItem` probe in try/catch; returns `true` on success, `false` if it throws.
    - Implement `read(key, fallback)`: reads `localStorage.getItem(key)`; if `null` returns fallback; wraps `JSON.parse` in try/catch — on error, calls `console.warn` with key and raw value, returns fallback.
    - Implement `write(key, value)`: calls `localStorage.setItem(key, JSON.stringify(value))`; catches `QuotaExceededError` / `NS_ERROR_DOM_QUOTA_REACHED` and calls a module-internal `_showStorageBanner()` helper that un-hides the `#storage-warning` element.
    - Implement `remove(key)`: calls `localStorage.removeItem(key)`.
    - All keys must be prefixed `dld_`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x]* 2.2 Write property tests for StorageModule (P4, P5)
    - Set up `tests/property-tests.html`: load fast-check from CDN, expose `StorageModule` globally (or inline a mock), set up a minimal test runner that logs pass/fail to the page.
    - **Property 4: Task list round-trip through Storage** — for any `Task[]` array, `write('dld_tasks', tasks)` then `read('dld_tasks', [])` produces a deep-equal array.
    - **Property 5: Link list round-trip through Storage** — for any `Link[]` array, `write('dld_links', links)` then `read('dld_links', [])` produces a deep-equal array.
    - Configure each property with minimum 100 iterations.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 4: Task list round-trip`
    - _Requirements: 7.2, 7.3, 4.2, 4.12, 5.2, 5.8_

- [x] 3. Implement ThemeModule
  - [x] 3.1 Write the `ThemeModule` namespace object in `js/app.js`
    - Implement `applyStoredTheme()`: reads `StorageModule.read('dld_theme', 'light')`; if the value is not `'light'` or `'dark'`, defaults to `'light'`; sets `document.documentElement.setAttribute('data-theme', theme)`.
    - Implement `toggle()`: reads current `data-theme` from `document.documentElement`; computes `newTheme`; calls `setAttribute`; calls `StorageModule.write('dld_theme', newTheme)`; updates the toggle button's `aria-label` and icon (e.g., swap ☀️/🌙 text content).
    - `applyStoredTheme()` MUST be the first call inside the `DOMContentLoaded` listener (before any other module's `init()`).
    - Wire the theme-toggle button's `click` event to `ThemeModule.toggle()` inside `init()`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

  - [x]* 3.2 Write property tests for ThemeModule (P10, P11)
    - **Property 10: Theme toggle is its own inverse** — mock `document.documentElement` attribute; for each initial value in `['light', 'dark']`, calling `toggle()` twice returns `data-theme` to the original value.
    - **Property 11: Invalid theme values default to light** — for any string not in `['light', 'dark']`, `applyStoredTheme()` (with mocked storage) sets `data-theme` to `'light'`.
    - Minimum 100 iterations each.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 10: Theme toggle is its own inverse`
    - _Requirements: 6.1, 6.2, 6.7_

- [x] 4. Implement GreetingModule and NameModule
  - [x] 4.1 Write the `GreetingModule` namespace object in `js/app.js`
    - Implement pure `getGreeting(hour)`: returns `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), `"Good Evening"` (18–21), `"Good Night"` (22–23, 0–4); never returns empty string, never throws.
    - Implement pure `formatTime(date)`: returns zero-padded `HH:MM` string from a `Date` object.
    - Implement pure `formatDate(date)`: returns human-readable string (e.g., `"Monday, 7 September 2026"`) using `toLocaleDateString` with weekday/year/month/day options.
    - Implement `renderDateTime()`: reads `new Date()`, updates the clock element (`#greeting-time`), date element (`#greeting-date`), and greeting+name element (`#greeting-message`) in the DOM.
    - Implement `updateName(name)`: stores the name in a module-scoped variable; calls `renderDateTime()` to refresh the greeting.
    - Implement `init()`: calls `renderDateTime()` once immediately; sets `setInterval(renderDateTime, 60_000)`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 4.2 Write the `NameModule` namespace object in `js/app.js`
    - Implement `init()`: pre-fills the name input (`#name-input`) with `StorageModule.read('dld_name', '')`; calls `GreetingModule.updateName()` with the stored value; wires the save button (`#name-save`) `click` event to `save()`.
    - Implement `save(rawInput)`: trims input; if result is empty or whitespace-only, calls `StorageModule.remove('dld_name')` and `GreetingModule.updateName('')`; otherwise, if length ≤ 50, calls `StorageModule.write('dld_name', trimmed)` and `GreetingModule.updateName(trimmed)`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 4.3 Write property tests for GreetingModule (P1, P12)
    - **Property 1: Greeting string covers all hours without gaps** — for any integer in 0–23, `getGreeting(hour)` returns one of the four expected strings and never returns empty or throws.
    - **Property 12: Name truncation at 50 characters** — implement and test a `renderName(storedName)` pure helper that returns at most 50 characters; for any string input the result is `≤ 50` chars.
    - Minimum 100 iterations each.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 1: Greeting string covers all hours`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.10_

- [x] 5. Checkpoint — Verify Storage, Theme, and Greeting modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement TimerModule
  - [x] 6.1 Write the core `TimerModule` state machine in `js/app.js`
    - Declare state variables: `state` (`'IDLE'|'RUNNING'|'PAUSED'|'COMPLETE'`), `remainingSeconds`, `fullDuration`, `_intervalId`.
    - Implement pure `formatCountdown(s)`: zero-pads both minutes and seconds; returns `"MM:SS"`; never throws for `0 ≤ s ≤ 7199`.
    - Implement `_tick()`: if state is not `'RUNNING'`, no-op; otherwise decrement `remainingSeconds`; update display; if `remainingSeconds === 0`, call `onComplete()`.
    - Implement `start()`: if state is `'IDLE'` or `'PAUSED'`, set state to `'RUNNING'`, lock duration input + save button, call `setInterval(_tick, 1000)`.
    - Implement `stop()`: if state is `'RUNNING'`, clear interval, set state to `'PAUSED'`.
    - Implement `reset()`: clear interval, set `remainingSeconds = fullDuration`, set state to `'IDLE'`, update display, unlock duration input + save button.
    - Implement `onComplete()`: clear interval, set state to `'COMPLETE'`, display 00:00, show on-screen completion banner (≥3s visible), check `Notification.permission === 'granted'` and fire `new Notification(...)` only if granted.
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 6.2 Write `TimerModule.saveDuration` and `init` in `js/app.js`
    - Implement `saveDuration(mins)`: validates that `mins` is an integer in 1–120; if invalid, shows inline error adjacent to the duration input and returns without writing to Storage; if valid, calls `StorageModule.write('dld_pomodoro_duration', mins)`, sets `fullDuration = mins * 60`, calls `reset()` to update display.
    - Implement `init()`: reads `StorageModule.read('dld_pomodoro_duration', 25)`, sets `fullDuration` and `remainingSeconds`, updates display; wires Start/Stop/Reset button click events; wires duration-save button click event to `saveDuration`.
    - _Requirements: 3.2, 3.3, 3.10, 3.11, 3.12_

  - [x]* 6.3 Write property tests for TimerModule (P8, P9)
    - **Property 8: Timer countdown format is always valid MM:SS** — for any integer `s` in `0–7199`, `formatCountdown(s)` matches `^\d{2}:\d{2}$` and the seconds part is in range `00–59`.
    - **Property 9: Pomodoro duration validation enforces 1–120 range** — for any integer outside `1–120`, `saveDuration` does not write to Storage (mock Storage); for any integer in `1–120`, it does write.
    - Minimum 100 iterations each.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 8: Timer countdown format is always valid`
    - _Requirements: 3.1, 3.10, 3.12_

- [x] 7. Implement TasksModule
  - [x] 7.1 Write `TasksModule` core data logic in `js/app.js`
    - Declare module-scoped `tasks` array (source of truth).
    - Implement pure `validateDescription(text)`: returns `true` iff text has length 1–200 after trim and contains at least one non-whitespace character; returns `false` for empty or whitespace-only strings.
    - Implement `addTask(description)`: calls `validateDescription`; if invalid, shows inline error and returns; otherwise creates `{ id: crypto.randomUUID(), description: description.trim(), completed: false, createdAt: Date.now() }`, pushes to `tasks`, calls `StorageModule.write('dld_tasks', tasks)`, calls `renderAll()`.
    - Implement `deleteTask(id)`: filters `tasks` by id, writes to Storage, calls `renderAll()`.
    - Implement `toggleComplete(id)`: finds task by id, flips `completed`, writes to Storage, calls `renderAll()`.
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.11_

  - [x] 7.2 Write `TasksModule` edit logic and `renderAll` in `js/app.js`
    - Implement `beginEdit(id)`: finds the task's DOM element; replaces display text with a pre-filled `<input>` plus confirm and cancel buttons.
    - Implement `confirmEdit(id, text)`: calls `validateDescription(text)`; if invalid, keeps task in edit state with inline error; if valid, updates `tasks` array, writes to Storage, calls `renderAll()`.
    - Implement `cancelEdit(id)`: calls `renderAll()` without saving changes.
    - Implement `renderAll()`: clears the task list container (`#task-list-items`); for each task in `tasks`, creates a list item with: completion toggle (checkbox or button), description text (struck-through if `completed`), edit button, delete button; if `tasks` is empty, renders an empty list with no error.
    - Implement `init()`: loads `tasks` from `StorageModule.read('dld_tasks', [])`, calls `renderAll()`, wires the new-task form submit event.
    - _Requirements: 4.4, 4.7, 4.8, 4.9, 4.10, 4.12, 4.13_

  - [x]* 7.3 Write property tests for TasksModule (P2, P3)
    - **Property 2: Whitespace-only task descriptions are always rejected** — for any string composed entirely of whitespace, `validateDescription(str)` returns `false`.
    - **Property 3: Valid task descriptions are always accepted** — for any string of length 1–200 with at least one non-whitespace character, `validateDescription(str)` returns `true`.
    - Minimum 100 iterations each.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 2: Whitespace-only descriptions rejected`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Checkpoint — Verify Timer and Task modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement QuickLinksModule
  - [x] 9.1 Write `QuickLinksModule` core logic in `js/app.js`
    - Declare module-scoped `links` array.
    - Implement pure `normaliseUrl(url)`: if `url` does not start with `http://` or `https://`, prepend `https://`; return the (possibly modified) url. The function must be idempotent.
    - Implement `validateLink(label, url)`: returns `{ ok: boolean, errors: string[] }`; errors include "Label is required" if label is empty/whitespace and "URL is required" if url is empty/whitespace.
    - Implement `addLink(label, url)`: if `links.length >= 20`, disable add form and show max-reached message, return; call `validateLink` — if not ok, display inline errors, return; call `normaliseUrl(url)`; create `{ id: crypto.randomUUID(), label: label.trim(), url: normalisedUrl }`; push to `links`; call `StorageModule.write('dld_links', links)` — if write fails (catch), roll back the push, show inline error "Save failed", return; call `renderAll()`; if `links.length === 20`, disable add form.
    - Implement `deleteLink(id)`: filters `links`, writes to Storage, calls `renderAll()`; if `links.length < 20`, re-enable add form.
    - Implement `renderAll()`: clears `#quick-links-items`; for each link renders a button (opens `url` in new tab, `target="_blank" rel="noopener noreferrer"`) with `label` text and a delete button.
    - Implement `init()`: loads `links` from `StorageModule.read('dld_links', [])`, calls `renderAll()`, wires add-link form submit event; if `links.length >= 20` at load time, disable add form.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [x]* 9.2 Write property tests for QuickLinksModule (P6, P7)
    - **Property 6: URL normalisation is idempotent** — for any URL string, `normaliseUrl(normaliseUrl(url)) === normaliseUrl(url)`.
    - **Property 7: URL scheme normalisation correctness** — for any URL already starting with `http://` or `https://`, `normaliseUrl(url)` returns it unchanged; for any URL without a scheme, the result starts with `https://`.
    - Minimum 100 iterations each.
    - Tag format: `// Feature: todo-list-life-dashboard, Property 6: URL normalisation is idempotent`
    - _Requirements: 5.4_

- [x] 10. Write CSS in `css/styles.css`
  - [x] 10.1 Write CSS custom properties and theming
    - Declare `:root` custom properties: `--color-bg`, `--color-surface`, `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-danger`, `--color-success`, `--color-timer-active`, `--shadow`, `--radius`, `--font-base` (`16px`), `--touch-target` (`44px`).
    - Declare `[data-theme="dark"]` overrides for all colour variables as specified in the design document.
    - All `--color-text` / `--color-bg` and `--color-text` / `--color-surface` pairs must satisfy WCAG 4.5:1 minimum contrast.
    - _Requirements: 6.1, 6.2, 6.6, 9.3_

  - [x] 10.2 Write responsive layout and widget card styles
    - Style `body`: `background: var(--color-bg)`, `color: var(--color-text)`, `font-size: var(--font-base)`.
    - Style `.dashboard-grid`: CSS Grid, `grid-template-columns: 1fr` (mobile-first), `gap: 1.5rem`, `padding: 1rem`; at `@media (min-width: 768px)` switch to `grid-template-columns: repeat(2, 1fr)`.
    - Style widget `<section>` cards: `background: var(--color-surface)`, `border-radius: var(--radius)`, `box-shadow: var(--shadow)`, `padding: 1.25rem`.
    - Style all interactive controls (`button`, `input`): `min-width: var(--touch-target)`, `min-height: var(--touch-target)`.
    - Style task items: completed state uses `text-decoration: line-through` and reduced `opacity`.
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6_

- [x] 11. Wire everything together in `js/app.js` `init()` and add accessibility attributes to `index.html`
  - [x] 11.1 Write `init()` bootstrap and wire all modules
    - Write the top-level `DOMContentLoaded` listener that calls, in order: `ThemeModule.applyStoredTheme()`, `GreetingModule.init()`, `NameModule.init()`, `TimerModule.init()`, `TasksModule.init()`, `QuickLinksModule.init()`.
    - After `ThemeModule.applyStoredTheme()`, call `StorageModule.isAvailable()` — if false, un-hide `#storage-warning`.
    - Confirm all button click and form submit events are wired (theme toggle, name save, duration save, task add, quick link add).
    - _Requirements: 8.1, 8.4, 8.5, 8.6, 7.5_

  - [x] 11.2 Add accessibility attributes in `index.html`
    - Add `role="timer"` and `aria-live="polite"` to the timer countdown display element.
    - Add `aria-label` to the theme-toggle button; update `aria-label` on toggle.
    - Ensure all form inputs have associated `<label>` elements (visible or `aria-label`).
    - Ensure all icon-only buttons have descriptive `aria-label` attributes (edit, delete, confirm, cancel).
    - _Requirements: 9.6_

  - [x]* 11.3 Write unit tests for module integration in `tests/property-tests.html`
    - Task CRUD lifecycle: add a task → verify in array → toggle complete → verify state → edit description → verify → delete → verify empty.
    - Timer state transitions: IDLE → start → RUNNING → stop → PAUSED → reset → IDLE.
    - Quick Links max-20 boundary: add 20 links → verify form disabled → attempt 21st → verify rejected.
    - Storage corrupt JSON fallback: write malformed string directly to `localStorage`, call `StorageModule.read` → verify fallback returned and `console.warn` called.
    - Theme no-flash: call `applyStoredTheme()` with `'dark'` in mocked storage → verify `data-theme="dark"` is set synchronously.
    - _Requirements: 4.2–4.13, 3.4–3.6, 5.2–5.10, 7.4, 6.4_

- [x] 12. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The design has 12 correctness properties (P1–P12); all are covered by property test sub-tasks above
- Property tests run in `tests/property-tests.html` using fast-check from CDN — this file is not shipped with the app
- Each property test must use the tag format: `// Feature: todo-list-life-dashboard, Property N: <text>`
- Each property test must run a minimum of 100 iterations
- `ThemeModule.applyStoredTheme()` must always be the very first call in `DOMContentLoaded` to prevent flash of wrong theme
- All `localStorage` keys must use the `dld_` prefix to avoid collisions
- `crypto.randomUUID()` is used for all id generation (no external library needed)
- The `<script>` tag for `app.js` must use the `defer` attribute (Requirement 8.6)

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["6.1", "7.1"] },
    { "id": 6, "tasks": ["6.2", "7.2", "9.1"] },
    { "id": 7, "tasks": ["6.3", "7.3", "9.2", "10.1"] },
    { "id": 8, "tasks": ["10.2"] },
    { "id": 9, "tasks": ["11.1"] },
    { "id": 10, "tasks": ["11.2", "11.3"] }
  ]
}
```

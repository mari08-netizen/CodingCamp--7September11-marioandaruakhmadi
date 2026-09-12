# Design Document — To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a single-page, client-side web application delivered as three static files (`index.html`, `css/styles.css`, `js/app.js`). It requires no server, no build step, and no external dependencies. All user data is stored exclusively in the browser's `localStorage`.

The application presents four functional widgets on a single page:

1. **Greeting Widget** — live clock, date, personalised greeting
2. **Focus Timer** — configurable Pomodoro countdown
3. **Task List** — full CRUD to-do list
4. **Quick Links** — URL-shortcut launcher (max 20)

A global **Light / Dark Mode** toggle and a **Custom Name** input complete the feature set.

The design follows a module-per-concern pattern entirely within a single `app.js` file, using ES6 module-style IIFE/namespace objects to keep concerns separated without requiring a bundler. CSS custom properties (variables) drive theming so the dark/light switch is a single class toggle on `<html>` or `<body>`.

---

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐ │
│  │  Greeting    │  │  FocusTimer  │  │ TaskList │  │ Quick  │ │
│  │  Widget      │  │  Widget      │  │ Widget   │  │ Links  │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └───┬────┘ │
│         │                 │               │             │      │
│  ┌──────▼─────────────────▼───────────────▼─────────────▼────┐ │
│  │                   app.js (ES6+)                            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │ │
│  │  │Greeting  │ │Timer     │ │Tasks     │ │QuickLinks   │  │ │
│  │  │Module    │ │Module    │ │Module    │ │Module       │  │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘  │ │
│  │       └────────────┴────────────┴──────────────┘         │ │
│  │                         │                                  │ │
│  │                  ┌──────▼──────┐                          │ │
│  │                  │  Storage    │                          │ │
│  │                  │  Module     │                          │ │
│  │                  └──────┬──────┘                          │ │
│  └─────────────────────────┼──────────────────────────────────┘ │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  localStorage   │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Module Responsibility Summary

| Module | Responsibility |
|---|---|
| `StorageModule` | All `localStorage` reads/writes; JSON serialisation/deserialisation; quota-error handling |
| `GreetingModule` | Clock interval, date formatting, greeting string logic, name rendering |
| `TimerModule` | Countdown state machine, interval management, notification dispatch, input lock |
| `TasksModule` | Task CRUD, DOM rendering, edit-mode state |
| `QuickLinksModule` | Link CRUD, URL normalisation, DOM rendering, max-20 guard |
| `ThemeModule` | Theme toggling, early-apply on page load (before first paint) |
| `NameModule` | Name input, save/clear logic, delegation to GreetingModule |
| `init()` | Top-level bootstrap; calls early-apply for theme, then initialises each module in order |

### Execution Flow on Page Load

```
DOMContentLoaded
  │
  ├─ ThemeModule.applyStoredTheme()   ← runs synchronously before any widget renders
  ├─ GreetingModule.init()
  │    ├─ renderDateTime()
  │    └─ setInterval(renderDateTime, 60_000)
  ├─ NameModule.init()
  ├─ TimerModule.init()
  ├─ TasksModule.init()
  ├─ QuickLinksModule.init()
  └─ (all widgets visible with correct data)
```

Because `ThemeModule.applyStoredTheme()` runs first (and `app.js` is loaded with `defer`), the theme class is set before the browser paints, eliminating any flash of wrong theme.

---

## Components and Interfaces

### ThemeModule

```
ThemeModule
  applyStoredTheme()        → void   // reads Storage, sets class on <html> immediately
  toggle()                  → void   // flips class, writes to Storage, updates toggle UI
```

Applies theme by adding/removing a `data-theme="dark"` attribute on `<html>`. CSS custom properties scoped to `[data-theme="dark"]` override the default light values.

---

### GreetingModule

```
GreetingModule
  init()                    → void
  renderDateTime()          → void   // updates clock, date, greeting + name in DOM
  getGreeting(hour: number) → string // pure: returns greeting string for given hour
  formatTime(date: Date)    → string // pure: returns HH:MM string
  formatDate(date: Date)    → string // pure: returns human-readable date string
  updateName(name: string)  → void   // called by NameModule after save
```

`getGreeting` is a pure function enabling property-based testing without DOM involvement.

---

### NameModule

```
NameModule
  init()                    → void   // wires input; pre-fills from Storage
  save(rawInput: string)    → void   // trims, validates, writes to Storage, calls GreetingModule.updateName
  clear()                   → void   // removes key from Storage, calls GreetingModule.updateName('')
```

---

### TimerModule

```
TimerModule
  init()                    → void
  start()                   → void   // begins interval, locks duration input
  stop()                    → void   // pauses interval, unlocks nothing (reset unlocks)
  reset()                   → void   // clears interval, restores full duration, unlocks input
  saveDuration(mins: number)→ void   // validates 1–120, writes to Storage, resets display
  onComplete()              → void   // shows on-screen indicator, fires browser notification if permitted
  formatCountdown(s: number)→ string // pure: seconds → "MM:SS"
```

Timer state machine:

```
IDLE ──start()──► RUNNING ──stop()──► PAUSED
  ▲                   │                  │
  └───reset()─────────┘◄────reset()──────┘
  RUNNING ──(reaches 0)──► COMPLETE ──reset()──► IDLE
```

---

### TasksModule

```
TasksModule
  init()                    → void
  addTask(description: string)    → void
  deleteTask(id: string)          → void
  toggleComplete(id: string)      → void
  beginEdit(id: string)           → void
  confirmEdit(id: string, text: string) → void
  cancelEdit(id: string)          → void
  renderAll()                     → void  // full re-render from in-memory array
  validateDescription(text: string) → boolean  // pure: true iff 1–200 non-whitespace chars
```

Tasks are maintained as an in-memory array (source of truth), synced to Storage on every mutation.

---

### QuickLinksModule

```
QuickLinksModule
  init()                    → void
  addLink(label: string, url: string) → void
  deleteLink(id: string)             → void
  normaliseUrl(url: string)          → string  // pure: prepends https:// if missing
  validateLink(label: string, url: string) → { ok: boolean, errors: string[] }
  renderAll()                        → void
```

---

### StorageModule

```
StorageModule
  read<T>(key: string, fallback: T) → T        // parse JSON; on error: log + return fallback
  write(key: string, value: unknown)→ void     // JSON.stringify; on QuotaExceeded: show banner
  remove(key: string)               → void
  isAvailable()                     → boolean  // returns false if localStorage throws
```

---

## Data Models

### localStorage Key Schema

All keys use the prefix `dld_` (Dashboard Life Dashboard) to avoid clashing with other applications sharing the same origin.

| Key | Value type | Description |
|---|---|---|
| `dld_theme` | `"light" \| "dark"` | Active colour scheme |
| `dld_name` | `string` (1–50 chars) | User display name |
| `dld_pomodoro_duration` | `number` (integer, 1–120) | Focus timer duration in minutes |
| `dld_tasks` | `Task[]` (JSON array) | All tasks |
| `dld_links` | `Link[]` (JSON array) | All quick links |

### Task Object

```ts
interface Task {
  id: string;          // UUID v4 generated at creation time (crypto.randomUUID())
  description: string; // 1–200 characters
  completed: boolean;  // false by default
  createdAt: number;   // Date.now() at creation (ms since epoch)
}
```

### Link Object

```ts
interface Link {
  id: string;   // UUID v4
  label: string; // 1–50 characters
  url: string;   // 1–2048 characters, always starts with http:// or https://
}
```

### Validation Rules Summary

| Field | Constraint |
|---|---|
| Name | 1–50 chars after trim; empty/whitespace → clear stored name |
| Task description | 1–200 chars; whitespace-only → rejected |
| Pomodoro duration | integer, 1–120 inclusive |
| Link label | 1–50 chars, non-empty |
| Link URL | 1–2048 chars, non-empty; prepend `https://` if no scheme |
| Max links | 20 links maximum |

---

## CSS Architecture

### File: `css/styles.css`

All theming is driven by CSS custom properties (variables) declared on `:root` (light defaults) and overridden in `[data-theme="dark"]`. No JavaScript manipulates individual colour values.

```css
/* Light theme (default) */
:root {
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-primary: #4a6fa5;
  --color-primary-hover: #3a5f95;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --color-border: #d1d5db;
  --color-danger: #dc2626;
  --color-success: #16a34a;
  --color-timer-active: #4a6fa5;
  --shadow: 0 1px 3px rgba(0,0,0,0.12);
  --radius: 8px;
  --font-base: 16px;
  --touch-target: 44px;
}

/* Dark theme override */
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  --color-border: #334155;
  --color-danger: #f87171;
  --color-success: #4ade80;
  --shadow: 0 1px 3px rgba(0,0,0,0.5);
}
```

### Contrast Compliance

All `--color-text` / `--color-bg` and `--color-text` / `--color-surface` pairs are selected to exceed the WCAG 4.5:1 minimum contrast ratio for normal body text in both themes.

### Responsive Layout

```css
/* Single-column (default, mobile-first) */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 1rem;
}

/* Multi-column at ≥768px */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

Widgets are direct children of `.dashboard-grid`. Each widget is a `<section>` card with `background: var(--color-surface)`, `border-radius: var(--radius)`, and `box-shadow: var(--shadow)`.

All interactive controls (buttons, inputs) set `min-width` and `min-height` to `var(--touch-target)` (44px).

---

## Component Interaction Flows

### Flow 1: Name Save → Greeting Update

```
User types name → clicks Save
  NameModule.save(rawInput)
    → trim + validate length (1–50)
    → StorageModule.write('dld_name', trimmedName)
    → GreetingModule.updateName(trimmedName)
        → updates greeting span in DOM within 500ms (synchronous DOM update)
```

### Flow 2: Timer Lifecycle

```
User sets duration → clicks Save Duration
  TimerModule.saveDuration(mins)
    → validate 1–120 integer
    → StorageModule.write('dld_pomodoro_duration', mins)
    → reset display to MM:00
    → unlock duration input

User clicks Start
  TimerModule.start()
    → lock duration input + Save control
    → setInterval(tick, 1000)
      → each tick: remainingSeconds--; updateDisplay()
      → if remainingSeconds === 0: TimerModule.onComplete()

TimerModule.onComplete()
  → clearInterval
  → show on-screen banner (≥3s)
  → if (Notification.permission === 'granted') new Notification(...)

User clicks Stop
  TimerModule.stop()
    → clearInterval (preserves remainingSeconds)

User clicks Reset
  TimerModule.reset()
    → clearInterval
    → remainingSeconds = fullDuration
    → updateDisplay()
    → unlock duration input + Save control
```

### Flow 3: Task Add → Storage Persist

```
User types description → submits
  TasksModule.addTask(description)
    → validateDescription(description)  [trim; must be 1–200 chars]
    → if invalid: show inline error, return
    → create Task { id: crypto.randomUUID(), description, completed: false, createdAt: Date.now() }
    → tasks.push(task)
    → StorageModule.write('dld_tasks', tasks)
    → TasksModule.renderAll()
```

### Flow 4: Theme Toggle (No Flash)

```
[Script loads, before first paint]
  ThemeModule.applyStoredTheme()
    → StorageModule.read('dld_theme', 'light')
    → if value not in ['light','dark']: use 'light'
    → document.documentElement.setAttribute('data-theme', theme)

[User clicks toggle]
  ThemeModule.toggle()
    → read current data-theme from documentElement
    → newTheme = current === 'dark' ? 'light' : 'dark'
    → documentElement.setAttribute('data-theme', newTheme)
    → StorageModule.write('dld_theme', newTheme)
    → update toggle button aria-label + icon
```

Because `app.js` uses `defer` and `applyStoredTheme()` is the very first call inside the `DOMContentLoaded` handler (which fires before the browser paints interactive content), no frame with the wrong theme is painted.

### Flow 5: Quick Link Add

```
User fills label + URL → clicks Add
  QuickLinksModule.addLink(label, url)
    → if links.length >= 20: disable form, show max-reached message, return
    → validateLink(label, url) → check non-empty fields
    → normaliseUrl(url)        → prepend https:// if no scheme
    → create Link { id: crypto.randomUUID(), label, url: normalisedUrl }
    → links.push(link)
    → StorageModule.write('dld_links', links)
    → renderAll()
    → if links.length === 20: disable add form
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting string covers all hours without gaps

*For any* integer hour value in the range 0–23, `GreetingModule.getGreeting(hour)` SHALL return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, and never return an empty string or throw.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Whitespace-only task descriptions are always rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), `TasksModule.validateDescription(str)` SHALL return `false`, and `TasksModule.addTask(str)` SHALL leave the task list unchanged.

**Validates: Requirements 4.3**

---

### Property 3: Valid task descriptions are always accepted

*For any* string of length 1–200 that contains at least one non-whitespace character, `TasksModule.validateDescription(str)` SHALL return `true`.

**Validates: Requirements 4.1, 4.2**

---

### Property 4: Task list round-trip through Storage

*For any* array of Task objects, serialising it with `StorageModule.write('dld_tasks', tasks)` and then reading it back with `StorageModule.read('dld_tasks', [])` SHALL produce an array equal (deep) to the original.

**Validates: Requirements 7.2, 7.3, 4.2, 4.12**

---

### Property 5: Link list round-trip through Storage

*For any* array of Link objects, serialising it with `StorageModule.write('dld_links', links)` and then reading it back with `StorageModule.read('dld_links', [])` SHALL produce an array equal (deep) to the original.

**Validates: Requirements 7.2, 7.3, 5.2, 5.8**

---

### Property 6: URL normalisation is idempotent

*For any* URL string, applying `QuickLinksModule.normaliseUrl` twice SHALL produce the same result as applying it once — i.e., `normaliseUrl(normaliseUrl(url)) === normaliseUrl(url)`.

**Validates: Requirements 5.4**

---

### Property 7: URL scheme normalisation correctness

*For any* URL string: if it already begins with `http://` or `https://`, `QuickLinksModule.normaliseUrl(url)` SHALL return the URL unchanged; if it does not begin with either scheme, the result SHALL begin with `https://`.

**Validates: Requirements 5.4**

---

### Property 8: Timer countdown format is always valid MM:SS

*For any* non-negative integer number of seconds `s` where `0 ≤ s ≤ 7199` (0 to 119:59), `TimerModule.formatCountdown(s)` SHALL return a string matching the pattern `^\d{2}:\d{2}$` where the seconds part is in the range 00–59.

**Validates: Requirements 3.1**

---

### Property 9: Pomodoro duration validation enforces 1–120 range

*For any* integer value outside the range 1–120 (inclusive), `TimerModule.saveDuration(value)` SHALL reject the value (not write to Storage and not change the displayed duration). *For any* integer value within 1–120, it SHALL be accepted.

**Validates: Requirements 3.10, 3.12**

---

### Property 10: Theme toggle is its own inverse

*For any* initial theme value `t ∈ {"light", "dark"}`, calling `ThemeModule.toggle()` twice SHALL restore `document.documentElement`'s `data-theme` attribute to `t`.

**Validates: Requirements 6.1, 6.2**

---

### Property 11: Invalid theme values in Storage default to light

*For any* string stored under `dld_theme` that is not `"light"` or `"dark"`, `ThemeModule.applyStoredTheme()` SHALL apply the `"light"` theme.

**Validates: Requirements 6.7**

---

### Property 12: Name truncation at 50 characters

*For any* stored name string, the name displayed in the Greeting_Widget SHALL be at most 50 characters long, even if the stored value somehow exceeds 50 characters.

**Validates: Requirements 1.10**

---

## Error Handling

### Storage Unavailability

`StorageModule.isAvailable()` is called once at startup. If `localStorage` throws (private browsing mode, storage quota), a non-blocking warning banner is displayed at the top of the page. All modules continue to function in-memory; data is not persisted for the session.

```js
// StorageModule.write — quota guard
try {
  localStorage.setItem(key, JSON.stringify(value));
} catch (e) {
  if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    showStorageWarningBanner();
  }
}
```

### Corrupt JSON in Storage

`StorageModule.read` wraps `JSON.parse` in a try/catch. On failure it logs to `console.warn` with the key name and the raw value, then returns the provided `fallback`.

```js
read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Dashboard] Failed to parse Storage key "${key}":`, e);
    return fallback;
  }
}
```

### Timer Edge Cases

- If a `setInterval` tick fires after the timer has been reset (race condition), the tick is a no-op because the timer state machine checks state before decrementing.
- The countdown never goes below 0; the completion handler fires when `remainingSeconds` transitions from 1 to 0.

### Browser Notification Permission

`TimerModule.onComplete()` checks `Notification.permission` at fire-time (not at init). Requesting permission is done only if the user explicitly opts in via a visible UI control to avoid browser permission prompts on page load (per Requirement 3.7/3.8).

### Quick Links Storage Failure

`QuickLinksModule.addLink` calls `StorageModule.write`. If the write fails (quota), the in-memory `links` array is rolled back (the pushed entry is removed) and an inline error message is shown — the displayed list remains consistent with Storage.

---

## Testing Strategy

### Dual Approach

- **Unit / example-based tests**: specific scenarios, error conditions, DOM-interaction smoke tests
- **Property-based tests**: universal correctness over many generated inputs (properties listed in the Correctness Properties section above)

### Property-Based Testing

The project uses **[fast-check](https://github.com/dubzzz/fast-check)** (MIT-licensed, no build step required in a browser test harness). Since the project has no build tooling, property tests are run in a lightweight test HTML file (`tests/property-tests.html`) that imports fast-check from a CDN for development/CI purposes only — it is not shipped with the application.

Each property test is configured with a minimum of **100 iterations**.

Tag format for each test:
```
// Feature: todo-list-life-dashboard, Property N: <property text>
```

**Property test targets** (pure functions — no DOM, no I/O):

| Property | Function under test |
|---|---|
| P1 | `GreetingModule.getGreeting(hour)` |
| P2, P3 | `TasksModule.validateDescription(str)` |
| P4 | `StorageModule.read` / `StorageModule.write` (mocked localStorage) |
| P5 | `StorageModule.read` / `StorageModule.write` (mocked localStorage) |
| P6, P7 | `QuickLinksModule.normaliseUrl(url)` |
| P8 | `TimerModule.formatCountdown(seconds)` |
| P9 | `TimerModule.saveDuration(value)` (mocked Storage) |
| P10 | `ThemeModule.toggle()` (mocked DOM) |
| P11 | `ThemeModule.applyStoredTheme()` (mocked Storage + DOM) |
| P12 | `GreetingModule.renderName(storedName)` |

### Unit / Example-Based Tests

- Task CRUD full lifecycle (add → toggle → edit → delete)
- Timer state transitions (IDLE → RUNNING → PAUSED → IDLE)
- Quick Links max-20 boundary (adding the 21st link is rejected)
- Storage corrupt JSON fallback
- Theme flash prevention (theme applied before first mock-paint)
- Responsive layout breakpoint smoke checks (resize observer or CSS media query inspection)

### Integration Tests

- Full page load with pre-seeded localStorage → verify all widgets render expected data
- Theme persistence across simulated page reload
- Task persistence across simulated page reload

### Accessibility

- All interactive controls include `aria-label` or visible `<label>` text
- The timer countdown region uses `role="timer"` and `aria-live="polite"` for screen reader compatibility
- Colour contrast is verified by design (custom properties chosen to meet WCAG 4.5:1); manual assistive-technology testing is recommended before final release

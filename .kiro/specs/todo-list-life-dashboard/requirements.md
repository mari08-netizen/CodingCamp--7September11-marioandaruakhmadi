# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It serves as a personal productivity hub presenting four core widgets on a single page: a greeting panel with live time/date display, a configurable Pomodoro focus timer, a full-featured to-do list, and a quick-links launcher. All user data (tasks, links, name, theme preference, and timer duration) is persisted entirely in the browser's Local Storage — no server, no backend, no build step required. The application ships as a single `index.html` at the project root and supports light/dark mode toggling and full user personalization.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI section displaying the user's name, current time, and date-based greeting.
- **Focus_Timer**: The Pomodoro-style countdown timer widget.
- **Task_List**: The to-do list widget for managing tasks.
- **Quick_Links**: The widget containing shortcut buttons to user-defined URLs.
- **Storage**: The browser's `localStorage` API used for all persistence.
- **Theme**: The active color scheme — either `light` or `dark`.
- **Session**: A single browser tab lifecycle; the page does not require a server session.
- **Pomodoro_Duration**: The user-configured countdown duration in whole minutes for the Focus_Timer.
- **Task**: A single to-do item with a text description and a completion state.
- **Link**: A user-defined entry comprising a display label and a target URL stored in Quick_Links.

---

## Requirements

### Requirement 1: Live Greeting Display

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the Dashboard, so that I immediately know the time and feel personally welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM format, updated every 60 seconds.
2. THE Greeting_Widget SHALL display the current local date in a human-readable format (e.g., "Monday, 7 September 2026").
3. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18:00 and 21:59, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the local hour is between 22:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good Night".
7. WHEN a user name has been saved in Storage, THE Greeting_Widget SHALL append the stored name to the greeting message (e.g., "Good Morning, Mario").
8. WHEN no user name has been saved in Storage, THE Greeting_Widget SHALL display the greeting without a name suffix.
9. WHEN the Dashboard becomes interactive, THE Greeting_Widget SHALL render the current time, date, and greeting within 1 second.
10. IF the stored user name exceeds 50 characters, THE Greeting_Widget SHALL truncate the displayed name to 50 characters.

---

### Requirement 2: Custom Name Personalization

**User Story:** As a user, I want to set and update my name in the Dashboard, so that the greeting addresses me personally across sessions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field that allows the user to enter a display name of 1 to 50 characters.
2. WHEN the user submits a name, THE Dashboard SHALL save the name to Storage so that the name persists across page reloads.
3. WHEN the user submits a name, THE Greeting_Widget SHALL reflect the updated name within 500 milliseconds without requiring a page reload.
4. WHEN the user submits an input that is empty or contains only whitespace characters, THE Dashboard SHALL remove the name entry from Storage.
5. WHEN the Dashboard removes the name entry from Storage, THE Greeting_Widget SHALL display the greeting without a name suffix.
6. WHEN the Dashboard is loaded and a name exists in Storage, THE Dashboard SHALL pre-populate the name input field with the stored name.

---

### Requirement 3: Focus Timer (Pomodoro)

**User Story:** As a user, I want a configurable countdown timer based on the Pomodoro technique, so that I can work in focused intervals and take structured breaks.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display a countdown in MM:SS format, where MM is zero-padded minutes (00–99) and SS is zero-padded seconds (00–59).
2. WHEN the Dashboard is first loaded and no Pomodoro_Duration has been saved in Storage, THE Focus_Timer SHALL default to a duration of 25 minutes and display 25:00.
3. WHEN a Pomodoro_Duration has been saved in Storage, THE Focus_Timer SHALL initialize to that saved duration and display it in MM:SS format on page load.
4. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down at a rate of exactly one second per real-time second, updating the display each second.
5. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and preserve the remaining time in the display without resetting it.
6. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to the full current Pomodoro_Duration in MM:SS format.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, display 00:00, and notify the user with both a visible on-screen indicator persisting for at least 3 seconds and a browser notification if browser notification permission has been granted.
8. IF the countdown reaches 00:00 and browser notification permission has not been granted, THEN THE Focus_Timer SHALL notify the user using only the visible on-screen indicator.
9. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the duration input field and the Save control, preventing any changes to Pomodoro_Duration mid-session.
10. THE Dashboard SHALL provide a numeric input field accepting integer values from 1 to 120 (inclusive, in minutes) to configure the Pomodoro_Duration.
11. WHEN the user saves a new Pomodoro_Duration via the Save control, THE Dashboard SHALL persist the integer value to Storage and reset the Focus_Timer display to the new duration in MM:SS format without starting the countdown.
12. IF the user enters a Pomodoro_Duration value outside the range 1–120 or a non-integer value, THEN THE Dashboard SHALL display an inline validation error message adjacent to the input field and SHALL NOT save the value to Storage.

---

### Requirement 4: To-Do List Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a persistent to-do list, so that I can track what I need to accomplish across sessions.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field for entering new task descriptions of 1 to 200 characters.
2. WHEN the user submits a new task, THE Task_List SHALL append the task to the list and save the updated task collection to Storage.
3. IF the user submits an empty or whitespace-only task description, THEN THE Task_List SHALL reject the submission and SHALL NOT add an entry to the list.
4. THE Task_List SHALL render each Task with a completion toggle control, an edit control, and a delete control.
5. WHEN the user activates the completion toggle on a Task, THE Task_List SHALL update the Task's completion state and save the updated collection to Storage.
6. IF a Task is in a completed state, THE Task_List SHALL apply a visual distinction (e.g., strikethrough text) to that Task; IF the Task is toggled back to incomplete, THE Task_List SHALL remove the visual distinction.
7. WHEN the user activates the edit control on a Task, THE Task_List SHALL replace the Task's display text with an editable input field pre-filled with the current description, along with a confirm control and a cancel control.
8. WHEN the user confirms an edit with a valid description (1–200 non-whitespace characters), THE Task_List SHALL save the updated description to Storage and return the Task to its display state.
9. IF the user confirms an edit with an empty or whitespace-only description, THEN THE Task_List SHALL reject the edit, retain the original description, and keep the Task in its editable state.
10. WHEN the user activates the cancel control during an edit, THE Task_List SHALL discard any changes and return the Task to its display state with the original description.
11. WHEN the user activates the delete control on a Task, THE Task_List SHALL immediately remove the Task from the list and save the updated collection to Storage.
12. WHEN the Dashboard is loaded, THE Task_List SHALL restore all Tasks from Storage, preserving their descriptions and completion states.
13. WHEN the task collection in Storage is empty or absent, THE Task_List SHALL render an empty list with no error.

---

### Requirement 5: Quick Links Launcher

**User Story:** As a user, I want to save and launch frequently visited websites from the Dashboard, so that I can access them with a single click without leaving the app.

#### Acceptance Criteria

1. THE Quick_Links widget SHALL provide input fields for a link label (1–50 characters) and a target URL (1–2048 characters) to add a new Link.
2. WHEN the user submits a new Link, THE Quick_Links widget SHALL add the Link to the display and save the updated Link collection to Storage.
3. IF the user submits a Link with an empty label or an empty URL, THEN THE Quick_Links widget SHALL reject the submission, display an inline error message indicating which field is missing, and SHALL NOT save the entry.
4. IF the user submits a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links widget SHALL prepend `https://` to the URL before saving.
5. WHEN the user activates a Link button, THE Quick_Links widget SHALL open the target URL in a new browser tab.
6. THE Quick_Links widget SHALL provide a delete control for each Link.
7. WHEN the user activates the delete control on a Link, THE Quick_Links widget SHALL remove the Link from the display and save the updated collection to Storage.
8. WHEN the Dashboard is loaded, THE Quick_Links widget SHALL restore all Links from Storage.
9. WHEN the Link collection in Storage is empty or absent, THE Quick_Links widget SHALL render an empty link area with no error.
10. IF the number of Links already saved equals 20, THEN THE Quick_Links widget SHALL disable the add input fields and display a message indicating the maximum number of links has been reached.
11. IF saving the Link collection to Storage fails, THEN THE Quick_Links widget SHALL display an error message indicating the save failed and SHALL NOT update the displayed Link collection.

---

### Requirement 6: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and a dark color scheme, so that I can use the Dashboard comfortably in different lighting environments.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control that switches the active Theme between `light` and `dark`.
2. WHEN the user activates the Theme toggle, THE Dashboard SHALL apply the selected Theme's CSS styles to the entire page within 100 milliseconds without a page reload.
3. WHEN the user activates the Theme toggle, THE Dashboard SHALL save the selected Theme value (`light` or `dark`) to Storage.
4. WHEN the Dashboard is loaded and a Theme value exists in Storage, THE Dashboard SHALL apply the stored Theme such that no frame displaying a different Theme is rendered before the stored Theme is active.
5. WHEN the Dashboard is loaded and no Theme value exists in Storage, THE Dashboard SHALL apply the `light` Theme as the default.
6. THE Dashboard SHALL ensure that all text elements maintain a minimum contrast ratio of 4.5:1 against their background color in both the `light` and `dark` Themes.
7. IF the Theme value read from Storage is not `light` or `dark`, THE Dashboard SHALL discard the invalid value and apply the `light` Theme as the default.
8. WHEN the user activates the Theme toggle, THE toggle control's visible state SHALL reflect the newly active Theme.

---

### Requirement 7: Data Persistence and Storage Integrity

**User Story:** As a user, I want my tasks, links, name, theme, and timer settings to survive page reloads and browser restarts, so that I never lose my configurations.

#### Acceptance Criteria

1. THE Dashboard SHALL use the browser's `localStorage` API as the sole persistence mechanism.
2. THE Dashboard SHALL serialize all structured data (tasks, links) as JSON strings before writing to Storage.
3. WHEN reading data from Storage, THE Dashboard SHALL parse JSON strings back into the corresponding data structures.
4. IF a Storage read operation returns a value that cannot be parsed as valid JSON, THEN THE Dashboard SHALL discard the corrupted value, log a descriptive message to the browser console, and initialize the corresponding widget with its default empty state.
5. IF the browser's `localStorage` API is unavailable or throws a storage quota exception, THEN THE Dashboard SHALL display a non-blocking warning banner to the user indicating that data will not be persisted during the current session.
6. THE Dashboard SHALL not expose or transmit Storage data to any external server or third-party service.
7. WHEN the user clears browser storage externally and reloads the Dashboard, THE Dashboard SHALL initialize all widgets with their default states without throwing an error.

---

### Requirement 8: Project Structure and Technology Constraints

**User Story:** As a developer, I want the project to follow a defined folder structure using only HTML, CSS, and Vanilla JavaScript, so that the codebase is easy to maintain and requires no build tooling.

#### Acceptance Criteria

1. THE Dashboard SHALL be deliverable as a single `index.html` file at the project root that can be opened directly in a browser without a local server.
2. THE Dashboard SHALL include exactly one CSS file located at `css/styles.css`.
3. THE Dashboard SHALL include exactly one JavaScript file located at `js/app.js`.
4. THE Dashboard SHALL use only standard HTML5, CSS3, and ECMAScript 2015+ (ES6+) features with no external frameworks, libraries, or package managers.
5. THE Dashboard SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari without polyfills.
6. THE `index.html` file SHALL reference `css/styles.css` via a `<link>` element and `js/app.js` via a `<script>` element with the `defer` attribute.

---

### Requirement 9: Responsive Layout and Visual Hierarchy

**User Story:** As a user, I want the Dashboard to be readable and usable across different screen sizes, so that I can use it on both desktop and laptop screens.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets — Greeting_Widget, Focus_Timer, Task_List, and Quick_Links — without horizontal scrolling on viewport widths of 360px and above.
2. THE Dashboard SHALL apply a clear visual hierarchy using font size, weight, and spacing so that the greeting, timer, task list, and quick links are each distinguishable as separate sections.
3. THE Dashboard SHALL use a base font size of at least 16px for body text to ensure readability.
4. WHEN the viewport width is 768px or wider, THE Dashboard SHALL display widgets in a multi-column layout.
5. WHEN the viewport width is below 768px, THE Dashboard SHALL stack widgets in a single-column layout.
6. THE Dashboard SHALL render all interactive controls (buttons, inputs, toggles) with a minimum touch target size of 44×44 CSS pixels to support pointer and touch input.

---
title: Frontend Architecture
description: Understanding the React and TypeScript frontend flow.
---

The frontend of TARS is a single-page React application (`src/App.tsx`) built using Vite and written in TypeScript. It's responsible for the user interface, listening to shortcuts, managing conversational context, and optimizing the rendering sequence to prevent UI ghosting, a common challenge in transparent desktop apps.

## Key Responsibilities

1.  **Global Shortcut Registration**
    TARS uses the `@tauri-apps/plugin-global-shortcut` package to listen for hotkeys globally.
    *   `Cmd/Ctrl+Shift+U`: Triggers the window toggle mode, dropping the user immediately into clipboard context mode.
    *   `Cmd/Ctrl+Shift+Y`: Triggers the vision mode. It takes a screenshot _before_ showing the window, then opens TARS with the screenshot pre-attached as context.
    *   `Cmd/Ctrl+Shift+V`: Quick shortcut for copying the last generated response without having to focus the UI.

2.  **State Management**
    React's `useState` manages the application lifecycle:
    *   `currentMode`: `clipboard` vs `screenshot`.
    *   `screenshotData`: The raw `Uint8Array` of the PNG screenshot.
    *   `context`: The extracted text from the clipboard, used as the background context for queries.
    *   `question` & `response`: The currently active prompt loop.

3.  **Clipboard Monitoring**
    Using a custom `ClipboardMonitor` utility, the app aggressively polls clipboard changes. If the user copies text and then opens TARS, the newly copied text is automatically set as the `context`. The UI also implements an "anti-ghosting" mechanism to force rapid DOM repaints when switching contexts ensuring the transparent window doesn't look blurred.

4.  **Tauri IPC Execution**
    TARS makes heavy use of Tauri's IPC mechanism via `invoke`:
    *   `toggle_window()`: Commands the Rust backend to show/focus the window.
    *   `screenshot_and_show_window()`: Asks Rust to capture the screen, then show the window.

### AI Processing Flow

When the user hits `Enter`, the magic happens in `handleSubmit`:

1.  Determines if semantic context should be used automatically.
2.  If `screenshotData` is present, it routes to the `send_screenshot_to_groq` backend command with a special image payload.
3.  For purely text interactions, it invokes `sendMessage`, which calls Groq to get a generated streaming/non-streaming response.
4.  Once the response resolves, it sets the `response` state, and the user can press `Cmd+C` to copy it.

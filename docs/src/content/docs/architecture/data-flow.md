---
title: System Data Flow
description: How data moves through TARS from input to response.
---

Understanding the sequence of events gives a complete picture of why TARS is able to function as a seamless copilot.

## Usage Sequence

1.  **Trigger & Context Extraction**
    User presses `Cmd+Shift+U`.
    *   Tauri global shortcut picks this up.
    *   Tauri reveals the window (`invoke('toggle_window')`).
    *   React mounts, forces a DOM repaint (to bypass transparent window ghosting on macOS), and invokes the `ClipboardMonitor`.
    *   React reads clipboard (`fetchClipboard()`) and sets it to the `getContext` state.

2.  **User Input**
    User types into the bottom input field.
    *   If they hit `Enter`, React parses the text.
    *   If there's an ongoing context or screenshot, they are bundled together.

3.  **Sending the Request to Groq**
    *   For Text-Only: the React frontend hits `src/actions/llm` wrapper, calling `send_message_to_groq` on the Rust layer.
    *   For Vision Context (`Cmd+Shift+Y` or `screenshot:` keywords): The frontend holds onto the `screenshotData` array, and commands `send_screenshot_to_groq`, sending both the textual Prompt + Pixel Array to the Rust layer.

4.  **Groq API Completion**
    *   Rust constructs the HTTP packet using `reqwest`.
    *   The model processes the payload (e.g. `meta-llama/llama-4-scout-17b-16e-instruct` for vision reasoning).
    *   Rust receives the JSON completion response from Groq, maps it into a response struct, and sends the string back over IPC to React.

5.  **Rendering and Storage**
    *   React receives the response string and updates the `response` state.
    *   The `ResponseSection` component renders it using Markdown (`react-markdown` + `prism-react-renderer`).
    *   A side-effect component `StoreToDB` detects a change in the conversation state, bundles the context + prompt + response, and invokes the `store_conversation` background command to persist the log in AWS DynamoDB without blocking the UI.

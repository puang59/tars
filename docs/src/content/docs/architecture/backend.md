---
title: Backend Architecture
description: Understanding the Rust Tauri Backend.
---

The backend of TARS is a lightweight Rust application (`src-tauri/src/lib.rs`). Since Tauri uses Rust for system-level APIs, the backend effectively bridges the web frontend with macOS/Windows specific functionalities, external APIs, and cloud services.

## Core Rust Commands

The primary responsibility of the backend is exposing `#[tauri::command]` functions that the React frontend can invoke.

### Window Management
*   **`toggle_window`**: Toggles visibility using `window.hide()` and `window.show()`. This allows TARS to run amibently in the background and appear instantly without having to boot up the entire web instance each time.

### Screenshot Capture
*   **`take_screenshot`**: Utilizes the `screenshots` crate to grab the primary screen context as raw pixel data.
*   **`screenshot_and_show_window`**: A composed command. Capture first, _then_ reveal the UI. This prevents the TARS window itself from showing up in the screenshot.

### LLM Integration (Groq)
While the frontend handles the prompt engineering, the backend handles the actual network request.

*   **`send_message_to_groq`**:
    *   Pulls the `GROQ_API_KEY` from environment variables natively.
    *   Constructs a request payload.
    *   Performs a POST request to `https://api.groq.com/openai/v1/chat/completions` using the `reqwest` crate.
*   **`send_screenshot_to_groq`**:
    *   Takes the raw screenshot data and uses the `png` crate to encode it to a PNG file.
    *   Encodes the PNG to Base64 using `base64`.
    *   Sends a multi-modal JSON request containing both the text prompt and the Base64 image payload specifically pointing at `meta-llama/llama-4-scout-17b-16e-instruct` to perform vision analysis.

### Persistence

*   **`store_conversation`**: TARS saves the generated questions, responses, contexts, and modes directly to AWS DynamoDB using the `aws_sdk_dynamodb` SDK. This is handled on a background thread so it doesn't block the UI rendering cycle.

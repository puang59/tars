---
title: Overview
description: High level overview of how TARS works.
---

TARS is an AI desktop assistant designed to provide instant intelligence on whatever you are currently working on. It acts as an ambient assistant that stays out of your way until you summon it via global keyboard shortcuts.

### Why TARS?

Unlike traditional web-based LLMs where you have to manually copy-paste context and switch windows, TARS tightly integrates with the host operating system. It fetches your latest clipboard content or captures your screen to minimize friction.

### Technology Stack

*   **GUI Framework**: [Tauri v2](https://v2.tauri.app/) (Rust)
*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **LLM Provider**: [Groq API](https://groq.com/) (OpenAI-compatible endpoints)
*   **Database**: AWS DynamoDB (for storing conversation history)

### Core User Flow

1.  The user is writing an email, coding, or reading an article.
2.  The user wants AI assistance.
3.  The user either:
    *   Highlights text, copies it (`Cmd+C`), and hits `Cmd+Shift+U`.
    *   Hits `Cmd+Shift+Y` to trigger a screenshot capture.
4.  The TARS window instantly appears with the context pre-loaded.
5.  The user types a prompt.
6.  TARS streams back the response from Groq.
7.  The user hits `Cmd+C` to copy the response or `Escape` to hide TARS.

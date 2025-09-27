import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { sendMessage } from "./actions/llm";
import { FileText, X } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import ResponseSection from "./components/ResponseSection";
import { fetchClipboard } from "./utils/clipboard";

// Removed unused globalShortcut constant

function App() {
  const [inputValue, setInputValue] = useState("");
  const [response, setResponse] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [lastClearedContext, setLastClearedContext] = useState("");
  const [screenshotData, setScreenshotData] = useState<Uint8Array | null>(null);
  const lastClearedRef = useRef("");
  const lastAcceptedRef = useRef("");

  const normalizeContext = (text: string) =>
    text.normalize("NFC").replace(/\s+/g, " ").trim();

  const handleCopyResponse = useCallback(async () => {
    if (!response.trim()) {
      console.log("No response to copy");
      return;
    }

    try {
      await writeText(response);
      console.log("Response copied to clipboard!");
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard");
    }
  }, [response]);

  useEffect(() => {
    console.log("Loading state: ", isLoading);
  }, [isLoading]);

  const handleToggle = async (includeScreenshot = false) => {
    try {
      console.log(
        "🔧 handleToggle called with includeScreenshot:",
        includeScreenshot
      );

      let screenshotData: Uint8Array | null = null;

      if (includeScreenshot) {
        console.log("📸 Taking screenshot...");
        screenshotData = await invoke("screenshot_and_show_window");
        console.log(
          "📸 Screenshot taken, size:",
          screenshotData?.length || 0,
          "bytes"
        );
        setScreenshotData(screenshotData);
      } else {
        console.log("🪟 Showing window only...");
        await invoke("toggle_window");
        setScreenshotData(null); // Clear screenshot data for clipboard-only mode
      }

      // Get clipboard content for context
      console.log("📋 Getting clipboard content...");
      const clipboardText = await fetchClipboard();
      console.log(
        "📋 Clipboard content:",
        clipboardText.substring(0, 100) + "..."
      );

      const trimmed = normalizeContext(clipboardText);
      if (!trimmed) {
        console.log("⚠️ No clipboard content to use as context");
        return;
      }
      if (trimmed === lastClearedRef.current) {
        console.log("⚠️ Clipboard content same as last cleared, skipping");
        return;
      }
      if (trimmed === context) {
        console.log("⚠️ Clipboard content same as current context, skipping");
        return;
      }
      if (trimmed && trimmed !== lastClearedContext) {
        console.log(
          "✅ Setting new context:",
          trimmed.substring(0, 50) + "..."
        );
        setContext(trimmed);
        setLastClearedContext("");
        lastAcceptedRef.current = trimmed;
      }

      console.log("🎯 Context set successfully");
    } catch (error) {
      console.error("❌ Failed to toggle window:", error);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    let response: string = "";

    try {
      setIsLoading(true);
      response = await sendMessageWithContext(
        context,
        inputValue,
        screenshotData
      );

      setInputValue("");
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsLoading(false);
    }

    setResponse(response);
  };

  const handleScreenshotAnalysis = async (prompt: string) => {
    if (!prompt.trim()) return;
    let response: string = "";

    try {
      setIsLoading(true);
      response = await invoke("send_screenshot_to_gemini", { prompt });
      setResponse(response);
    } catch (error) {
      console.error("Failed to analyze screenshot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageWithContext = async (
    context: string,
    userInput: string,
    screenshotData?: Uint8Array | null
  ): Promise<string> => {
    console.log("🚀 sendMessageWithContext called");
    console.log("📝 Context:", context.substring(0, 100) + "...");
    console.log("💬 User input:", userInput);
    console.log("📸 Screenshot data available:", !!screenshotData);

    if (screenshotData && screenshotData.length > 0) {
      console.log("📸 Sending screenshot + text to Gemini");
      return (await invoke("send_screenshot_to_gemini", {
        prompt: `Context from clipboard: ${context}\n\nUser question: ${userInput}`,
      })) as string;
    } else {
      console.log("💬 Sending text-only to Gemini");
      return await sendMessage(context, userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setQuestion(inputValue);

      // If the input starts with "analyze:" or "screenshot:", use screenshot analysis
      if (
        inputValue.trim().toLowerCase().startsWith("analyze:") ||
        inputValue.trim().toLowerCase().startsWith("screenshot:")
      ) {
        const prompt = inputValue
          .trim()
          .replace(/^(analyze:|screenshot:)\s*/i, "");
        handleScreenshotAnalysis(prompt);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      handleToggle();
    }
  };

  useEffect(() => {
    const setupGlobalShortcut = async () => {
      try {
        // Cmd+Shift+U: Clipboard only
        await register(
          "CmdOrCtrl+Shift+U",
          async (event: { state: string }) => {
            if (event.state === "Pressed") {
              console.log("⌨️ Cmd+Shift+U pressed - clipboard only");
              await handleToggle(false);
            }
          }
        );

        // Cmd+Shift+Y: Clipboard + Screenshot
        await register(
          "CmdOrCtrl+Shift+Y",
          async (event: { state: string }) => {
            if (event.state === "Pressed") {
              console.log("⌨️ Cmd+Shift+Y pressed - clipboard + screenshot");
              await handleToggle(true);
            }
          }
        );

        await register(
          "CmdOrCtrl+Shift+V",
          async (event: { state: string }) => {
            if (event.state === "Pressed") {
              await handleCopyResponse();
            }
          }
        );
      } catch (error) {
        console.error("Failed to register global shortcut:", error);
      }
    };

    setupGlobalShortcut();

    // In-app Cmd+C: if window is focused, let Cmd+C copy the response
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");

      const isCmd = isMac ? e.metaKey : e.ctrlKey;
      if (isCmd && (e.key === "c" || e.key === "C")) {
        // Only handle when nothing is selected in the input
        const selection = window.getSelection?.()?.toString();
        if (!selection && response.trim()) {
          e.preventDefault();
          handleCopyResponse();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      unregister("CmdOrCtrl+Shift+U");
      unregister("CmdOrCtrl+Shift+Y");
      unregister("CmdOrCtrl+Shift+V");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleCopyResponse, response]);

  const truncate = (str: string, maxLength: number) => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + "...";
  };

  return (
    <main>
      {question && (
        <div
          style={{
            marginLeft: "auto",
          }}
        >
          <p
            className="text-sm bg-zinc-800/70 rounded-md"
            style={{
              padding: "6px 10px",
            }}
          >
            {question}
          </p>
        </div>
      )}
      {isLoading && <p>Thinking...</p>}
      {!isLoading && response && (
        <ResponseSection response={response} isCopied={isCopied} />
      )}
      {context && (
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={() => {
            const norm = normalizeContext(context);
            setLastClearedContext(norm);
            lastClearedRef.current = norm;
            setContext("");
          }}
          style={{
            position: "relative",
            width: "60%",
            cursor: "pointer",
            borderRadius: 4,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: isHovering
              ? "rgba(63, 63, 70, 0.7)"
              : "rgba(39, 39, 42, 0.6)",
            border: `1px solid ${
              isHovering ? "rgba(161,161,170,0.8)" : "rgba(113,113,122,0.7)"
            }`,
            boxShadow: isHovering ? "0 0 0 1px rgba(161,161,170,0.3)" : "none",
            transition:
              "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
          }}
        >
          {isHovering ? (
            <X size={14} style={{ color: "#ffffff" }} />
          ) : (
            <FileText size={14} style={{ color: "#d4d4d8" }} />
          )}
          <p style={{ fontSize: 12, color: "#e4e4e7", margin: 0 }}>
            {truncate(context, 30)}
            {screenshotData && (
              <span style={{ color: "#4ade80", marginLeft: "8px" }}>📸</span>
            )}
          </p>
        </div>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="What's on your mind? (Cmd+Shift+Y for screenshot context)"
        className="main-input"
        autoFocus
      />
    </main>
  );
}

export default App;

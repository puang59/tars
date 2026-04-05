import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { sendMessage } from "./actions/llm";
import { FileText, X } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import ResponseSection from "./components/ResponseSection";
import { fetchClipboard } from "./utils/clipboard";
import StoreToDB from "./components/StoreToDB";
import ModelSelector from "./components/ModelSelector";
import {
  ClipboardMonitor,
  isContextSeekingQuestion,
} from "./utils/clipboardMonitor";

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
  const [currentMode, setCurrentMode] = useState<"clipboard" | "screenshot">(
    "clipboard"
  );
  const [forceRefresh, setForceRefresh] = useState(0);
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant");
  const [isLocal, setIsLocal] = useState(false);
  const lastClearedRef = useRef("");
  const lastAcceptedRef = useRef("");
  const chatContentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clipboardMonitorRef = useRef<ClipboardMonitor | null>(null);
  const [latestClipboard, setLatestClipboard] = useState("");

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

  // Initialize clipboard monitor
  useEffect(() => {
    const monitor = new ClipboardMonitor();
    clipboardMonitorRef.current = monitor;

    // Start monitoring clipboard changes
    monitor.start(1000, (clipboardContent) => {
      console.log(
        "📋 Clipboard updated:",
        clipboardContent.substring(0, 50) + "..."
      );
      setLatestClipboard(clipboardContent);
    });

    return () => {
      monitor.stop();
    };
  }, []);

  // Anti-ghosting: Force repaint on scroll
  useEffect(() => {
    const chatContent = chatContentRef.current;
    if (!chatContent) return;

    const forceRepaint = () => {
      // Simple repaint trigger
      chatContent.style.transform = "translate3d(0, 0, 0.1px)";
      requestAnimationFrame(() => {
        chatContent.style.transform = "translate3d(0, 0, 0)";
      });
    };

    const handleScroll = () => {
      forceRepaint();
    };

    chatContent.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      chatContent.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Cleanup effect to prevent ghosting on window state changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Only clear loading state when window is hidden
        setIsLoading(false);
      } else {
        // When window becomes visible, focus input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleToggle = async (includeScreenshot = false) => {
    try {
      console.log(
        "🔧 handleToggle called with includeScreenshot:",
        includeScreenshot
      );

      // Only clear loading state, preserve conversation history
      setIsLoading(false);

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
        setCurrentMode("screenshot");
      } else {
        console.log("🪟 Showing window only...");
        await invoke("toggle_window");
        setScreenshotData(null); // Clear screenshot data for clipboard-only mode
        setCurrentMode("clipboard");
      }

      // Force component re-render to clear any ghosting (only if needed)
      // Only trigger refresh if there's actual content that might ghost
      if (response || question || context) {
        setTimeout(() => {
          setForceRefresh((prev) => prev + 1);
        }, 100);
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
      } else {
        // If we're not setting new context, preserve existing conversation
        console.log("✅ Preserving existing conversation");
      }

      console.log("🎯 Context set successfully");
    } catch (error) {
      console.error("❌ Failed to toggle window:", error);
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue(""); // Clear immediately
    let response: string = "";

    // Check if this is a context-seeking question
    let contextToUse = context;
    if (isContextSeekingQuestion(userMessage) && !context && latestClipboard) {
      console.log(
        "🎯 Context-seeking question detected, using latest clipboard"
      );
      contextToUse = latestClipboard;
      setContext(latestClipboard); // Update UI to show context
    }

    try {
      setIsLoading(true);
      response = await sendMessageWithContext(
        selectedModel,
        contextToUse,
        userMessage,
        isLocal,
        screenshotData
      );
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsLoading(false);
    }

    setResponse(response);
  };

  const handleScreenshotAnalysis = async (prompt: string) => {
    if (!prompt.trim()) return;

    setInputValue(""); // Clear immediately
    let response: string = "";

    try {
      setIsLoading(true);
      response = await invoke("send_screenshot_to_groq", { prompt });
      setResponse(response);
    } catch (error) {
      console.error("Failed to analyze screenshot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessageWithContext = async (
    model: string,
    context: string,
    userInput: string,
    isLocal: boolean,
    screenshotData?: Uint8Array | null
  ): Promise<string> => {
    console.log("🚀 sendMessageWithContext called, isLocal:", isLocal);
    console.log("📝 Context:", context.substring(0, 100) + "...");
    console.log("💬 User input:", userInput);
    console.log("📸 Screenshot data available:", !!screenshotData);

    if (screenshotData && screenshotData.length > 0) {
      console.log("📸 Sending screenshot + text to Groq (Local not supported for images yet)");
      return (await invoke("send_screenshot_to_groq", {
        prompt: `Context from clipboard: ${context}\n\nUser question: ${userInput}`,
      })) as string;
    } else {
      console.log("💬 Sending text-only to", isLocal ? "Local" : "Groq");
      return await sendMessage(model, context, userInput, isLocal);
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
    // Try to break at word boundary
    const truncated = str.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.8) {
      return str.slice(0, lastSpace) + "...";
    }
    return truncated + "...";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Top Control Bar */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderRadius: "16px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "none",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Left side - TARS branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <img
            src="/TarsLogo.png"
            alt="TARS Logo"
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              fontWeight: "600",
              color: "#ffffff",
              fontSize: "14px",
            }}
          >
            TARS
          </div>
          <div
            className="flex flex-row items-center gap-1.5 text-gray-400"
            style={{
              marginLeft: "18px",
            }}
          >
            |{" "}
            <ModelSelector
              isLocal={isLocal}
              onModelChange={(modelId) => {
                console.log("🔄 Model changed to:", modelId);
                setSelectedModel(modelId);
              }}
            />{" "}
            |{" "}
            <div className="flex items-center gap-1.5 ml-2">
              <label 
                className="text-[10px] uppercase tracking-wider text-gray-500 font-bold cursor-pointer"
                htmlFor="local-mode"
              >
                Local
              </label>
              <input 
                id="local-mode"
                type="checkbox" 
                checked={isLocal}
                onChange={(e) => setIsLocal(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </div>
            |{" "}
            <StoreToDB
              conversationData={
                question || response
                  ? {
                      question: question || "",
                      response: response || "",
                      context: context || "",
                      timestamp: new Date().toISOString(),
                      mode: currentMode,
                      model: selectedModel,
                    }
                  : undefined
              }
            />
          </div>
        </div>

        {/* Center - Mode indicator and shortcuts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "11px",
            fontWeight: "400",
          }}
        >
          <div
            style={{
              color: currentMode === "screenshot" ? "#4ade80" : "#a1a1aa",
            }}
          >
            {currentMode === "clipboard"
              ? "⌘⇧Y for image context"
              : "⌘⇧U for clipboard context"}
          </div>
          <div
            style={{
              width: "1px",
              height: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          ></div>
          <div style={{ color: "#a1a1aa" }}>⌘C to copy</div>
        </div>

        {/* Right side - Status indicator */}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor:
              currentMode === "screenshot" ? "#4ade80" : "#6b7280",
          }}
        ></div>
      </div>

      {/* Main Content Area */}
      <div
        key={`main-content-${forceRefresh}`}
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          borderRadius: "24px",
          padding: "20px",
          border: "none",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "500px",
          maxHeight: "70vh",
          overflow: "hidden",
          // Aggressive anti-ghosting measures
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          isolation: "isolate",
          position: "relative",
          zIndex: 1,
          // Force GPU acceleration
          willChange: "transform",
          // Prevent text persistence
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        }}
      >
        {/* Chat Content - Scrollable */}
        <div
          ref={chatContentRef}
          className="chat-content anti-ghost"
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: "8px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            scrollBehavior: "smooth",
            // Force complete background clearing
            backgroundColor: "transparent",
            background: "transparent",
            // Remove willChange property that can cause text ghosting
            // willChange: "scroll-position",
          }}
        >
          {/* Question Display */}
          {question && (
            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.3)",
                borderRadius: "18px",
                padding: "12px 16px",
                border: "none",
                marginBottom: "16px",
                alignSelf: "flex-end",
                maxWidth: "80%",
                // Anti-ghosting measures
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
                isolation: "isolate",
                position: "relative",
                zIndex: 2,
              }}
            >
              <p
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  margin: 0,
                  fontWeight: "500",
                  lineHeight: "1.4",
                }}
              >
                {question}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: "18px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                border: "none",
                alignSelf: "flex-start",
                maxWidth: "80%",
              }}
            >
              {/* Animated dots */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    animation: "pulse 1.4s ease-in-out infinite both",
                  }}
                ></div>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    animation: "pulse 1.4s ease-in-out infinite both 0.2s",
                  }}
                ></div>
                <div
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    animation: "pulse 1.4s ease-in-out infinite both 0.4s",
                  }}
                ></div>
              </div>
              <p
                style={{
                  color: "#a1a1aa",
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "400",
                  letterSpacing: "0.3px",
                }}
              >
                Thinking...
              </p>
            </div>
          )}

          {/* Response Section */}
          {!isLoading && response && (
            <div
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: "18px",
                padding: "16px",
                border: "none",
                alignSelf: "flex-start",
                maxWidth: "80%",
                // Anti-ghosting measures
                transform: "translateZ(0)",
                backfaceVisibility: "hidden",
                isolation: "isolate",
                position: "relative",
                zIndex: 2,
              }}
            >
              <ResponseSection response={response} isCopied={isCopied} />
            </div>
          )}

          {/* Context Display */}
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
                cursor: "pointer",
                borderRadius: "16px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                backgroundColor: isHovering
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.08)",
                border: "none",
                transition: "all 200ms ease",
                marginBottom: "16px",
                alignSelf: "flex-start",
                maxWidth: "90%",
                minWidth: "200px",
              }}
            >
              {isHovering ? (
                <X
                  size={16}
                  style={{ color: "#ffffff", marginTop: "2px", flexShrink: 0 }}
                />
              ) : (
                <FileText
                  size={16}
                  style={{ color: "#a1a1aa", marginTop: "2px", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#e4e4e7",
                    margin: 0,
                    fontWeight: "400",
                    lineHeight: "1.4",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {context.length > 150 ? truncate(context, 150) : context}
                  {screenshotData && (
                    <span
                      style={{
                        color: "#4ade80",
                        marginLeft: "6px",
                        fontSize: "12px",
                      }}
                    >
                      📸
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input Field - Fixed at bottom */}
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderRadius: "18px",
            padding: "4px",
            border: "none",
            transition: "all 200ms ease",
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="What's on your mind?"
            autoFocus
            ref={inputRef}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              padding: "12px 16px",
              fontSize: "14px",
              color: "#ffffff",
              fontWeight: "400",
              borderRadius: "14px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

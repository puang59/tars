import { readText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * Monitors clipboard and tracks the latest copied content
 */
export class ClipboardMonitor {
  private lastClipboard: string = "";
  private isActive: boolean = false;
  private intervalId?: number;
  private onClipboardChange?: (content: string) => void;

  /**
   * Start monitoring clipboard changes
   * @param interval - Check interval in milliseconds (default: 1000ms)
   * @param onChange - Callback when clipboard content changes
   */
  start(interval: number = 1000, onChange?: (content: string) => void): void {
    if (this.isActive) return;

    this.isActive = true;
    this.onClipboardChange = onChange;

    this.intervalId = window.setInterval(async () => {
      await this.checkClipboard();
    }, interval);

    console.log("📋 Clipboard monitor started");
  }

  /**
   * Stop monitoring clipboard
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isActive = false;
    console.log("📋 Clipboard monitor stopped");
  }

  /**
   * Check clipboard for changes
   */
  private async checkClipboard(): Promise<void> {
    try {
      const content = await readText();
      if (content && content !== this.lastClipboard) {
        console.log(
          "📋 New clipboard content detected:",
          content.substring(0, 50) + "..."
        );
        this.lastClipboard = content;
        this.onClipboardChange?.(content);
      }
    } catch (error) {
      console.error("Failed to check clipboard:", error);
    }
  }

  /**
   * Get the last copied content
   */
  getLastClipboard(): string {
    return this.lastClipboard;
  }

  /**
   * Manually set the last clipboard (useful for syncing)
   */
  setLastClipboard(content: string): void {
    this.lastClipboard = content;
  }
}

/**
 * Detects if a user question is asking about "this" (referring to clipboard context)
 */
export function isContextSeekingQuestion(question: string): boolean {
  const lower = question.toLowerCase().trim();

  // Common patterns that suggest the user wants to use clipboard as context
  const patterns = [
    /^what (is|does|means?|are).*this/i,
    /^explain (this|what this)/i,
    /^summarize (this|what this)/i,
    /^what('s| is) (the meaning|this about)/i,
    /^tell me (about|what) (this|it)/i,
    /^describe (this|it)/i,
    /^what does (this|it) (mean|do|say)/i,
    /^translate (this|it)/i,
    /^analyze (this|it)/i,
    /^review (this|it)/i,
    /^fix (this|it)/i,
    /^improve (this|it)/i,
    /^what('s| is) (this|it)/i,
  ];

  return patterns.some((pattern) => pattern.test(lower));
}

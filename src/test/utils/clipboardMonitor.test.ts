import { describe, it, expect, beforeEach } from 'vitest';
import { isContextSeekingQuestion, ClipboardMonitor } from '../../utils/clipboardMonitor';

describe('clipboardMonitor - Functional Tests', () => {
  describe('isContextSeekingQuestion', () => {
    it('should detect "what is this" pattern', () => {
      expect(isContextSeekingQuestion('what is this')).toBe(true);
      expect(isContextSeekingQuestion('What is this?')).toBe(true);
      expect(isContextSeekingQuestion('what does this mean')).toBe(true);
    });

    it('should detect "explain this" pattern', () => {
      expect(isContextSeekingQuestion('explain this')).toBe(true);
      expect(isContextSeekingQuestion('Explain what this does')).toBe(true);
    });

    it('should detect "summarize this" pattern', () => {
      expect(isContextSeekingQuestion('summarize this')).toBe(true);
      expect(isContextSeekingQuestion('Summarize what this means')).toBe(true);
    });

    it('should detect "translate this" pattern', () => {
      expect(isContextSeekingQuestion('translate this')).toBe(true);
      expect(isContextSeekingQuestion('translate it')).toBe(true);
    });

    it('should detect "fix this" pattern', () => {
      expect(isContextSeekingQuestion('fix this')).toBe(true);
      expect(isContextSeekingQuestion('improve it')).toBe(true);
    });

    it('should not detect non-context questions', () => {
      expect(isContextSeekingQuestion('hello')).toBe(false);
      expect(isContextSeekingQuestion('how are you?')).toBe(false);
      expect(isContextSeekingQuestion('what is React?')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isContextSeekingQuestion('')).toBe(false);
      expect(isContextSeekingQuestion('   ')).toBe(false);
      expect(isContextSeekingQuestion('THIS IS THIS')).toBe(false);
    });
  });

  describe('ClipboardMonitor - Class Tests', () => {
    let monitor: ClipboardMonitor;

    beforeEach(() => {
      monitor = new ClipboardMonitor();
    });

    it('should initialize with empty clipboard', () => {
      expect(monitor.getLastClipboard()).toBe('');
    });

    it('should set and get clipboard content', () => {
      const testContent = 'Test clipboard content';
      monitor.setLastClipboard(testContent);
      expect(monitor.getLastClipboard()).toBe(testContent);
    });

    it('should stop monitoring without errors', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });
});


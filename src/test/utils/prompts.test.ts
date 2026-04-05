import { describe, it, expect } from 'vitest';
import { textPrompt } from '../../utils/prompts';

describe('prompts - Functional Tests', () => {
  describe('textPrompt', () => {
    it('should generate prompt with context', () => {
      const context = 'This is a test context';
      const result = textPrompt(context);

      expect(result).toContain('tars');
      expect(result).toContain(context);
      expect(result).toContain('helpful and efficient assistant');
    });

    it('should include context in the prompt', () => {
      const context = 'React is a JavaScript library';
      const result = textPrompt(context);

      expect(result).toContain('React is a JavaScript library');
    });

    it('should handle empty context', () => {
      const result = textPrompt('');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in context', () => {
      const context = 'Test with "quotes" and \'apostrophes\' & symbols!';
      const result = textPrompt(context);

      expect(result).toContain(context);
    });

    it('should maintain consistent personality traits', () => {
      const result = textPrompt('test context');

      expect(result).toContain('short');
      expect(result).toContain('clear');
      expect(result).toContain('friendly');
      expect(result).toContain('natural');
    });

    it('should provide code handling instructions', () => {
      const result = textPrompt('code test');

      expect(result).toContain('code');
      expect(result).toContain('snippet');
    });

    it('should provide rewrite instructions', () => {
      const result = textPrompt('rewrite test');

      expect(result).toContain('rewrite');
      expect(result).toContain('grammatically correct');
    });

    it('should handle long context strings', () => {
      const longContext = 'A'.repeat(1000);
      const result = textPrompt(longContext);

      expect(result).toContain(longContext);
      expect(result.length).toBeGreaterThan(1000);
    });
  });
});


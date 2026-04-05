import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResponseSection from '../../components/ResponseSection';

// Mock MarkdownRenderer component
vi.mock('../../utils/MarkdownRenderer', () => ({
  default: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

describe('ResponseSection - Component Tests', () => {
  it('should render without crashing', () => {
    const { container } = render(<ResponseSection response="Test response" isCopied={false} />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('should display response text', () => {
    const testResponse = 'This is a test response';
    render(<ResponseSection response={testResponse} isCopied={false} />);

    expect(screen.getByText(testResponse)).toBeInTheDocument();
  });

  it('should handle empty response', () => {
    const { container } = render(<ResponseSection response="" isCopied={false} />);
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('should handle markdown content', () => {
    const markdownResponse = '# Heading\n\n**Bold text**';
    render(<ResponseSection response={markdownResponse} isCopied={false} />);

    expect(screen.getByTestId('markdown')).toBeInTheDocument();
  });

  it('should handle long responses', () => {
    const longResponse = 'A'.repeat(1000);
    render(<ResponseSection response={longResponse} isCopied={false} />);

    expect(screen.getByText(longResponse)).toBeInTheDocument();
  });

  it('should handle special characters', () => {
    const specialChars = '<script>alert("test")</script>';
    render(<ResponseSection response={specialChars} isCopied={false} />);

    expect(screen.getByText(specialChars)).toBeInTheDocument();
  });

  it('should have proper structure with section and div', () => {
    const { container } = render(<ResponseSection response="test" isCopied={false} />);
    
    const section = container.querySelector('section');
    const markdownContainer = container.querySelector('.markdown-container');

    expect(section).toBeInTheDocument();
    expect(markdownContainer).toBeInTheDocument();
  });
});


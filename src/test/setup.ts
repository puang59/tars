import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri API
global.window = Object.create(window);
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: () => Promise.resolve(),
    event: { listen: () => () => {} },
  },
  writable: true,
});


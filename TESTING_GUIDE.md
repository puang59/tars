# TARS Testing Guide

Quick reference for running tests in the TARS project.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test              # Functional tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:all      # Both functional and E2E
```

## 📋 Test Commands

### Functional Testing (Vitest)
```bash
# Run tests once
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### E2E Testing (Playwright)
```bash
# Make sure dev server is running first
npm run dev          # Terminal 1

# Then run E2E tests
npm run test:e2e     # Terminal 2

# Interactive UI mode
npm run test:e2e:ui

# Specific test file
npx playwright test e2e/performance.spec.ts
```

## 🧪 Test Structure

```
src/test/
├── setup.ts                          # Test configuration
├── components/
│   └── ResponseSection.test.tsx      # Component tests
└── utils/
    ├── clipboardMonitor.test.ts      # Utility tests
    └── prompts.test.ts               # Prompt tests

e2e/
├── app.spec.ts                       # E2E functional tests
└── performance.spec.ts               # Performance tests
```

## 🎯 What's Tested

### ✅ Functional Tests (25 tests)
- **ClipboardMonitor Utility** (10 tests)
  - Context-seeking question detection
  - Pattern matching (explain, summarize, translate, fix)
  - Edge cases and state management

- **Prompt Generation** (8 tests)  
  - Context injection
  - Special character handling
  - Personality consistency

- **ResponseSection Component** (7 tests)
  - Rendering and display
  - Markdown support
  - XSS prevention

### ✅ E2E Tests (20 tests)
- **Application Tests** (11 tests)
  - UI component rendering
  - User interactions
  - Responsive design

- **Performance Tests** (10 tests)
  - Load time (< 5s target)
  - Input responsiveness (< 100ms)
  - DOM efficiency
  - Frame rate (> 30 FPS)

## 🛠️ Tools Used

1. **Vitest** - Fast unit testing framework
2. **React Testing Library** - Component testing
3. **Playwright** - E2E and performance testing

## 📊 Current Status

```
✅ 25/25 Functional tests passing (100%)
📝 20 E2E tests ready
⚡ Test execution: < 1 second
```

## 🐛 Troubleshooting

### Tests not running?
```bash
# Clear cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### E2E tests failing?
- Ensure dev server is running: `npm run dev`
- Check if port 1420 is available
- Install Playwright browsers: `npx playwright install`

### Coverage not generating?
```bash
# Install coverage provider
npm install -D @vitest/coverage-v8
npm run test:coverage
```

## 📝 Writing New Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should work correctly', () => {
    expect(myFunction('test')).toBe('expected');
  });
});
```

### Component Test Example
```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

it('should render', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should load page', async ({ page }) => {
  await page.goto('http://localhost:1420');
  await expect(page).toHaveTitle(/TARS/);
});
```

## 🎓 Best Practices

1. ✅ Write tests for new features
2. ✅ Keep tests isolated and independent
3. ✅ Use descriptive test names
4. ✅ Test edge cases and error scenarios
5. ✅ Mock external dependencies
6. ✅ Run tests before committing

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [TEST_REPORT.md](./TEST_REPORT.md) - Full test report

---

For detailed test results and analysis, see [TEST_REPORT.md](./TEST_REPORT.md)


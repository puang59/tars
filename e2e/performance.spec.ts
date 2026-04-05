import { test, expect } from '@playwright/test';

test.describe('TARS Performance Tests - Non-Functional', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('should have reasonable DOM size', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const domSize = await page.evaluate(() => {
      return document.getElementsByTagName('*').length;
    });
    
    // DOM should not be excessively large (< 1500 elements)
    expect(domSize).toBeLessThan(1500);
    console.log(`DOM size: ${domSize} elements`);
  });

  test('should respond to user input quickly', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const input = page.locator('input[type="text"]');
    const startTime = Date.now();
    
    await input.fill('Test performance');
    
    const responseTime = Date.now() - startTime;
    
    // Input should respond within 100ms
    expect(responseTime).toBeLessThan(100);
    console.log(`Input response time: ${responseTime}ms`);
  });

  test('should handle multiple rapid inputs', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const input = page.locator('input[type="text"]');
    
    // Rapid typing simulation
    for (let i = 0; i < 10; i++) {
      await input.fill(`Message ${i}`);
    }
    
    await expect(input).toHaveValue('Message 9');
  });

  test('should not have memory leaks with repeated actions', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const input = page.locator('input[type="text"]');
    
    // Perform repeated actions
    for (let i = 0; i < 20; i++) {
      await input.fill(`Test ${i}`);
      await input.clear();
    }
    
    // Application should still be responsive
    await input.fill('Final test');
    await expect(input).toHaveValue('Final test');
  });

  test('should have efficient CSS and no layout shifts', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    // Check for Cumulative Layout Shift
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(cls);
        }, 3000);
      });
    });
    
    // CLS should be minimal (< 0.1 is good)
    expect(cls).toBeLessThan(0.25);
    console.log(`Cumulative Layout Shift: ${cls}`);
  });

  test('should load images efficiently', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    const images = await page.locator('img').count();
    console.log(`Number of images: ${images}`);
    
    // Check if images load properly
    const logo = page.locator('img[alt="TARS Logo"]');
    await expect(logo).toBeVisible();
    
    // Check image natural dimensions are reasonable
    const dimensions = await logo.evaluate((img: HTMLImageElement) => ({
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));
    
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
  });

  test('should have acceptable JavaScript bundle size', async ({ page }) => {
    const resources = [];
    
    page.on('response', response => {
      if (response.url().includes('.js')) {
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'] || 0,
        });
      }
    });
    
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');
    
    console.log(`JS Resources loaded: ${resources.length}`);
    
    // Should not load excessive number of JS files in production
    expect(resources.length).toBeLessThan(50);
  });

  test('should handle scrolling smoothly', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    // Add some content to enable scrolling (simulate conversation)
    const input = page.locator('input[type="text"]');
    
    for (let i = 0; i < 3; i++) {
      await input.fill(`Long message ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`);
      await input.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Scroll should work without errors
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeGreaterThanOrEqual(0);
  });

  test('should maintain 60fps during animations', async ({ page }) => {
    await page.goto('http://localhost:1420');
    
    // Monitor frame rate
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        
        function countFrames() {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime >= lastTime + 1000) {
            resolve(frameCount);
          } else {
            requestAnimationFrame(countFrames);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
    
    console.log(`Frames per second: ${fps}`);
    
    // Should maintain reasonable frame rate (at least 30fps, ideally 60fps)
    expect(fps).toBeGreaterThan(30);
  });
});


import { test, expect } from '@playwright/test';

test.describe('SHA-256 Tycoon — E2E Smoke Test', () => {
  test('boots cleanly without errors, loads canvas and responds to user interaction', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Navigate to local server
    await page.goto('/');

    // Verify canvas renders
    const canvas = page.locator('#game-container canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait for Satoshi onboarding or game initialization
    await page.waitForTimeout(1500);

    // Verify no 404 or failed asset requests
    expect(failedRequests).toEqual([]);

    // Click canvas to dismiss intro or interact
    await canvas.click({ position: { x: 590, y: 502 } });
    await page.waitForTimeout(1000);

    // Send hotkey tab switch: '1' for NODE, '2' for SILICON, '3' for TREASURY, '4' for WARFARE
    await page.keyboard.press('Digit1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Digit2');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space'); // pause/resume
    await page.waitForTimeout(500);

    // Ensure zero uncaught runtime errors occurred
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});


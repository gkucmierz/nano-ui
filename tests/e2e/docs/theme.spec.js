import { test, expect } from '../dualEngineCdp.js';

test.describe('Theme persistence E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure a clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should toggle theme and persist choice in localStorage', async ({ page }) => {
    const htmlElement = page.locator('html');
    const themeToggleBtn = page.locator('button.theme-toggle');
    await expect(themeToggleBtn).toBeVisible();

    // 1. Check initial state (either light or dark)
    const initialIsLight = await htmlElement.getAttribute('data-theme') === 'light';

    // 2. Toggle the theme
    await themeToggleBtn.click();

    // 3. Confirm that it switched to the opposite theme
    if (initialIsLight) {
      await expect(htmlElement).not.toHaveAttribute('data-theme', 'light');
    } else {
      await expect(htmlElement).toHaveAttribute('data-theme', 'light');
    }

    // 4. Reload the page to verify persistence
    await page.reload();

    // 5. Check that the theme is still in the toggled state
    if (initialIsLight) {
      await expect(htmlElement).not.toHaveAttribute('data-theme', 'light');
    } else {
      await expect(htmlElement).toHaveAttribute('data-theme', 'light');
    }

    // 6. Click the toggle button again to switch back
    await themeToggleBtn.click();

    // 7. Verify that it is back to the initial theme
    if (initialIsLight) {
      await expect(htmlElement).toHaveAttribute('data-theme', 'light');
    } else {
      await expect(htmlElement).not.toHaveAttribute('data-theme', 'light');
    }

    // 8. Reload again to verify persistence of the reverted state
    await page.reload();
    if (initialIsLight) {
      await expect(htmlElement).toHaveAttribute('data-theme', 'light');
    } else {
      await expect(htmlElement).not.toHaveAttribute('data-theme', 'light');
    }
  });
});

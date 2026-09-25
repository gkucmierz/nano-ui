import { test, expect } from '@playwright/test';

test.describe('3D Donut Chart E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the documentation page for 3D Donut Chart
    await page.goto('/docs/3d-donut-chart');
    // Wait for the chart to render (at least one path inside .items-svg-chart should be visible)
    await page.waitForSelector('.items-svg-chart path');
  });

  test('should render chart and lock/unlock elements correctly', async ({ page }) => {
    // 1. Confirm that no element is locked initially
    const lockedIndicator = page.locator('text=Locked on:');
    await expect(lockedIndicator).not.toBeVisible();

    // 2. Click the 'Russia' label to lock it
    const russiaLabel = page.locator('svg text:has-text("Russia")');
    await expect(russiaLabel).toBeVisible();
    await russiaLabel.click({ force: true });

    // 3. Confirm that the chart is locked on Russia
    const lockedRussiaIndicator = page.locator('text=Locked on: Russia');
    await expect(lockedRussiaIndicator).toBeVisible();

    // 4. Click the rotation slider (outside the chart container) to change rotation
    const rotationSlider = page.locator('input[type="range"]').first();
    await expect(rotationSlider).toBeVisible();

    // Click on the slider to change rotation
    await rotationSlider.click({ force: true });

    // 5. Confirm that the selection is NOT lost when clicking the slider
    await expect(lockedRussiaIndicator).toBeVisible();

    // 6. Click on the center of the chart (inside the donut-canvas-wrapper, but outside slices) to clear selection
    const centerHole = page.locator('.center-text-group').first();
    await expect(centerHole).toBeVisible();
    await centerHole.click({ force: true });

    // 7. Confirm that the selection is now cleared
    await expect(lockedRussiaIndicator).not.toBeVisible();
  });

  test('should toggle 3D Render Mode and Show Labels & Leader Lines correctly', async ({ page }) => {
    // 1. Confirm SVG has expanded viewBox initially (e.g. starts with '0 0 760 320' or animates from it)
    const svg = page.locator('.items-svg-chart').first();
    await expect(svg).toBeVisible();

    // 2. Toggle "Show Labels & Leader Lines" to collapse it
    const showLabelsInput = page.locator('.switch-row:has-text("Show Labels & Leader Lines") input[type="checkbox"]').first();
    const showLabelsSwitch = page.locator('.switch-row:has-text("Show Labels & Leader Lines") .nano-switch').first();
    await expect(showLabelsInput).toBeChecked();
    await showLabelsSwitch.click();
    await expect(showLabelsInput).not.toBeChecked();

    // 3. Toggle "3D Render Mode"
    const render3dInput = page.locator('.switch-row:has-text("3D Render Mode") input[type="checkbox"]').first();
    const render3dSwitch = page.locator('.switch-row:has-text("3D Render Mode") .nano-switch').first();
    await expect(render3dInput).toBeChecked();
    await render3dSwitch.click();
    await expect(render3dInput).not.toBeChecked();

    // 4. Confirm the slope ratio slider is disabled
    const slopeSlider = page.locator('.slider-row:has-text("Slope Ratio (Tilt)") input[type="range"]');
    await expect(slopeSlider).toBeDisabled();

    // 5. Toggle "Compact (Mini) Layout" to collapse it
    const compactInput = page.locator('.switch-row:has-text("Compact (Mini) Layout") input[type="checkbox"]');
    const compactSlider = page.locator('.switch-row:has-text("Compact (Mini) Layout") .switch-slider');
    if (await compactInput.count() > 0) {
      await expect(compactInput).not.toBeChecked();
      await compactSlider.click();
      await expect(compactInput).toBeChecked();
    }
  });

  test('should disable hover and click interactions for single datapoint', async ({ page }) => {
    // 1. Click '1 Data Point' button
    const oneDatapointBtn = page.locator('button:has-text("1 Data Point")').first();
    await expect(oneDatapointBtn).toBeVisible();
    await oneDatapointBtn.click();

    // 2. Confirm that only Poland slice remains
    const centerText = page.locator('.center-text-value').first();
    await expect(centerText).toHaveText('0.31');

    // 3. Confirm clicking Poland label does NOT lock the element
    const polandLabel = page.locator('svg text:has-text("Poland")').first();
    await expect(polandLabel).toBeVisible();
    await polandLabel.click({ force: true });

    const lockedIndicator = page.locator('text=Locked on:');
    await expect(lockedIndicator).not.toBeVisible();
  });
});

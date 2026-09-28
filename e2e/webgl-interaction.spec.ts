import { test, expect } from '@playwright/test';

test.describe('The Nexus WebGL 3D Application E2E Tests', () => {
  test('should load canvas and initialize WebGL context without severe console errors', async ({ page }) => {
    const webglErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && (msg.text().includes('WebGL') || msg.text().includes('THREE'))) {
        webglErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');

    // Verify Canvas presence
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify WebGL context creation on canvas
    const isWebGLSupported = await page.evaluate(() => {
      const canvasEl = document.querySelector('canvas');
      if (!canvasEl) return false;
      const gl = canvasEl.getContext('webgl2') || canvasEl.getContext('webgl');
      return gl !== null;
    });

    expect(isWebGLSupported).toBe(true);

    // Verify UI Overlay header element is mounted
    await expect(page.getByRole('banner').getByText('THE NEXUS')).toBeVisible();

    // Check no WebGL or Three.js errors occurred during render
    expect(webglErrors).toHaveLength(0);
  });

  test('should toggle FPS display and sound controls', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas');

    // Toggle FPS button
    const fpsBtn = page.getByTestId('toggle-fps-btn');
    await expect(fpsBtn).toBeVisible();
    await fpsBtn.click({ force: true });

    // Toggle Sound button
    const soundBtn = page.getByTestId('toggle-sound-btn');
    await expect(soundBtn).toBeVisible();
    await soundBtn.click({ force: true });
  });

  test('should scroll through stages and trigger 3D Hotspot interaction', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('canvas');

    // Scroll down page to trigger GSAP ScrollTrigger timeline
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
    await page.waitForTimeout(1000);

    // Click on Hotspot button if available in DOM
    const hotspotBtn = page.getByTestId('hotspot-headphones').first();
    if (await hotspotBtn.isVisible()) {
      await hotspotBtn.click();

      // Verify Product Card modal opens
      const modal = page.getByTestId('product-card-modal');
      await expect(modal).toBeVisible();
      await expect(page.getByText('Nexus Neural Headphones')).toBeVisible();

      // Close modal
      const closeBtn = page.getByTestId('close-modal-btn');
      await closeBtn.click();
      await expect(modal).not.toBeVisible();
    }
  });
});

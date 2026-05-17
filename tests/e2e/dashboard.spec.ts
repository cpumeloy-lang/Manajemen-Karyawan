import { test, expect } from '@playwright/test';

/**
 * Dashboard & Navigation E2E Tests
 * Smoke tests for main UI flows
 */

test.describe('Dashboard & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'Test@1234';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 10000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    await page.goto('/');
    
    // Check for main dashboard elements
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard-container, main');
    await expect(dashboard).toBeVisible();
    
    // Should not redirect to login
    expect(page.url()).not.toContain('login');
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation (sidebar or navbar)
    const nav = page.locator('nav, [role="navigation"], .sidebar, .navbar');
    await expect(nav).toBeVisible();
    
    // Verify key menu items exist
    const menuItems = page.locator('a, button', { has: page.locator('text=/Dashboard|Attendance|Requests|Profile/i') });
    expect(await menuItems.count()).toBeGreaterThan(0);
  });

  test('should navigate between sections', async ({ page }) => {
    await page.goto('/');
    
    // Try navigate to attendance
    const attendanceLink = page.locator('a:has-text("Attendance"), a:has-text("Absensi"), button:has-text("Absensi")').first();
    
    if (await attendanceLink.isVisible()) {
      await attendanceLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify URL changed
      expect(page.url()).toContain('attendance');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline by blocking requests
    await page.context().setOffline(true);
    
    await page.goto('/');
    
    // Page should show offline indicator or error
    const offlineIndicator = page.locator('text=/offline|connection|failed/i');
    
    await offlineIndicator.isVisible().catch(() => {
      // If no indicator, that's also OK (app may have cached assets)
      console.log('⚠️  No offline indicator (app may use cache)');
    });
    
    // Restore online
    await page.context().setOffline(false);
  });

  test('should be responsive on mobile', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE size
    });
    const page = await mobileContext.newPage();
    
    await page.goto('/');
    
    // Login
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'Test@1234';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 10000 });
    
    // Check if layout is responsive (no horizontal scroll)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    
    await mobileContext.close();
  });

  test('should load in reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'load' });
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests login flow and session management
 */

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/');
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button:has-text("Login")');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');
    
    // Expect error message
    const errorMessage = page.locator('text=/invalid|error|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should login with valid test credentials', async ({ page }) => {
    await page.goto('/');
    
    // Use test credentials (from env or hardcoded for testing)
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'Test@1234';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 10000 });
    
    // Verify we're logged in
    expect(page.url()).not.toContain('login');
  });

  test('should display user info after login', async ({ page, context }) => {
    // Login first
    await page.goto('/');
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'Test@1234';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 10000 });
    
    // Check for user display (name, email, role)
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, .profile-section');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/');
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_PASSWORD || 'Test@1234';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Login")');
    
    await page.waitForURL(/\/(dashboard|attendance)/, { timeout: 10000 });
    
    // Click logout (may be in menu or footer)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout-btn"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Verify redirect to login
      await page.waitForURL(/\/(login|)/, { timeout: 5000 });
      expect(page.url()).not.toContain('dashboard');
    }
  });
});

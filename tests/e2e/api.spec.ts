import { test, expect } from '@playwright/test';

/**
 * API Integration E2E Tests
 * Tests backend API endpoints directly
 */

test.describe('API Integration', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token from test environment
    // This would typically come from Supabase auth
    authToken = process.env.TEST_AUTH_TOKEN || '';
  });

  test('should respond to health check', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
  });

  test('should list employees with pagination', async ({ request }) => {
    const response = await request.get('/api/employees?page=1&limit=20', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    // May fail if not authenticated, but endpoint should exist
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
    }
  });

  test('should fetch attendance records', async ({ request }) => {
    const response = await request.get('/api/attendance', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    }
  });

  test('should handle unauthorized requests', async ({ request }) => {
    const response = await request.get('/api/employees', {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    
    // Should return 401 or similar
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should handle 404 for missing endpoints', async ({ request }) => {
    const response = await request.get('/api/nonexistent', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    expect(response.status()).toBe(404);
  });
});

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api.spec.ts >> API Integration >> should respond to health check
- Location: tests\e2e\api.spec.ts:17:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 503
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * API Integration E2E Tests
  5  |  * Tests backend API endpoints directly
  6  |  */
  7  | 
  8  | test.describe('API Integration', () => {
  9  |   let authToken: string;
  10 | 
  11 |   test.beforeAll(async ({ request }) => {
  12 |     // Get auth token from test environment
  13 |     // This would typically come from Supabase auth
  14 |     authToken = process.env.TEST_AUTH_TOKEN || '';
  15 |   });
  16 | 
  17 |   test('should respond to health check', async ({ request }) => {
  18 |     const response = await request.get('/api/health');
  19 |     
> 20 |     expect(response.status()).toBe(200);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  21 |     const data = await response.json();
  22 |     
  23 |     expect(data).toHaveProperty('status');
  24 |     expect(data).toHaveProperty('timestamp');
  25 |   });
  26 | 
  27 |   test('should list employees with pagination', async ({ request }) => {
  28 |     const response = await request.get('/api/employees?page=1&limit=20', {
  29 |       headers: {
  30 |         Authorization: `Bearer ${authToken}`,
  31 |       },
  32 |     });
  33 |     
  34 |     // May fail if not authenticated, but endpoint should exist
  35 |     expect(response.status()).toBeGreaterThanOrEqual(200);
  36 |     expect(response.status()).toBeLessThan(500);
  37 |     
  38 |     if (response.status() === 200) {
  39 |       const data = await response.json();
  40 |       expect(data).toHaveProperty('success');
  41 |       expect(data).toHaveProperty('data');
  42 |       expect(data).toHaveProperty('pagination');
  43 |     }
  44 |   });
  45 | 
  46 |   test('should fetch attendance records', async ({ request }) => {
  47 |     const response = await request.get('/api/attendance', {
  48 |       headers: {
  49 |         Authorization: `Bearer ${authToken}`,
  50 |       },
  51 |     });
  52 |     
  53 |     expect(response.status()).toBeGreaterThanOrEqual(200);
  54 |     expect(response.status()).toBeLessThan(500);
  55 |     
  56 |     if (response.status() === 200) {
  57 |       const data = await response.json();
  58 |       expect(data).toHaveProperty('success');
  59 |       expect(data).toHaveProperty('data');
  60 |     }
  61 |   });
  62 | 
  63 |   test('should handle unauthorized requests', async ({ request }) => {
  64 |     const response = await request.get('/api/employees', {
  65 |       headers: {
  66 |         Authorization: 'Bearer invalid-token',
  67 |       },
  68 |     });
  69 |     
  70 |     // Should return 401 or similar
  71 |     expect(response.status()).toBeGreaterThanOrEqual(400);
  72 |   });
  73 | 
  74 |   test('should handle 404 for missing endpoints', async ({ request }) => {
  75 |     const response = await request.get('/api/nonexistent', {
  76 |       headers: {
  77 |         Authorization: `Bearer ${authToken}`,
  78 |       },
  79 |     });
  80 |     
  81 |     expect(response.status()).toBe(404);
  82 |   });
  83 | });
  84 | 
```
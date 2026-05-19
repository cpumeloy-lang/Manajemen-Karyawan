import { describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

describe('Organization API', () => {
  const testToken = process.env.TEST_AUTH_TOKEN || '';

  describe('POST /api/organization/units', () => {
    it('rejects without auth token', async () => {
      const res = await fetch(`${BASE}/api/organization/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: { nama: 'Test Unit' } }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects empty unit name', async () => {
      if (!testToken) return;
      const res = await fetch(`${BASE}/api/organization/units`, {
        method: 'POST',
        headers: authHeaders(testToken),
        body: JSON.stringify({ unit: { nama: '' } }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects missing unit payload', async () => {
      if (!testToken) return;
      const res = await fetch(`${BASE}/api/organization/units`, {
        method: 'POST',
        headers: authHeaders(testToken),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/organization/departments', () => {
    it('rejects without auth token', async () => {
      const res = await fetch(`${BASE}/api/organization/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: { nama: 'Test Dept' } }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects empty department name', async () => {
      if (!testToken) return;
      const res = await fetch(`${BASE}/api/organization/departments`, {
        method: 'POST',
        headers: authHeaders(testToken),
        body: JSON.stringify({ department: { nama: '' } }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/organization/positions', () => {
    it('rejects without auth token', async () => {
      const res = await fetch(`${BASE}/api/organization/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: { nama: 'Test Position' } }),
      });
      expect(res.status).toBe(401);
    });

    it('rejects empty position name', async () => {
      if (!testToken) return;
      const res = await fetch(`${BASE}/api/organization/positions`, {
        method: 'POST',
        headers: authHeaders(testToken),
        body: JSON.stringify({ position: { nama: '' } }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE endpoints reject without auth', () => {
    it('DELETE /api/organization/units/:id', async () => {
      const res = await fetch(`${BASE}/api/organization/units/fake-id`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/organization/departments/:id', async () => {
      const res = await fetch(`${BASE}/api/organization/departments/fake-id`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/organization/positions/:id', async () => {
      const res = await fetch(`${BASE}/api/organization/positions/fake-id`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/employees/:id', async () => {
      const res = await fetch(`${BASE}/api/employees/fake-id`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/audit-logs', async () => {
      const res = await fetch(`${BASE}/api/audit-logs`, { method: 'DELETE' });
      expect(res.status).toBe(401);
    });
  });
});

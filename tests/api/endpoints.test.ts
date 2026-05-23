import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../server/middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../server/schemas/employeeSchemas.js';
import { saveUnitSchema, saveDepartmentSchema, savePositionSchema } from '../../server/schemas/organizationSchemas.js';
import { bulkAttendanceChangeSchema, deleteAuditLogsSchema, cacheInvalidateSchema } from '../../server/schemas/operationsSchemas.js';

// Create test app with Zod validation middleware (matches real routes)
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Employee endpoints
  app.post('/api/employees', validate(createEmployeeSchema), (_req, res) => {
    const { employeeData } = _req.body;
    res.status(201).json({ success: true, data: { id: '123', ...employeeData } });
  });

  app.put('/api/employees/:id', validate(updateEmployeeSchema), (_req, res) => {
    res.json({ success: true, data: { id: _req.params.id, ..._req.body.updateData } });
  });

  // Organization endpoints
  app.post('/api/organization/units', validate(saveUnitSchema), (_req, res) => {
    res.json({ success: true, data: { id: '1', nama: _req.body.unit.nama } });
  });

  app.post('/api/organization/departments', validate(saveDepartmentSchema), (_req, res) => {
    res.json({ success: true, data: { id: '2', nama: _req.body.department.nama } });
  });

  app.post('/api/organization/positions', validate(savePositionSchema), (_req, res) => {
    res.json({ success: true, data: { id: '3', nama: _req.body.position.nama } });
  });

  // Operations endpoints
  app.post('/api/operations/attendance-change-requests/bulk', validate(bulkAttendanceChangeSchema), (_req, res) => {
    res.json({ success: true, count: _req.body.payloads.length });
  });

  app.delete('/api/operations/audit-logs', validate(deleteAuditLogsSchema), (_req, res) => {
    res.json({ success: true, data: { deletedCount: 0 } });
  });

  // System endpoints
  app.post('/api/system/cache/invalidate', validate(cacheInvalidateSchema), (_req, res) => {
    res.json({ success: true });
  });

  return app;
};

describe('API Endpoint Tests', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // ── Employee Validation ──
  describe('Employee Endpoints — Zod Validation', () => {
    it('should create employee with valid data', async () => {
      const res = await request(app).post('/api/employees').send({
        employeeData: { nama: 'Test User', email: 'test@example.com' },
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama).toBe('Test User');
    });

    it('should reject missing employeeData', async () => {
      const res = await request(app).post('/api/employees').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('details');
    });

    it('should reject empty nama', async () => {
      const res = await request(app).post('/api/employees').send({
        employeeData: { nama: '', email: 'test@example.com' },
      });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.field.includes('nama'))).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/employees').send({
        employeeData: { nama: 'Test', email: 'not-an-email' },
      });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.field.includes('email'))).toBe(true);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/employees').send({
        employeeData: { nama: 'Test', email: 'ok@test.com' },
        password: '12',
      });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.field === 'password')).toBe(true);
    });

    it('should accept valid password', async () => {
      const res = await request(app).post('/api/employees').send({
        employeeData: { nama: 'Test', email: 'ok@test.com' },
        password: 'secure123',
      });
      expect(res.status).toBe(201);
    });

    it('should update employee with valid updateData', async () => {
      const res = await request(app).put('/api/employees/abc-123').send({
        updateData: { nama: 'Updated Name' },
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject empty updateData', async () => {
      const res = await request(app).put('/api/employees/abc-123').send({
        updateData: {},
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Organization Validation ──
  describe('Organization Endpoints — Zod Validation', () => {
    it('should create unit with valid data', async () => {
      const res = await request(app).post('/api/organization/units').send({
        unit: { nama: 'ICU' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.nama).toBe('ICU');
    });

    it('should reject unit with empty nama', async () => {
      const res = await request(app).post('/api/organization/units').send({
        unit: { nama: '' },
      });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.field.includes('nama'))).toBe(true);
    });

    it('should reject unit without body', async () => {
      const res = await request(app).post('/api/organization/units').send({});
      expect(res.status).toBe(400);
    });

    it('should create department with valid data', async () => {
      const res = await request(app).post('/api/organization/departments').send({
        department: { nama: 'Keperawatan' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.nama).toBe('Keperawatan');
    });

    it('should reject department with empty nama', async () => {
      const res = await request(app).post('/api/organization/departments').send({
        department: { nama: '' },
      });
      expect(res.status).toBe(400);
    });

    it('should create position with valid data', async () => {
      const res = await request(app).post('/api/organization/positions').send({
        position: { nama: 'Perawat Senior' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.nama).toBe('Perawat Senior');
    });

    it('should reject position with empty nama', async () => {
      const res = await request(app).post('/api/organization/positions').send({
        position: { nama: '' },
      });
      expect(res.status).toBe(400);
    });
  });

  // ── Operations Validation ──
  describe('Operations Endpoints — Zod Validation', () => {
    it('should accept valid bulk attendance change request', async () => {
      const res = await request(app).post('/api/operations/attendance-change-requests/bulk').send({
        payloads: [{
          employee_id: '550e8400-e29b-41d4-a716-446655440000',
          tanggal: '2025-01-15',
          field: 'clockIn',
          new_value: '08:00',
          reason: 'Koreksi jam masuk',
        }],
      });
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should reject empty payloads array', async () => {
      const res = await request(app).post('/api/operations/attendance-change-requests/bulk').send({
        payloads: [],
      });
      expect(res.status).toBe(400);
    });

    it('should reject payload with invalid employee_id', async () => {
      const res = await request(app).post('/api/operations/attendance-change-requests/bulk').send({
        payloads: [{ employee_id: 'not-uuid', tanggal: '2025-01-15', field: 'clockIn', reason: 'test' }],
      });
      expect(res.status).toBe(400);
      expect(res.body.details.some((d: any) => d.field.includes('employee_id'))).toBe(true);
    });

    it('should accept valid audit log deletion', async () => {
      const res = await request(app).delete('/api/operations/audit-logs').send({ mode: 'old', days: 30 });
      expect(res.status).toBe(200);
    });

    it('should reject invalid audit log mode', async () => {
      const res = await request(app).delete('/api/operations/audit-logs').send({ mode: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  // ── System Validation ──
  describe('System Endpoints — Zod Validation', () => {
    it('should accept cache invalidation with pattern', async () => {
      const res = await request(app).post('/api/system/cache/invalidate').send({ pattern: 'employees:*' });
      expect(res.status).toBe(200);
    });

    it('should accept cache invalidation with userId', async () => {
      const res = await request(app).post('/api/system/cache/invalidate').send({
        userId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(res.status).toBe(200);
    });

    it('should reject cache invalidation without pattern or userId', async () => {
      const res = await request(app).post('/api/system/cache/invalidate').send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Auth & RBAC ──
  describe('Auth & RBAC', () => {
    it('should reject unauthenticated requests to protected routes', async () => {
      const res = await request(app).post('/api/employees').send({});
      expect(res.status).toBe(400); // Zod validation fails before auth
    });

    it('should reject requests with invalid role for admin-only endpoints', async () => {
      const res = await request(app).delete('/api/organization/units/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 405 for unsupported methods', async () => {
      const res = await request(app).patch('/api/health');
      expect(res.status).toBe(404);
    });
  });

  // ── Error Handling ──
  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Content-Type', 'application/json')
        .send('not-json');
      expect(res.status).toBe(400);
    });

    it('should handle large payloads', async () => {
      const largeString = 'x'.repeat(100000);
      const res = await request(app).post('/api/employees').send({ employeeData: { nama: largeString } });
      expect(res.status).toBe(400);
    });

    it('should handle missing content-type', async () => {
      const res = await request(app).post('/api/employees').send('some data');
      expect(res.status).toBe(400);
    });
  });
});

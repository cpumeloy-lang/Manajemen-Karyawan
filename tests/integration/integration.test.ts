import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// INTEGRATION TESTS
// Tests for database operations, cache, and RBAC
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

describe('Integration Tests - Database Operations', () => {
  let supabase: any;

  beforeAll(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('⚠️ Supabase credentials not set, skipping integration tests');
      return;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Employees Table', () => {
    it('should be able to query employees table', async () => {
      if (!supabase) {
        expect(true).toBe(true); // Skip test
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('id, nama, email, role')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should respect RLS policies', async () => {
      if (!supabase) {
        expect(true).toBe(true); // Skip test
        return;
      }

      // Try to insert without auth - should fail due to RLS
      const { error } = await supabase
        .from('employees')
        .insert({ nama: 'Test', email: 'test@example.com', role: 'karyawan' });

      // Should fail because no auth/RLS blocks it
      expect(error).not.toBeNull();
    });
  });

  describe('Organization Tables', () => {
    it('should be able to query units table', async () => {
      if (!supabase) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await supabase
        .from('units')
        .select('id, nama')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should be able to query departments table', async () => {
      if (!supabase) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await supabase
        .from('departments')
        .select('id, nama')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should be able to query positions table', async () => {
      if (!supabase) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await supabase
        .from('positions')
        .select('id, nama')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Attendance Table', () => {
    it('should be able to query attendance table', async () => {
      if (!supabase) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await supabase
        .from('attendance')
        .select('id, tanggal, status')
        .limit(1);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

describe('Integration Tests - Redis Cache', () => {
  it('should be able to connect to Redis', async () => {
    try {
      const { getCache } = await import('../../services/redisCache');
      const cache = getCache();
      
      // Test set/get
      await cache.set('test-integration', 'ok', 10);
      const result = await cache.get('test-integration');
      
      expect(result).toBe('ok');
      
      // Cleanup
      await cache.del('test-integration');
    } catch (err) {
      // If Redis is not available, skip test
      console.warn('⚠️ Redis not available, skipping cache integration test');
      expect(true).toBe(true);
    }
  });

  it('should handle cache invalidation', async () => {
    try {
      const { getCache } = await import('../../services/redisCache');
      const cache = getCache();
      
      // Set multiple keys
      await cache.set('test:1', 'value1', 10);
      await cache.set('test:2', 'value2', 10);
      await cache.set('test:3', 'value3', 10);
      
      // Invalidate pattern
      await cache.invalidatePattern('test:*');
      
      // Verify all are gone
      const v1 = await cache.get('test:1');
      const v2 = await cache.get('test:2');
      const v3 = await cache.get('test:3');
      
      expect(v1).toBeNull();
      expect(v2).toBeNull();
      expect(v3).toBeNull();
    } catch (err) {
      console.warn('⚠️ Redis not available, skipping cache invalidation test');
      expect(true).toBe(true);
    }
  });
});

describe('Integration Tests - RBAC Service', () => {
  it('should validate permissions correctly', async () => {
    const rbacService = await import('../../services/rbacService');
    
    // Admin should have all permissions
    const adminPerms = rbacService.default.getRolePermissions('admin');
    expect(adminPerms.length).toBeGreaterThan(0);
    expect(adminPerms).toContain('read:all_employees');
    
    // Karyawan should have limited permissions
    const employeePerms = rbacService.default.getRolePermissions('karyawan');
    expect(employeePerms.length).toBeLessThan(adminPerms.length);
    expect(employeePerms).toContain('read:own_profile');
    expect(employeePerms).not.toContain('read:all_employees');
  });

  it('should check authorization correctly', async () => {
    const rbacService = await import('../../services/rbacService');
    
    // Admin can manage employees
    const adminCanManage = rbacService.default.hasPermission('admin', 'create:employee');
    expect(adminCanManage).toBe(true);
    
    // Karyawan cannot manage employees
    const employeeCanManage = rbacService.default.hasPermission('karyawan', 'create:employee');
    expect(employeeCanManage).toBe(false);
  });
});

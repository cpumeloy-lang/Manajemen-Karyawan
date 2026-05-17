import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    })),
  },
}));

import { attendanceService } from '../attendanceService';

describe('attendanceService', () => {
  describe('list', () => {
    it('should return empty array when no records', async () => {
      const { supabase } = require('../../config/supabase');
      const mockSingle = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockOrder = vi.fn().mockReturnValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder, data: [], error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as any).mockReturnValue({ select: mockSelect });

      const records = await attendanceService.list('employee-1');
      expect(records).toEqual([]);
    });
  });

  describe('checkIn', () => {
    it('should throw if employeeId missing', async () => {
      await expect(
        attendanceService.checkIn(
          { id: '', name: '', email: '', role: 'karyawan' } as any,
          { tanggal: '2026-01-01', clockIn: '08:00', location: 'RS' }
        )
      ).rejects.toThrow();
    });
  });
});

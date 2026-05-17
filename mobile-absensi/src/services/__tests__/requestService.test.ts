import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    })),
  },
}));

import { requestService } from '../requestService';

describe('requestService', () => {
  describe('create', () => {
    it('should throw if reason is too short', async () => {
      await expect(
        requestService.create('emp-1', {
          type: 'Izin',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          reason: 'ab',
        })
      ).rejects.toThrow('Alasan minimal 5 karakter');
    });

    it('should throw if startDate > endDate', async () => {
      await expect(
        requestService.create('emp-1', {
          type: 'Cuti',
          startDate: '2026-01-10',
          endDate: '2026-01-05',
          reason: 'Alasan cukup panjang',
        })
      ).rejects.toThrow('Tanggal mulai tidak boleh setelah tanggal selesai');
    });

    it('should throw if Reimburse has no amount', async () => {
      await expect(
        requestService.create('emp-1', {
          type: 'Reimburse',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          reason: 'Alasan cukup panjang',
        })
      ).rejects.toThrow('Jumlah reimburse wajib diisi');
    });
  });
});

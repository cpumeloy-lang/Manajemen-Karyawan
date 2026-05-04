import { describe, expect, it } from 'vitest';
import {
  validateOperationalAttendanceAccess,
  validatePersonalAttendanceAccess,
} from './attendanceAccess';

describe('attendanceAccess', () => {
  describe('validatePersonalAttendanceAccess', () => {
    it('rejects when portal is not personal', () => {
      expect(validatePersonalAttendanceAccess('operational', 'emp-1', 'emp-1')).toContain('portal personal');
    });

    it('rejects when auth employee id is missing', () => {
      expect(validatePersonalAttendanceAccess('personal', null, 'emp-1')).toContain('Profil pengguna tidak valid');
    });

    it('rejects when target employee id is missing', () => {
      expect(validatePersonalAttendanceAccess('personal', 'emp-1', null)).toContain('Employee ID wajib diisi');
    });

    it('rejects when target employee is not self', () => {
      expect(validatePersonalAttendanceAccess('personal', 'emp-1', 'emp-2')).toContain('milik akun sendiri');
    });

    it('allows self attendance in personal portal', () => {
      expect(validatePersonalAttendanceAccess('personal', 'emp-1', 'emp-1')).toBeNull();
    });
  });

  describe('validateOperationalAttendanceAccess', () => {
    it('rejects when portal is not operational', () => {
      expect(validateOperationalAttendanceAccess('personal', 'admin', 'emp-1')).toContain('portal operasional');
    });

    it('rejects for non-operational role', () => {
      expect(validateOperationalAttendanceAccess('operational', 'karyawan', 'emp-1')).toContain('tidak memiliki akses');
    });

    it('rejects when target employee id is missing', () => {
      expect(validateOperationalAttendanceAccess('operational', 'admin', '')).toContain('Karyawan wajib dipilih');
    });

    it('allows admin/hr/hrd/kepala_ruangan in operational portal', () => {
      expect(validateOperationalAttendanceAccess('operational', 'admin', 'emp-1')).toBeNull();
      expect(validateOperationalAttendanceAccess('operational', 'hr', 'emp-1')).toBeNull();
      expect(validateOperationalAttendanceAccess('operational', 'hrd', 'emp-1')).toBeNull();
      expect(validateOperationalAttendanceAccess('operational', 'kepala_ruangan', 'emp-1')).toBeNull();
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  isAdminRole,
  isHrRole,
  isKepalaRuanganRole,
  isOperationalRole,
  canProvisionEmployeeLogin,
  canViewEmployeeData,
  canModifyPayroll,
  canApproveRequests,
} from './roleUtils';

describe('roleUtils', () => {
  it('detects core roles with normalization', () => {
    expect(isAdminRole(' ADMIN ')).toBe(true);
    expect(isHrRole('hr')).toBe(true);
    expect(isHrRole('HRD')).toBe(true);
    expect(isKepalaRuanganRole('kepala_ruangan')).toBe(true);
    expect(isAdminRole('karyawan')).toBe(false);
  });

  it('marks operational roles correctly', () => {
    expect(isOperationalRole('admin')).toBe(true);
    expect(isOperationalRole('hr')).toBe(true);
    expect(isOperationalRole('hrd')).toBe(true);
    expect(isOperationalRole('kepala_ruangan')).toBe(false);
  });

  it('evaluates permission helpers consistently', () => {
    expect(canProvisionEmployeeLogin('admin')).toBe(true);
    expect(canProvisionEmployeeLogin('hrd')).toBe(true);
    expect(canProvisionEmployeeLogin('kepala_ruangan')).toBe(false);

    expect(canViewEmployeeData('admin')).toBe(true);
    expect(canViewEmployeeData('hr')).toBe(true);
    expect(canViewEmployeeData('kepala_ruangan')).toBe(true);
    expect(canViewEmployeeData('karyawan')).toBe(false);

    expect(canModifyPayroll('admin')).toBe(true);
    expect(canModifyPayroll('hr')).toBe(true);
    expect(canModifyPayroll('kepala_ruangan')).toBe(false);

    expect(canApproveRequests('admin')).toBe(true);
    expect(canApproveRequests('hrd')).toBe(true);
    expect(canApproveRequests('kepala_ruangan')).toBe(true);
    expect(canApproveRequests('karyawan')).toBe(false);
  });
});

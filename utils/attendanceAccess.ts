import { isAdminRole, isHrRole, isKepalaRuanganRole } from './roleUtils';

export type PortalType = 'personal' | 'operational' | null;

export const validatePersonalAttendanceAccess = (
  portal: PortalType,
  authEmployeeId?: string | null,
  targetEmployeeId?: string | null
): string | null => {
  if (portal !== 'personal') {
    return 'Input absensi personal hanya dapat dilakukan di portal personal.';
  }

  if (!authEmployeeId) {
    return 'Profil pengguna tidak valid untuk input absensi personal.';
  }

  if (!targetEmployeeId) {
    return 'Employee ID wajib diisi.';
  }

  if (targetEmployeeId !== authEmployeeId) {
    return 'Anda hanya dapat menginput absensi milik akun sendiri di portal personal.';
  }

  return null;
};

export const validateOperationalAttendanceAccess = (
  portal: PortalType,
  role?: string | null,
  targetEmployeeId?: string | null
): string | null => {
  if (portal !== 'operational') {
    return 'Input absensi operasional hanya dapat dilakukan di portal operasional.';
  }

  const hasOperationalRole =
    isAdminRole(role) ||
    isHrRole(role) ||
    isKepalaRuanganRole(role);

  if (!hasOperationalRole) {
    return 'Peran Anda tidak memiliki akses input absensi operasional.';
  }

  if (!targetEmployeeId) {
    return 'Karyawan wajib dipilih untuk input absensi operasional.';
  }

  return null;
};

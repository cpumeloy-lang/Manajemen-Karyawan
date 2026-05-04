import { isAdminRole, isHrRole, isKepalaRuanganRole } from '../utils/roleUtils';

export type PortalType = 'personal' | 'operational';

export const canAccessOperationalPortal = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);
};

export const canManageOperationalRequests = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);
};

export const canManageEmployees = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role);
  // Note: Kepala ruangan TIDAK bisa manage employees secara penuh
  // Mereka hanya bisa melihat data karyawan di unit mereka
};

export const canManageOrganization = (role?: string | null): boolean => {
  return isAdminRole(role);
};

export const canManageSystemSettings = (role?: string | null): boolean => {
  return isAdminRole(role);
};

export const canViewEmployeeData = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);
};

export const canManagePayroll = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role);
};

export const canApproveRequests = (role?: string | null): boolean => {
  return isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);
};

export const ensurePortalAccess = (
  portal: PortalType | null,
  expected: PortalType,
  actionLabel: string
): string | null => {
  if (portal !== expected) {
    return `${actionLabel} hanya dapat dilakukan di portal ${expected}.`;
  }

  return null;
};
/**
 * Role Authorization Utilities
 * Centralized role checking logic
 */

const normalizeRole = (role?: string | null): string =>
  (role || '').trim().toLowerCase();

export const isAdminRole = (role?: string | null): boolean =>
  normalizeRole(role) === 'admin';

export const isHrRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'hrd' || normalized === 'hr';
};

export const isKepalaRuanganRole = (role?: string | null): boolean =>
  normalizeRole(role) === 'kepala_ruangan';

export const isOperationalRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return (
    normalized === 'admin' ||
    normalized === 'hrd' ||
    normalized === 'hr'
  );
};

export const canProvisionEmployeeLogin = (role?: string | null): boolean =>
  isAdminRole(role) || isHrRole(role);

export const canViewEmployeeData = (role?: string | null): boolean =>
  isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);

export const canModifyPayroll = (role?: string | null): boolean =>
  isAdminRole(role) || isHrRole(role);

export const canApproveRequests = (role?: string | null): boolean =>
  isAdminRole(role) || isHrRole(role) || isKepalaRuanganRole(role);

/**
 * RBAC SERVICE
 * Centralized role and permission helpers used across the app.
 */

import { dataSupabase } from './dataSupabaseClient';

export enum Permission {
  READ_EMPLOYEE = 'read:employee',
  CREATE_EMPLOYEE = 'create:employee',
  UPDATE_EMPLOYEE = 'update:employee',
  DELETE_EMPLOYEE = 'delete:employee',
  IMPORT_EMPLOYEE = 'import:employee',
  EXPORT_EMPLOYEE = 'export:employee',
  READ_ATTENDANCE = 'read:attendance',
  UPDATE_ATTENDANCE = 'update:attendance',
  APPROVE_ATTENDANCE = 'approve:attendance',
  READ_OWN_ATTENDANCE = 'read:own_attendance',
  READ_LEAVE = 'read:leave',
  CREATE_LEAVE = 'create:leave',
  APPROVE_LEAVE = 'approve:leave',
  UPDATE_LEAVE = 'update:leave',
  READ_OWN_LEAVE = 'read:own_leave',
  READ_PAYROLL = 'read:payroll',
  CREATE_PAYROLL = 'create:payroll',
  UPDATE_PAYROLL = 'update:payroll',
  APPROVE_PAYROLL = 'approve:payroll',
  READ_OWN_PAYROLL = 'read:own_payroll',
  READ_REPORT = 'read:report',
  EXPORT_REPORT = 'export:report',
  READ_ORG = 'read:org',
  MANAGE_ORG = 'manage:org',
  MANAGE_DEPARTMENT = 'manage:department',
  MANAGE_POSITION = 'manage:position',
  MANAGE_WORKUNIT = 'manage:workunit',
  MANAGE_SYSTEM = 'manage:system',
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_AUDIT_LOG = 'view:audit_log',
  MANAGE_USERS = 'manage:users',
}

export type UserRole = 'admin' | 'hrd' | 'kepala_ruangan' | 'karyawan';

export interface RBACUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId: string;
  unitId?: string | null;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    Permission.READ_EMPLOYEE,
    Permission.CREATE_EMPLOYEE,
    Permission.UPDATE_EMPLOYEE,
    Permission.DELETE_EMPLOYEE,
    Permission.IMPORT_EMPLOYEE,
    Permission.EXPORT_EMPLOYEE,
    Permission.READ_ATTENDANCE,
    Permission.UPDATE_ATTENDANCE,
    Permission.APPROVE_ATTENDANCE,
    Permission.READ_LEAVE,
    Permission.CREATE_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.UPDATE_LEAVE,
    Permission.READ_PAYROLL,
    Permission.CREATE_PAYROLL,
    Permission.UPDATE_PAYROLL,
    Permission.APPROVE_PAYROLL,
    Permission.READ_REPORT,
    Permission.EXPORT_REPORT,
    Permission.READ_ORG,
    Permission.MANAGE_ORG,
    Permission.MANAGE_DEPARTMENT,
    Permission.MANAGE_POSITION,
    Permission.MANAGE_WORKUNIT,
    Permission.MANAGE_SYSTEM,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOG,
    Permission.MANAGE_USERS,
    'read:all_employees',
    'read:all_attendance',
    'create:attendance',
    'update:attendance',
    'delete:attendance',
    'approve:requests',
    'reject:requests',
    'read:all_requests',
    'read:all_documents',
    'upload:document',
    'delete:document',
    'delete:payroll',
    'manage:organization',
    'manage:system_settings',
    'manage:roles',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  hrd: [
    Permission.READ_EMPLOYEE,
    Permission.CREATE_EMPLOYEE,
    Permission.UPDATE_EMPLOYEE,
    Permission.IMPORT_EMPLOYEE,
    Permission.EXPORT_EMPLOYEE,
    Permission.READ_ATTENDANCE,
    Permission.APPROVE_ATTENDANCE,
    Permission.READ_LEAVE,
    Permission.APPROVE_LEAVE,
    Permission.READ_PAYROLL,
    Permission.CREATE_PAYROLL,
    Permission.UPDATE_PAYROLL,
    Permission.APPROVE_PAYROLL,
    Permission.READ_REPORT,
    Permission.EXPORT_REPORT,
    Permission.READ_ORG,
    Permission.MANAGE_DEPARTMENT,
    Permission.MANAGE_POSITION,
    Permission.VIEW_AUDIT_LOG,
    'read:all_employees',
    'update:attendance',
    'approve:requests',
    'reject:requests',
    'read:all_requests',
    'read:all_documents',
    'upload:document',
    'read:payroll',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  kepala_ruangan: [
    Permission.READ_EMPLOYEE,
    Permission.READ_ATTENDANCE,
    Permission.UPDATE_ATTENDANCE,
    Permission.READ_LEAVE,
    Permission.READ_PAYROLL,
    Permission.READ_REPORT,
    Permission.READ_ORG,
    Permission.READ_OWN_ATTENDANCE,
    Permission.READ_OWN_LEAVE,
    Permission.CREATE_LEAVE,
    Permission.READ_OWN_PAYROLL,
    'read:unit_employees',
    'read:unit_attendance',
    'update:unit_attendance',
    'approve:unit_requests',
    'reject:unit_requests',
    'read:unit_requests',
  ],
  karyawan: [
    Permission.READ_OWN_ATTENDANCE,
    Permission.READ_OWN_LEAVE,
    Permission.CREATE_LEAVE,
    Permission.READ_OWN_PAYROLL,
    'read:own_profile',
    'update:own_profile',
    'create:own_request',
    'read:own_requests',
  ],
};

const normalizeRole = (role: string | null | undefined): UserRole | null => {
  if (!role) return null;
  const normalized = role.toLowerCase();
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, normalized)
    ? (normalized as UserRole)
    : null;
};

class RBACService {
  static hasPermission(userRole: UserRole | string | null | undefined, permission: string): boolean {
    const normalizedRole = normalizeRole(userRole);
    if (!normalizedRole) return false;
    return ROLE_PERMISSIONS[normalizedRole].includes(permission);
  }

  static hasAnyPermission(userRole: UserRole | string | null | undefined, permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(userRole, permission));
  }

  static hasAllPermissions(userRole: UserRole | string | null | undefined, permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(userRole, permission));
  }

  static getRolePermissions(role: UserRole): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  static requirePermission(userRole: UserRole | string | null | undefined, permission: string): void {
    if (!this.hasPermission(userRole, permission)) {
      throw new Error(`User does not have permission: ${permission}`);
    }
  }

  hasPermission(userRole: UserRole | string | null | undefined, permission: string): boolean {
    return RBACService.hasPermission(userRole, permission);
  }

  hasAnyPermission(userRole: UserRole | string | null | undefined, permissions: string[]): boolean {
    return RBACService.hasAnyPermission(userRole, permissions);
  }

  hasAllPermissions(userRole: UserRole | string | null | undefined, permissions: string[]): boolean {
    return RBACService.hasAllPermissions(userRole, permissions);
  }

  getRolePermissions(role: UserRole): string[] {
    return RBACService.getRolePermissions(role);
  }

  requirePermission(userRole: UserRole | string | null | undefined, permission: string): void {
    RBACService.requirePermission(userRole, permission);
  }

  static getVisibilityFilter(
    userRole: UserRole | string,
    userId: string,
    unitId?: string
  ): Record<string, unknown> | null {
    const normalizedRole = normalizeRole(userRole);

    switch (normalizedRole) {
      case 'admin':
      case 'hrd':
        return null;
      case 'kepala_ruangan':
        return { unitKerjaId: unitId };
      case 'karyawan':
        return { user_id: userId };
      default:
        return {};
    }
  }

  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await dataSupabase
        .from('employees')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching user role:', error?.message);
        return null;
      }

      return normalizeRole(data.role) || 'karyawan';
    } catch (error: any) {
      console.error('❌ Error in getUserRole:', error?.message || String(error));
      return null;
    }
  }

  async getUserContext(userId: string): Promise<RBACUser | null> {
    try {
      const { data, error } = await dataSupabase
        .from('employees')
        .select('id, email, role, "unitKerjaId"')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      const role = normalizeRole(data.role) || 'karyawan';

      return {
        id: userId,
        email: data.email,
        role,
        employeeId: data.id,
        unitId: data.unitKerjaId ?? null,
      };
    } catch (error: any) {
      console.error('Error fetching user context:', error?.message || String(error));
      return null;
    }
  }

  static canAccessResource(
    userRole: UserRole | string,
    userId: string,
    resourceType: string,
    resourceOwnerId?: string,
    userUnitId?: string,
    resourceUnitId?: string
  ): boolean {
    const normalizedRole = normalizeRole(userRole);

    if (normalizedRole === 'admin' || normalizedRole === 'hrd') {
      return true;
    }

    if (normalizedRole === 'kepala_ruangan') {
      return Boolean(userUnitId && resourceUnitId && userUnitId === resourceUnitId);
    }

    if (normalizedRole === 'karyawan') {
      return userId === resourceOwnerId;
    }

    return false;
  }

  canManageEmployee(
    userRole: UserRole | string | null,
    userUnitId?: string,
    targetEmployeeUnitId?: string
  ): PermissionCheck {
    const normalizedRole = normalizeRole(userRole);

    if (!normalizedRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (normalizedRole === 'admin' || normalizedRole === 'hrd') {
      return { allowed: true };
    }

    if (normalizedRole === 'kepala_ruangan') {
      if (userUnitId && targetEmployeeUnitId && userUnitId === targetEmployeeUnitId) {
        return { allowed: true };
      }

      return {
        allowed: false,
        reason: 'Kepala ruangan hanya dapat mengelola karyawan di unit mereka',
      };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  canViewAttendance(
    userRole: UserRole | string | null,
    userEmployeeId?: string,
    targetEmployeeId?: string,
    targetUnitId?: string,
    userUnitId?: string
  ): PermissionCheck {
    const normalizedRole = normalizeRole(userRole);

    if (!normalizedRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (normalizedRole === 'admin' || normalizedRole === 'hrd') {
      return { allowed: true };
    }

    if (normalizedRole === 'kepala_ruangan') {
      if (userUnitId && targetUnitId && userUnitId === targetUnitId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Hanya dapat melihat presensi di unit Anda' };
    }

    if (normalizedRole === 'karyawan') {
      if (userEmployeeId === targetEmployeeId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Hanya dapat melihat presensi Anda sendiri' };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  canApproveRequest(
    userRole: UserRole | string | null,
    requestType?: string,
    userUnitId?: string,
    targetUnitId?: string
  ): PermissionCheck {
    const normalizedRole = normalizeRole(userRole);

    if (!normalizedRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (normalizedRole === 'admin' || normalizedRole === 'hrd') {
      return { allowed: true };
    }

    if (normalizedRole === 'kepala_ruangan') {
      if (userUnitId && targetUnitId && userUnitId === targetUnitId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Hanya dapat approve request dari unit Anda' };
    }

    return { allowed: false, reason: 'Role Anda tidak memiliki hak approve' };
  }

  canManagePayroll(userRole: UserRole | string | null): PermissionCheck {
    const normalizedRole = normalizeRole(userRole);

    if (!normalizedRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (normalizedRole === 'admin' || normalizedRole === 'hrd') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Hanya admin & HRD yang dapat mengelola gaji' };
  }

  canManageOrganization(userRole: UserRole | string | null): PermissionCheck {
    const normalizedRole = normalizeRole(userRole);

    if (!normalizedRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (normalizedRole === 'admin') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Hanya admin yang dapat mengelola organisasi' };
  }

  getAvailableRoles(): Record<UserRole, string> {
    return {
      admin: 'Administrator - Akses penuh ke semua fitur',
      hrd: 'HR Department - Mengelola karyawan, payroll, dan approval',
      kepala_ruangan: 'Unit Leader - Mengelola presensi dan approval unit',
      karyawan: 'Karyawan - Self-service untuk profil dan request',
    };
  }
}

export const rbacService = new RBACService();
export default rbacService;

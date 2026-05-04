/**
 * RBAC SERVICE
 * Role-Based Access Control utilities & permission checking
 * Single source of truth for authorization logic
 */

import { dataSupabase } from './dataSupabaseClient';

export interface RBACUser {
  id: string;
  email: string;
  role: string;
  employeeId?: string;
  unitId?: string;
}

export type UserRole = 'admin' | 'hrd' | 'kepala_ruangan' | 'karyawan';

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * ROLE DEFINITIONS & PERMISSIONS
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'read:all_employees',
    'create:employee',
    'update:employee',
    'delete:employee',
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
    'read:payroll',
    'create:payroll',
    'update:payroll',
    'delete:payroll',
    'manage:organization',
    'manage:system_settings',
    'manage:roles',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  
  hrd: [
    'read:all_employees',
    'create:employee',
    'update:employee',
    'read:all_attendance',
    'update:attendance',
    'approve:requests',
    'reject:requests',
    'read:all_requests',
    'read:all_documents',
    'upload:document',
    'read:payroll',
    'create:payroll',
    'update:payroll',
    'view:audit_logs',
    'export:data',
    'import:data',
  ],
  
  kepala_ruangan: [
    'read:unit_employees',
    'read:unit_attendance',
    'update:unit_attendance',
    'approve:unit_requests',
    'reject:unit_requests',
    'read:unit_requests',
  ],
  
  karyawan: [
    'read:own_profile',
    'update:own_profile',
    'read:own_attendance',
    'create:own_request',
    'read:own_requests',
  ],
};

class RBACService {
  /**
   * Get user's role from session
   */
  async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await dataSupabase
        .from('employees')
        .select('role, id, "unitKerjaId"')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching user role:', error?.message);
        return null;
      }

      return (data.role?.toLowerCase() || 'karyawan') as UserRole;
    } catch (error: any) {
      console.error('❌ Error in getUserRole:', error.message);
      return null;
    }
  }

  /**
   * Get complete RBAC user context
   */
  async getUserContext(userId: string): Promise<RBACUser | null> {
    try {
      const { data, error } = await dataSupabase
        .from('employees')
        .select('id, "user_id", email, role, "unitKerjaId"')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: userId,
        email: data.email,
        role: (data.role?.toLowerCase() || 'karyawan') as UserRole,
        employeeId: data.id,
        unitId: data.unitKerjaId,
      };
    } catch (error: any) {
      console.error('❌ Error fetching user context:', error.message);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(role: UserRole | null, permission: string): boolean {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  }

  /**
   * Check if user can perform action on employee
   */
  canManageEmployee(
    userRole: UserRole | null,
    userUnitId?: string,
    targetEmployeeUnitId?: string
  ): PermissionCheck {
    if (!userRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    // Admin & HRD can manage all employees
    if (userRole === 'admin' || userRole === 'hrd') {
      return { allowed: true };
    }

    // Kepala ruangan can only manage employees in their unit
    if (userRole === 'kepala_ruangan') {
      if (userUnitId && targetEmployeeUnitId && userUnitId === targetEmployeeUnitId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Kepala ruangan dapat hanya mengelola karyawan di unit mereka',
      };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  /**
   * Check if user can view attendance
   */
  canViewAttendance(
    userRole: UserRole | null,
    userEmployeeId?: string,
    targetEmployeeId?: string,
    targetUnitId?: string,
    userUnitId?: string
  ): PermissionCheck {
    if (!userRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    // Admin & HRD can view all attendance
    if (userRole === 'admin' || userRole === 'hrd') {
      return { allowed: true };
    }

    // Kepala ruangan can view unit attendance
    if (userRole === 'kepala_ruangan') {
      if (userUnitId && targetUnitId && userUnitId === targetUnitId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Hanya dapat melihat presensi di unit Anda',
      };
    }

    // Karyawan can only view own attendance
    if (userRole === 'karyawan') {
      if (userEmployeeId === targetEmployeeId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Hanya dapat melihat presensi Anda sendiri' };
    }

    return { allowed: false, reason: 'Insufficient permissions' };
  }

  /**
   * Check if user can approve requests
   */
  canApproveRequest(
    userRole: UserRole | null,
    requestType?: string,
    userUnitId?: string,
    targetUnitId?: string
  ): PermissionCheck {
    if (!userRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    // Admin & HRD can approve all requests
    if (userRole === 'admin' || userRole === 'hrd') {
      return { allowed: true };
    }

    // Kepala ruangan can approve requests from their unit
    if (userRole === 'kepala_ruangan') {
      if (userUnitId && targetUnitId && userUnitId === targetUnitId) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Hanya dapat approve request dari unit Anda',
      };
    }

    return { allowed: false, reason: 'Role Anda tidak memiliki hak approve' };
  }

  /**
   * Check if user can manage payroll
   */
  canManagePayroll(userRole: UserRole | null): PermissionCheck {
    if (!userRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (userRole === 'admin' || userRole === 'hrd') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Hanya admin & HRD yang dapat mengelola gaji' };
  }

  /**
   * Check if user can manage organization
   */
  canManageOrganization(userRole: UserRole | null): PermissionCheck {
    if (!userRole) {
      return { allowed: false, reason: 'User role not found' };
    }

    if (userRole === 'admin') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Hanya admin yang dapat mengelola organisasi' };
  }

  /**
   * Get all available permissions for role
   */
  getRolePermissions(role: UserRole): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get all available roles with descriptions
   */
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

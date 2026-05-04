/**
 * SECURE DATA SERVICE
 * Enhanced DataService with RBAC enforcement
 * Adds authorization checks to all database operations
 * 
 * Usage: Replace DataService calls with SecureDataService where RBAC is needed
 */

import { dataSupabase } from './dataSupabaseClient';
import rbacService, { RBACUser, PermissionCheck } from './rbacService';

export interface SecureDataResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
  authorization?: {
    allowed: boolean;
    reason?: string;
  };
}

class SecureDataService {
  private optionalMissingTables = new Set<string>();

  /**
   * EMPLOYEE OPERATIONS WITH RBAC
   */

  /**
   * Get employees with role-based filtering
   */
  async getEmployeesSecure(userContext: RBACUser | null): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Check permission
      const hasPermission = rbacService.hasPermission(
        userContext.role as any,
        'read:all_employees'
      );

      if (!hasPermission) {
        return {
          success: false,
          error: 'Hanya admin & HRD yang dapat melihat daftar semua karyawan',
          authorization: {
            allowed: false,
            reason: 'Insufficient permissions for read:all_employees',
          },
        };
      }

      // Admin & HRD can fetch all
      const { data, error, count } = await dataSupabase
        .from('employees')
        .select('*', { count: 'exact' })
        .order('nama', { ascending: true });

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      return {
        success: true,
        data,
        count,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * Get single employee with authorization check
   */
  async getEmployeeSecure(
    employeeId: string,
    userContext: RBACUser | null
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Get target employee's unit for authorization check
      const { data: targetEmployee, error: fetchError } = await dataSupabase
        .from('employees')
        .select('id, "unitKerjaId"')
        .eq('id', employeeId)
        .single();

      if (fetchError || !targetEmployee) {
        return {
          success: false,
          error: 'Employee not found',
          authorization: { allowed: false },
        };
      }

      // Check authorization
      const authCheck = rbacService.canManageEmployee(
        userContext.role as any,
        userContext.unitId,
        targetEmployee.unitKerjaId
      );

      if (!authCheck.allowed) {
        return {
          success: false,
          error: authCheck.reason || 'Access denied',
          authorization: authCheck,
        };
      }

      // Fetch employee data
      const { data, error } = await dataSupabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      return {
        success: true,
        data,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * Create employee with authorization
   */
  async createEmployeeSecure(
    employeeData: any,
    userContext: RBACUser | null
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Check role & permission
      const hasPermission =
        rbacService.hasPermission(userContext.role as any, 'create:employee');

      if (!hasPermission) {
        return {
          success: false,
          error: 'Hanya admin & HRD yang dapat membuat karyawan baru',
          authorization: {
            allowed: false,
            reason: 'Insufficient permissions',
          },
        };
      }

      // Create employee
      const { data, error } = await dataSupabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      // Log RBAC action
      console.log(`✅ [RBAC] User ${userContext.email} created employee:`, data.id);

      return {
        success: true,
        data,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * Update employee with authorization
   */
  async updateEmployeeSecure(
    employeeId: string,
    updates: any,
    userContext: RBACUser | null
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Get target employee
      const { data: targetEmployee } = await dataSupabase
        .from('employees')
        .select('id, "unitKerjaId"')
        .eq('id', employeeId)
        .single();

      if (!targetEmployee) {
        return {
          success: false,
          error: 'Employee not found',
          authorization: { allowed: false },
        };
      }

      // Check authorization
      const authCheck = rbacService.canManageEmployee(
        userContext.role as any,
        userContext.unitId,
        targetEmployee.unitKerjaId
      );

      if (!authCheck.allowed) {
        return {
          success: false,
          error: authCheck.reason || 'Access denied',
          authorization: authCheck,
        };
      }

      // Check permission
      const hasPermission = rbacService.hasPermission(
        userContext.role as any,
        'update:employee'
      );

      if (!hasPermission) {
        return {
          success: false,
          error: 'Tidak memiliki hak untuk mengubah data karyawan',
          authorization: {
            allowed: false,
            reason: 'Insufficient permissions',
          },
        };
      }

      // Update employee
      const { data, error } = await dataSupabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      console.log(`✅ [RBAC] User ${userContext.email} updated employee:`, employeeId);

      return {
        success: true,
        data,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * Delete employee (admin only)
   */
  async deleteEmployeeSecure(
    employeeId: string,
    userContext: RBACUser | null
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Check role
      if (userContext.role !== 'admin') {
        return {
          success: false,
          error: 'Hanya admin yang dapat menghapus karyawan',
          authorization: {
            allowed: false,
            reason: 'Role admin required',
          },
        };
      }

      // Check permission
      const hasPermission = rbacService.hasPermission(
        userContext.role as any,
        'delete:employee'
      );

      if (!hasPermission) {
        return {
          success: false,
          error: 'Tidak memiliki hak untuk menghapus karyawan',
          authorization: {
            allowed: false,
            reason: 'Permission denied',
          },
        };
      }

      // Delete employee
      const { error } = await dataSupabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      console.log(`✅ [RBAC] User ${userContext.email} deleted employee:`, employeeId);

      return {
        success: true,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * ATTENDANCE OPERATIONS WITH RBAC
   */

  /**
   * Get attendance records with role-based filtering
   */
  async getAttendanceSecure(
    userContext: RBACUser | null,
    filters?: { employeeId?: string; dateFrom?: string; dateTo?: string }
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      let query = dataSupabase.from('attendance').select('*');

      // Apply role-based filtering
      if (userContext.role === 'karyawan') {
        // Karyawan can only see own attendance
        query = query.eq('employeeId', userContext.employeeId);
      } else if (userContext.role === 'kepala_ruangan') {
        // Kepala ruangan can see unit attendance
        const { data: unitEmployees } = await dataSupabase
          .from('employees')
          .select('id')
          .eq('unitKerjaId', userContext.unitId);

        const employeeIds = unitEmployees?.map((e) => e.id) || [];
        query = query.in('employeeId', employeeIds);
      }
      // Admin & HRD see all (no filter)

      // Apply additional filters
      if (filters?.employeeId && ['admin', 'hrd'].includes(userContext.role)) {
        query = query.eq('employeeId', filters.employeeId);
      }

      const { data, error, count } = await query
        .order('tanggal', { ascending: false })
        .limit(100);

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      return {
        success: true,
        data,
        count,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }

  /**
   * REQUEST/APPROVAL OPERATIONS WITH RBAC
   */

  /**
   * Approve request with authorization
   */
  async approveRequestSecure(
    requestId: string,
    userContext: RBACUser | null
  ): Promise<SecureDataResponse> {
    try {
      if (!userContext) {
        return {
          success: false,
          error: 'User context not found',
          authorization: { allowed: false },
        };
      }

      // Get request
      const { data: request } = await dataSupabase
        .from('requests')
        .select('id, employeeId')
        .eq('id', requestId)
        .single();

      if (!request) {
        return {
          success: false,
          error: 'Request not found',
          authorization: { allowed: false },
        };
      }

      // Get target employee's unit
      const { data: targetEmployee } = await dataSupabase
        .from('employees')
        .select('"unitKerjaId"')
        .eq('id', request.employeeId)
        .single();

      // Check approval permission
      const authCheck = rbacService.canApproveRequest(
        userContext.role as any,
        undefined,
        userContext.unitId,
        targetEmployee?.unitKerjaId
      );

      if (!authCheck.allowed) {
        return {
          success: false,
          error: authCheck.reason || 'Access denied',
          authorization: authCheck,
        };
      }

      // Approve request
      const { data, error } = await dataSupabase
        .from('requests')
        .update({
          status: 'Approved',
          approvedBy: userContext.employeeId,
          approvedAt: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          authorization: { allowed: true },
        };
      }

      console.log(`✅ [RBAC] User ${userContext.email} approved request:`, requestId);

      return {
        success: true,
        data,
        authorization: { allowed: true },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        authorization: { allowed: false },
      };
    }
  }
}

export const secureDataService = new SecureDataService();
export default secureDataService;

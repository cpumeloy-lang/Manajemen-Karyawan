/**
 * DATA SERVICE
 * Abstraction layer for operational data access
 * Encapsulates all interactions with Local Supabase Data
 * Single source of truth for CRUD operations on business entities
 */

import { dataSupabase } from './dataSupabaseClient';

export interface DataResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

class DataService {
  private optionalMissingTables = new Set<string>();

  private isMissingTableError(message?: string): boolean {
    const normalized = (message || '').toLowerCase();
    return (
      normalized.includes('could not find the table') ||
      normalized.includes('does not exist') ||
      normalized.includes('relation')
    );
  }

  private sortByDisplayName<T extends Record<string, any>>(rows: T[] = []): T[] {
    return [...rows].sort((a, b) => {
      const aName = String(a.name ?? a.nama ?? '').toLowerCase();
      const bName = String(b.name ?? b.nama ?? '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  /**
   * Get all employees
   */
  async getEmployees(): Promise<DataResponse> {
    try {
      const { data, error, count } = await dataSupabase
        .from('employees')
        .select('*', { count: 'exact' })
        .order('nama', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id: string): Promise<DataResponse> {
    try {
      const { data, error } = await dataSupabase
        .from('employees')
        .select('*')
        .eq('user_id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all work units
   */
  async getWorkUnits(): Promise<DataResponse> {
    try {
      const { data, error, count } = await dataSupabase
        .from('units')
        .select('*', { count: 'exact' });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: this.sortByDisplayName(data || []), count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<DataResponse> {
    if (this.optionalMissingTables.has('departments')) {
      return { success: true, data: [], count: 0 };
    }

    try {
      const { data, error, count } = await dataSupabase
        .from('departments')
        .select('*', { count: 'exact' });

      if (error) {
        if (this.isMissingTableError(error.message)) {
          this.optionalMissingTables.add('departments');
          return { success: true, data: [], count: 0 };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data: this.sortByDisplayName(data || []), count };
    } catch (error: any) {
      if (this.isMissingTableError(error.message)) {
        this.optionalMissingTables.add('departments');
        return { success: true, data: [], count: 0 };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all positions
   */
  async getPositions(): Promise<DataResponse> {
    if (this.optionalMissingTables.has('positions')) {
      return { success: true, data: [], count: 0 };
    }

    try {
      const { data, error, count } = await dataSupabase
        .from('positions')
        .select('*', { count: 'exact' });

      if (error) {
        if (this.isMissingTableError(error.message)) {
          this.optionalMissingTables.add('positions');
          return { success: true, data: [], count: 0 };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data: this.sortByDisplayName(data || []), count };
    } catch (error: any) {
      if (this.isMissingTableError(error.message)) {
        this.optionalMissingTables.add('positions');
        return { success: true, data: [], count: 0 };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get system settings (optional table in older schema)
   */
  async getSystemSettings(): Promise<DataResponse> {
    if (this.optionalMissingTables.has('system_settings')) {
      return { success: true, data: [], count: 0 };
    }

    try {
      const { data, error, count } = await dataSupabase
        .from('system_settings')
        .select('*', { count: 'exact' });

      if (error) {
        if (this.isMissingTableError(error.message)) {
          this.optionalMissingTables.add('system_settings');
          return { success: true, data: [], count: 0 };
        }
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (error: any) {
      if (this.isMissingTableError(error.message)) {
        this.optionalMissingTables.add('system_settings');
        return { success: true, data: [], count: 0 };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get attendance records
   */
  async getAttendance(filters?: Record<string, any>): Promise<DataResponse> {
    try {
      const runQuery = async (isSnakeCase: boolean) => {
        let query = dataSupabase.from('attendance').select('*');

        if (filters?.employeeId) {
          query = query.eq(isSnakeCase ? 'employee_id' : 'employeeId', filters.employeeId);
        }

        if (filters?.startDate && filters?.endDate) {
          query = query
            .gte(isSnakeCase ? 'date' : 'tanggal', filters.startDate)
            .lte(isSnakeCase ? 'date' : 'tanggal', filters.endDate);
        }

        return query.order(isSnakeCase ? 'date' : 'tanggal', { ascending: false });
      };

      let { data, error, count } = await runQuery(false);

      if (error) {
        const fallback = await runQuery(true);
        data = fallback.data;
        count = fallback.count;
        error = fallback.error;
      }

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all requests (leave, permission, overtime)
   */
  async getRequests(filters?: Record<string, any>): Promise<DataResponse> {
    try {
      let query = dataSupabase.from('requests').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get documents
   */
  async getDocuments(filters?: Record<string, any>): Promise<DataResponse> {
    try {
      let query = dataSupabase.from('documents').select('*');

      if (filters?.employeeId) {
        query = query.eq('employeeId', filters.employeeId);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error, count } = await query.order('uploadedAt', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data, count };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generic insert
   */
  async insert(table: string, data: any): Promise<DataResponse> {
    try {
      const { data: result, error } = await dataSupabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generic update
   */
  async update(table: string, id: string, data: any): Promise<DataResponse> {
    try {
      const { data: result, error } = await dataSupabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generic delete
   */
  async delete(table: string, id: string): Promise<DataResponse> {
    try {
      const { error } = await dataSupabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Raw query for complex operations
   */
  async query(table: string, queryBuilder?: (q: any) => any): Promise<DataResponse> {
    try {
      let query = dataSupabase.from(table).select('*');

      if (queryBuilder) {
        query = queryBuilder(query);
      }

      const { data, error } = await query;

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const dataService = new DataService();

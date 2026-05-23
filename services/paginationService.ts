/**
 * PAGINATION SERVICE
 * 
 * Handle paginated data fetching from Supabase
 * Prevents loading all records at once, enables infinite scroll and table pagination
 * 
 * Features:
 * - Flexible page size
 * - Search/filter support
 * - Sort support (asc/desc)
 * - Total count for pagination UI
 * - Type-safe with generics
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  search?: string;
  searchColumns?: string[]; // [SV-M4] Define explicit columns to search
  filters?: Record<string, any>;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CacheEntry<T> {
  data: PaginationResult<T>;
  timestamp: number;
}

// ============================================================================
// PAGINATION SERVICE
// ============================================================================

class PaginationService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch paginated employees
   */
  async fetchEmployeesPaginated(
    supabase: SupabaseClient,
    params: PaginationParams
  ): Promise<PaginationResult<any>> {
    const { page, pageSize, sortBy = 'nama', sortOrder = 'asc', search } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('employees')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.ilike('nama', `%${search}%`);
      }

      // Get paginated data and total count in a single query
      const { data, count, error: dataError } = await query
        .range(from, to)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (dataError) throw dataError;

      return this.buildResult(data || [], count || 0, page, pageSize);
    } catch (error: any) {
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }
  }

  /**
   * Fetch paginated attendance records
   */
  async fetchAttendancePaginated(
    supabase: SupabaseClient,
    params: PaginationParams & { employeeId?: string; dateFrom?: string; dateTo?: string }
  ): Promise<PaginationResult<any>> {
    const { page, pageSize, sortBy = 'tanggal', sortOrder = 'desc', employeeId, dateFrom, dateTo } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('attendance')
        .select('*', { count: 'exact' });

      // Filter by employee
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      // Filter by date range
      if (dateFrom) {
        query = query.gte('tanggal', dateFrom);
      }
      if (dateTo) {
        query = query.lte('tanggal', dateTo);
      }

      // Get total count
      const { count, error: countError } = await query;
      if (countError) throw countError;

      // Get paginated data
      const { data, error: dataError } = await query
        .range(from, to)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (dataError) throw dataError;

      return this.buildResult(data || [], count || 0, page, pageSize);
    } catch (error: any) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  }

  /**
   * Fetch paginated leave requests
   */
  async fetchLeaveRequestsPaginated(
    supabase: SupabaseClient,
    params: PaginationParams & { employeeId?: string; status?: string }
  ): Promise<PaginationResult<any>> {
    const { page, pageSize, sortBy = 'created_at', sortOrder = 'desc', employeeId, status } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from('leave_requests')
        .select('*', { count: 'exact' });

      // Filter by employee
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      // Filter by status
      if (status) {
        query = query.eq('status', status);
      }

      // Get total count
      const { count, error: countError } = await query;
      if (countError) throw countError;

      // Get paginated data
      const { data, error: dataError } = await query
        .range(from, to)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (dataError) throw dataError;

      return this.buildResult(data || [], count || 0, page, pageSize);
    } catch (error: any) {
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }
  }

  /**
   * Generic paginated fetch for any table
   */
  async fetchPaginated<T>(
    supabase: SupabaseClient,
    tableName: string,
    params: PaginationParams
  ): Promise<PaginationResult<T>> {
    const { page, pageSize, sortBy = 'created_at', sortOrder = 'desc', search, filters } = params;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      // [SV-M4] Apply search on specified search columns rather than assuming sortBy is searchable
      if (search) {
        if (params.searchColumns && params.searchColumns.length > 0) {
          const orQuery = params.searchColumns.map(col => `${col}.ilike.%${search}%`).join(',');
          query = query.or(orQuery);
        } else if (params.sortBy && !['created_at', 'tanggal', 'uploadedAt', 'id'].includes(params.sortBy)) {
          // Legacy fallback: if no searchColumns provided, try to search on sortBy if it seems like a string column
          query = query.ilike(params.sortBy, `%${search}%`);
        }
      }

      // Get total count
      const { count, error: countError } = await query;
      if (countError) throw countError;

      // Get paginated data
      const { data, error: dataError } = await query
        .range(from, to)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (dataError) throw dataError;

      return this.buildResult(data as T[], count || 0, page, pageSize);
    } catch (error: any) {
      throw new Error(`Failed to fetch paginated data from ${tableName}: ${error.message}`);
    }
  }

  // ========================================================================
  // CACHE HELPERS
  // ========================================================================

  private getCacheKey(tableName: string, params: PaginationParams): string {
    return `${tableName}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached result if valid
   */
  getCached<T>(tableName: string, params: PaginationParams): PaginationResult<T> | null {
    const key = this.getCacheKey(tableName, params);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Cache result
   */
  setCached<T>(tableName: string, params: PaginationParams, result: PaginationResult<T>): void {
    const key = this.getCacheKey(tableName, params);
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a table
   */
  clearTableCache(tableName: string): void {
    Array.from(this.cache.keys())
      .filter(key => key.startsWith(tableName))
      .forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private buildResult<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Calculate offset from page and size
   */
  calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * Get valid page number
   */
  validatePage(page: number, totalPages: number): number {
    if (page < 1) return 1;
    if (page > totalPages) return totalPages;
    return page;
  }

  /**
   * Get valid page size (min 5, max 200)
   */
  validatePageSize(size: number): number {
    if (size < 5) return 5;
    if (size > 200) return 200;
    return size;
  }
}

// Export singleton instance
export const paginationService = new PaginationService();

// ============================================================================
// RECOMMENDED PAGE SIZES
// ============================================================================

export const RECOMMENDED_PAGE_SIZES = {
  SMALL: 10,      // Mobile, limited space
  MEDIUM: 20,     // Default for most tables
  LARGE: 50,      // Large lists
  EXTRA_LARGE: 100 // Very large lists
} as const;

// ============================================================================
// EXAMPLES
// ============================================================================

/*
// Example 1: Fetch employees with pagination
const result = await paginationService.fetchEmployeesPaginated(supabase, {
  page: 1,
  pageSize: 20,
  sortBy: 'nama',
  sortOrder: 'asc',
  search: 'Budi'
});

console.log(`Showing ${result.data.length} of ${result.total} employees`);
console.log(`Page ${result.page} of ${result.totalPages}`);

// Example 2: Fetch attendance records for a specific employee
const attendance = await paginationService.fetchAttendancePaginated(supabase, {
  page: 1,
  pageSize: 30,
  employeeId: 'emp-123',
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31'
});

// Example 3: Use caching
const cached = paginationService.getCached('employees', params);
if (cached) {
  return cached; // Use cached data
}

const result = await paginationService.fetchEmployeesPaginated(supabase, params);
paginationService.setCached('employees', params, result); // Cache for next time

// Example 4: Validate pagination inputs
const validPage = paginationService.validatePage(requestPage, totalPages);
const validSize = paginationService.validatePageSize(requestPageSize);
*/

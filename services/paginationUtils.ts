// ===========================================
// PAGINATION UTILITIES - OPTIMIZED FOR PRODUCTION
// With Redis Caching Layer - Phase 2
// ===========================================

import { getCache } from './redisCache';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EmployeeFilters {
  role?: string;
  unitId?: string;
  status?: 'active' | 'inactive';
  search?: string;
}

export interface AttendanceFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

// ===========================================
// PAGINATION HELPER FUNCTIONS
// ===========================================

export const createPaginationParams = (options: PaginationOptions = {}) => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  const offset = (page - 1) * limit;

  return {
    limit,
    offset,
    page,
    sortBy,
    sortOrder
  };
};

export const calculatePaginationMeta = (
  total: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// ===========================================
// OPTIMIZED QUERY FUNCTIONS
// ===========================================

import { supabase } from './supabaseClient';

// Optimized employee queries with pagination & Redis caching
export const getEmployeesPaginated = async (
  options: PaginationOptions = {},
  filters: EmployeeFilters = {}
): Promise<PaginatedResponse<any>> => {
  const { limit, offset, page, sortBy, sortOrder } = createPaginationParams(options);
  const { role, unitId, status = 'active', search } = filters;

  // Generate cache key
  const cacheKey = `employees:${page}:${limit}:${sortBy}:${sortOrder}:${role || 'all'}:${unitId || 'all'}:${status}:${search || 'none'}`;

  try {
    // Try to get from Redis cache first
    const cache = getCache();
    const cachedResult = await cache.getEmployeesPage(page, limit, { role, unitId, status, search });
    if (cachedResult) {
      console.log('✅ Employees data served from Redis cache');
      return cachedResult;
    }
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable, falling back to database:', cacheError);
  }

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .range(offset, offset + limit - 1)
    .order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply filters
  if (role) {
    query = query.eq('role', role);
  }

  if (unitId) {
    query = query.eq('unitKerjaId', unitId);
  }

  if (search) {
    query = query.or(`nama.ilike.%${search}%,nik.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching paginated employees:', error);
    throw error;
  }

  const pagination = calculatePaginationMeta(count || 0, page, limit);
  const result = {
    data: data || [],
    pagination
  };

  // Cache the result asynchronously (don't await)
  try {
    const cache = getCache();
    cache.setEmployeesPage(page, limit, { role, unitId, status, search }, result)
      .catch(cacheError => console.warn('⚠️ Failed to cache employees data:', cacheError));
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable for storing:', cacheError);
  }

  return result;
};

// Optimized attendance queries with pagination & Redis caching
export const getAttendancePaginated = async (
  options: PaginationOptions = {},
  filters: AttendanceFilters = {}
): Promise<PaginatedResponse<any>> => {
  const { limit, offset, page, sortBy, sortOrder } = createPaginationParams(options);
  const { employeeId, startDate, endDate, status } = filters;

  // Generate cache key
  const cacheKey = `attendance:${employeeId || 'all'}:${page}:${limit}:${startDate || 'none'}:${endDate || 'none'}:${status || 'all'}`;

  try {
    // Try to get from Redis cache first
    const cache = getCache();
    const cachedResult = await cache.getAttendancePage(employeeId || 'all', page, limit);
    if (cachedResult) {
      console.log('✅ Attendance data served from Redis cache');
      return cachedResult;
    }
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable, falling back to database:', cacheError);
  }

  let query = supabase
    .from('attendance')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order(sortBy || 'tanggal', { ascending: sortOrder === 'asc' });

  // Apply filters
  if (employeeId) {
    query = query.eq('employeeId', employeeId);
  }

  if (startDate) {
    query = query.gte('tanggal', startDate);
  }

  if (endDate) {
    query = query.lte('tanggal', endDate);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching paginated attendance:', error);
    throw error;
  }

  const pagination = calculatePaginationMeta(count || 0, page, limit);
  const result = {
    data: data || [],
    pagination
  };

  // Cache the result asynchronously (don't await)
  try {
    const cache = getCache();
    cache.setAttendancePage(employeeId || 'all', page, limit, result)
      .catch(cacheError => console.warn('⚠️ Failed to cache attendance data:', cacheError));
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable for storing:', cacheError);
  }

  return result;
};

// ===========================================
// DASHBOARD OPTIMIZATION FUNCTIONS
// ===========================================

export const getDashboardStats = async (unitId?: string) => {
  // Try Redis cache first
  try {
    const cache = getCache();
    const cachedStats = await cache.getDashboardStats(unitId);
    if (cachedStats) {
      console.log('✅ Dashboard stats served from Redis cache');
      return cachedStats;
    }
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable for dashboard stats:', cacheError);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  // Optimized: Single query with aggregations instead of multiple queries
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', {
      p_unit_id: unitId || null,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0]
    });

  let stats;
  if (error) {
    console.error('Error fetching dashboard stats:', error);
    // Fallback to individual queries if RPC fails
    stats = await getDashboardStatsFallback(unitId);
  } else {
    stats = data;
  }

  // Cache the result asynchronously (don't await)
  try {
    const cache = getCache();
    cache.setDashboardStats(unitId, stats)
      .catch(cacheError => console.warn('⚠️ Failed to cache dashboard stats:', cacheError));
  } catch (cacheError) {
    console.warn('⚠️ Redis cache unavailable for storing dashboard stats:', cacheError);
  }

  return stats;
};

// Fallback function for dashboard stats
const getDashboardStatsFallback = async (unitId?: string) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Get all required data in parallel with optimized queries
  const [employeesResult, attendanceResult, requestsResult] = await Promise.all([
    supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('status', 'Aktif')
      .eq(unitId ? 'unitKerjaId' : '', unitId || ''),

    supabase
      .from('attendance')
      .select('employeeId', { count: 'exact' })
      .eq('tanggal', new Date().toISOString().split('T')[0])
      .in('status', ['Hadir', 'Terlambat']),

    supabase
      .from('requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending')
  ]);

  if (employeesResult.error || attendanceResult.error || requestsResult.error) {
    console.error('Error in fallback dashboard stats');
    return {
      total_employees: 0,
      present_today: 0,
      pending_requests: 0,
      attendance_rate: 0
    };
  }

  // Calculate attendance rate
  const totalAttendanceRecords = await supabase
    .from('attendance')
    .select('id', { count: 'exact' })
    .gte('tanggal', startDate.toISOString().split('T')[0]);

  const presentRecords = await supabase
    .from('attendance')
    .select('id', { count: 'exact' })
    .gte('tanggal', startDate.toISOString().split('T')[0])
    .in('status', ['Hadir', 'Terlambat']);

  const attendanceRate = totalAttendanceRecords.count && presentRecords.count
    ? (presentRecords.count / totalAttendanceRecords.count) * 100
    : 0;

  return {
    total_employees: employeesResult.count || 0,
    present_today: attendanceResult.count || 0,
    pending_requests: requestsResult.count || 0,
    attendance_rate: Math.round(attendanceRate * 100) / 100
  };
};

// ===========================================
// REDIS CACHING UTILITIES (REPLACES OLD CLIENT-SIDE CACHE)
// ===========================================

// Legacy client-side cache for backward compatibility
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

// Redis-backed cached version of dashboard stats (preferred)
export const getCachedDashboardStats = async (unitId?: string) => {
  // This now uses Redis cache internally via getDashboardStats
  return await getDashboardStats(unitId);
};
};

// ===========================================
// HOOKS FOR REACT COMPONENTS
// ===========================================

import { useState, useEffect, useCallback } from 'react';

export const usePaginatedData = <T,>(
  fetchFunction: (options: PaginationOptions, filters?: any) => Promise<PaginatedResponse<T>>,
  initialOptions: PaginationOptions = {},
  initialFilters: any = {}
) => {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<T>['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (
    options: PaginationOptions = initialOptions,
    filters: any = initialFilters
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(options, filters);
      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching paginated data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, initialOptions, initialFilters]);

  useEffect(() => {
    fetchData();
  }, []);

  const loadPage = useCallback((page: number) => {
    fetchData({ ...initialOptions, page }, initialFilters);
  }, [fetchData, initialOptions, initialFilters]);

  const updateFilters = useCallback((newFilters: any) => {
    fetchData({ ...initialOptions, page: 1 }, newFilters);
  }, [fetchData, initialOptions]);

  return {
    data,
    pagination,
    loading,
    error,
    loadPage,
    updateFilters,
    refetch: () => fetchData(initialOptions, initialFilters)
  };
};

// ===========================================
// USAGE EXAMPLES:
// ===========================================
/*
import { getEmployeesPaginated, usePaginatedData } from './paginationUtils';

// In a component:
const {
  data: employees,
  pagination,
  loading,
  loadPage,
  updateFilters
} = usePaginatedData(getEmployeesPaginated, { limit: 20 }, { role: 'karyawan' });

// Manual usage:
const result = await getEmployeesPaginated(
  { page: 1, limit: 20 },
  { role: 'karyawan', status: 'active' }
);
console.log(result.data, result.pagination);
*/
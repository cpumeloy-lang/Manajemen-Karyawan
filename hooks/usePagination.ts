/**
 * PAGINATION HOOK - ENHANCED
 * Custom React hook for handling paginated data with caching and retry support
 */

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { paginationService, PaginationParams, RECOMMENDED_PAGE_SIZES } from '../services/paginationService';
import { classifyError } from '../services/errorHandlingService';
import { useMessageHandlers } from './useMessageHandlers';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  error: any | null;
}

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
  enableCache?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generic pagination hook for any table
 * 
 * @example
 * const { data, pagination, goToPage, nextPage, prevPage } = usePagination('employees', {
 *   pageSize: 20,
 *   sortBy: 'nama'
 * });
 */
export const usePagination = <T,>(
  table: string,
  options: UsePaginationOptions = {}
) => {
  const {
    initialPage = 1,
    pageSize: initialPageSize = RECOMMENDED_PAGE_SIZES.MEDIUM,
    enableCache = true,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 0,
    loading: false,
    hasNext: false,
    hasPrev: false,
    error: null
  });

  const { showError } = useMessageHandlers();

  const fetchPage = useCallback(
    async (page: number, pageSize: number = initialPageSize) => {
      try {
        setPagination((prev) => ({ ...prev, loading: true, error: null }));

        const params: PaginationParams = {
          page,
          pageSize,
          sortBy,
          sortOrder: sortOrder as 'asc' | 'desc'
        };

        // Try cache first
        if (enableCache) {
          const cached = paginationService.getCached<T>(table, params);
          if (cached) {
            setData(cached.data);
            setPagination({
              page: cached.page,
              pageSize: cached.pageSize,
              total: cached.total,
              totalPages: cached.totalPages,
              loading: false,
              hasNext: cached.hasNextPage,
              hasPrev: cached.hasPreviousPage,
              error: null
            });
            return;
          }
        }

        // Fetch from server
        const result = await paginationService.fetchPaginated<T>(supabase, table, params);

        // Cache result
        if (enableCache) {
          paginationService.setCached(table, params, result);
        }

        setData(result.data);
        setPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
          loading: false,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPreviousPage,
          error: null
        });
      } catch (error: any) {
        const appError = classifyError(error);
        setPagination((prev) => ({ ...prev, loading: false, error: appError }));
        showError?.(appError.userMessage);
      }
    },
    [table, initialPageSize, sortBy, sortOrder, enableCache, showError]
  );

  const goToPage = useCallback(
    (page: number) => {
      const validPage = paginationService.validatePage(page, pagination.totalPages || 1);
      fetchPage(validPage);
    },
    [pagination.totalPages, fetchPage]
  );

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.hasPrev, pagination.page, goToPage]);

  const refresh = useCallback(() => {
    paginationService.clearTableCache(table);
    fetchPage(pagination.page);
  }, [pagination.page, table, fetchPage]);

  const setPageSize = useCallback((newSize: number) => {
    const validSize = paginationService.validatePageSize(newSize);
    paginationService.clearTableCache(table);
    fetchPage(1, validSize);
  }, [table, fetchPage]);

  // Initial load
  useEffect(() => {
    fetchPage(initialPage, initialPageSize);
  }, []); // Only on mount

  return {
    data,
    pagination,
    fetchPage,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    setPageSize
  };
};

import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useMessageHandlers } from './useMessageHandlers';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export const usePagination = <T,>(
  table: string,
  options: UsePaginationOptions = {}
) => {
  const { initialPage = 1, pageSize = 20 } = options;
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize,
    total: 0,
    totalPages: 0,
    loading: false,
    hasNext: false,
    hasPrev: false,
  });

  const { showError } = useMessageHandlers();

  const fetchPage = useCallback(
    async (page: number, filters?: Record<string, any>) => {
      try {
        setPagination((prev) => ({ ...prev, loading: true }));

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Build query with optional filters
        let query = supabase.from(table).select('*', { count: 'exact' });

        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              query = query.eq(key, value);
            }
          });
        }

        const { data: pageData, count, error } = await query
          .range(from, to)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);

        setData(pageData || []);
        setPagination({
          page,
          pageSize,
          total,
          totalPages,
          loading: false,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        });
      } catch (error: any) {
        showError('Gagal memuat data', error);
        setPagination((prev) => ({ ...prev, loading: false }));
      }
    },
    [table, pageSize, showError]
  );

  const goToPage = useCallback(
    (page: number, filters?: Record<string, any>) => {
      if (page >= 1 && page <= pagination.totalPages) {
        fetchPage(page, filters);
      }
    },
    [pagination.totalPages, fetchPage]
  );

  const nextPage = useCallback(
    (filters?: Record<string, any>) => {
      if (pagination.hasNext) {
        goToPage(pagination.page + 1, filters);
      }
    },
    [pagination.hasNext, pagination.page, goToPage]
  );

  const prevPage = useCallback(
    (filters?: Record<string, any>) => {
      if (pagination.hasPrev) {
        goToPage(pagination.page - 1, filters);
      }
    },
    [pagination.hasPrev, pagination.page, goToPage]
  );

  // Initial load
  useEffect(() => {
    fetchPage(initialPage);
  }, [initialPage, fetchPage]);

  return {
    data,
    pagination,
    fetchPage,
    goToPage,
    nextPage,
    prevPage,
  };
};

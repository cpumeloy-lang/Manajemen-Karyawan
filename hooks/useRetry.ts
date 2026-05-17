/**
 * RETRY HOOK
 * Custom hook untuk handle retry logic dalam async operations
 */

import { useState, useCallback, useRef } from 'react';
import { AppError, classifyError, RetryOptions, withRetry } from '../services/errorHandlingService';

export interface UseRetryState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  retrying: boolean;
  retryCount: number;
  successCount: number;
}

export interface UseRetryActions<T> {
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  clearError: () => void;
}

/**
 * Hook for async operations with built-in retry logic
 * 
 * @example
 * const { data, error, loading, execute, retry } = useRetry<Employee[]>();
 * 
 * const loadEmployees = async () => {
 *   await execute(
 *     () => supabase.from('employees').select('*'),
 *     { maxRetries: 3 }
 *   );
 * };
 */
export function useRetry<T = any>(
  defaultRetryOptions?: RetryOptions
): UseRetryState<T> & UseRetryActions<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  // Store the last function to retry
  const lastFnRef = useRef<(() => Promise<T>) | null>(null);

  const execute = useCallback(
    async (fn: () => Promise<T>, options?: RetryOptions): Promise<T | null> => {
      lastFnRef.current = fn;
      setLoading(true);
      setError(null);

      try {
        const result = await withRetry(fn, {
          ...defaultRetryOptions,
          ...options
        });

        setData(result);
        setSuccessCount(prev => prev + 1);
        setRetryCount(0);

        return result;
      } catch (err: any) {
        const appError = classifyError(err);
        setError(appError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultRetryOptions]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastFnRef.current) {
      return null;
    }

    setRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await withRetry(lastFnRef.current, {
        ...defaultRetryOptions,
        maxRetries: 2
      });

      setData(result);
      setError(null);
      setSuccessCount(prev => prev + 1);

      return result;
    } catch (err: any) {
      const appError = classifyError(err);
      setError(appError);
      return null;
    } finally {
      setRetrying(false);
    }
  }, [defaultRetryOptions]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setRetrying(false);
    setRetryCount(0);
    setSuccessCount(0);
    lastFnRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    data,
    loading,
    error,
    retrying,
    retryCount,
    successCount,
    // Actions
    execute,
    retry,
    reset,
    clearError
  };
}

/**
 * Hook for form submissions with retry capability
 * 
 * @example
 * const { submit, loading, error, retry } = useRetrySubmit();
 * 
 * const handleSubmit = async (formData) => {
 *   await submit(async () => {
 *     return await supabase.from('employees').insert(formData);
 *   });
 * };
 */
export function useRetrySubmit<T = any>(
  onSuccess?: (data: T) => void,
  onError?: (error: AppError) => void,
  retryOptions?: RetryOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const lastFnRef = useRef<(() => Promise<T>) | null>(null);

  const submit = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      lastFnRef.current = fn;
      setLoading(true);
      setError(null);

      try {
        const result = await withRetry(fn, {
          maxRetries: 3,
          ...retryOptions
        });

        setData(result);
        setRetryCount(0);
        onSuccess?.(result);

        return result;
      } catch (err: any) {
        const appError = classifyError(err);
        setError(appError);
        onError?.(appError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError, retryOptions]
  );

  const retry = useCallback(async (): Promise<T | null> => {
    if (!lastFnRef.current) return null;

    setLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      const result = await withRetry(lastFnRef.current, {
        maxRetries: 2,
        ...retryOptions
      });

      setData(result);
      setError(null);
      onSuccess?.(result);

      return result;
    } catch (err: any) {
      const appError = classifyError(err);
      setError(appError);
      onError?.(appError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, retryOptions]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submit,
    retry,
    loading,
    error,
    data,
    retryCount,
    clearError
  };
}

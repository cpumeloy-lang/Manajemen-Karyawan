import { useCallback } from 'react';
import { useAppErrorActions, useUIActions, useUI } from '../stores/appStore';

export const useMessageHandlers = () => {
  const { setError: setAppError } = useAppErrorActions();
  const { setSuccessMessage } = useUIActions();
  const { successMessage } = useUI();

  const showSuccess = useCallback((message: string, duration = 3500) => {
    setSuccessMessage(message);
    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, duration);

    return () => window.clearTimeout(timeoutId);
  }, [setSuccessMessage]);

  const showError = useCallback(
    (label: string, err: unknown) => {
      const detail = err instanceof Error ? err.message : String(err);
      const errorMessage = `${label}: ${detail}`;
      setAppError(errorMessage);
      console.error(errorMessage, err);
    },
    [setAppError]
  );

  const clearError = useCallback(() => {
    setAppError(null);
  }, [setAppError]);

  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, [setSuccessMessage]);

  return {
    successMessage,
    showSuccess,
    showError,
    clearError,
    clearSuccess,
  };
};

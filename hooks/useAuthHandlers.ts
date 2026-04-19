import { useCallback } from 'react';
import { authService } from '../services/AuthService';
import { useAuthActions, useUIActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';

/**
 * useAuthHandlers
 * Uses AuthService which connects to local Supabase Auth for authentication only
 * Does NOT access operational data (uses dataService for that)
 */
export const useAuthHandlers = () => {
  const { logout: logoutFromStore } = useAuthActions();
  const { setView } = useUIActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleLogin = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        const result = await authService.login({ email, password });

        if (!result.success) {
          const friendlyMessage = result.error?.includes('Invalid login credentials')
            ? 'Email atau password salah. Silakan coba lagi.'
            : result.error || 'Login gagal';
          showError('Login gagal', friendlyMessage);
          return;
        }

        showSuccess('Login berhasil!');
      } catch (error: any) {
        showError('Terjadi kesalahan saat login', error);
      }
    },
    [showSuccess, showError]
  );

  const handleLogout = useCallback(async () => {
    try {
      const result = await authService.logout();

      if (!result.success) {
        throw new Error(result.error || 'Logout failed');
      }

      // Clear app state
      logoutFromStore();
      setView('dashboard');
      showSuccess('Logout berhasil');
    } catch (error: any) {
      showError('Gagal logout', error);
    }
  }, [logoutFromStore, setView, showSuccess, showError]);

  return {
    handleLogin,
    handleLogout,
  };
};

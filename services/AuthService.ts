/**
 * AUTH SERVICE
 * Abstraction layer for authentication operations
 * Encapsulates all interactions with configured Supabase Auth endpoint
 * Single source of truth for login/logout/session logic
 */

import { authSupabase } from './authSupabaseClient';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

class AuthService {
  /**
   * Login user dengan email dan password
   * @param credentials Email dan password
   * @returns Auth response dengan token atau error
   */
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await authSupabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: data.user
          ? {
              id: data.user.id,
              email: data.user.email || '',
            }
          : undefined,
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<AuthResponse> {
    try {
      const { error } = await authSupabase.auth.signOut({ scope: 'local' });

      if (error) {
        const message = String(error.message || '').toLowerCase();
        // Some local/auth edge-cases may return 403 although local session is already gone.
        if (message.includes('403') || message.includes('forbidden')) {
          return { success: true };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data, error } = await authSupabase.auth.getSession();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        session: data.session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string, redirectUrl?: string): Promise<AuthResponse> {
    try {
      const { error } = await authSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl || `${window.location.origin}/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await authSupabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: any, session: any) => void) {
    return authSupabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

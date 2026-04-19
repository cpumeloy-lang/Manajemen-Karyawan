/**
 * Enhanced Error Handling Service
 * Provides centralized error handling with better error messages
 */

export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  stack?: string;
}

export class AppErrorHandler {
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'INVALID_LOGIN': 'Email atau password salah. Silakan coba lagi.',
    'EMAIL_EXISTS': 'Email sudah terdaftar dalam sistem.',
    'DUPLICATE_NIK': 'NIK sudah terdaftar dalam sistem.',
    'INVALID_EMAIL': 'Format email tidak valid.',
    'PASSWORD_TOO_SHORT': 'Password minimal 8 karakter.',
    'NETWORK_ERROR': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
    'DATABASE_ERROR': 'Terjadi kesalahan pada database. Silakan hubungi administrator.',
    'UNAUTHORIZED': 'Anda tidak memiliki akses untuk melakukan aksi ini.',
    'NOT_FOUND': 'Data tidak ditemukan.',
    'VALIDATION_ERROR': 'Data yang Anda masukkan tidak valid.',
    'SCHEMA_ERROR': 'Database schema tidak sesuai dengan versi aplikasi.',
    'TIMEOUT': 'Permintaan timeout. Silakan coba lagi.',
    'UNKNOWN_ERROR': 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.',
  };

  static parseError(error: any): AppError {
    const timestamp = new Date();

    // Handle Supabase auth errors
    if (error?.status === 400 && error?.message?.includes('Invalid login')) {
      return {
        code: 'INVALID_LOGIN',
        message: this.ERROR_MESSAGES['INVALID_LOGIN'],
        details: error.message,
        timestamp,
      };
    }

    // Handle network errors
    if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: this.ERROR_MESSAGES['NETWORK_ERROR'],
        details: error.message,
        timestamp,
      };
    }

    // Handle database errors
    if (error?.message?.includes('database') || error?.message?.includes('relation')) {
      return {
        code: 'DATABASE_ERROR',
        message: this.ERROR_MESSAGES['DATABASE_ERROR'],
        details: error.message,
        timestamp,
        stack: error.stack,
      };
    }

    // Handle timeout errors
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      return {
        code: 'TIMEOUT',
        message: this.ERROR_MESSAGES['TIMEOUT'],
        details: error.message,
        timestamp,
      };
    }

    // Handle validation errors
    if (error?.code === '23505') {
      // Unique constraint violation
      return {
        code: 'DUPLICATE_NIK',
        message: this.ERROR_MESSAGES['DUPLICATE_NIK'],
        details: error.message,
        timestamp,
      };
    }

    // Default error handling
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || this.ERROR_MESSAGES['UNKNOWN_ERROR'],
      details: error?.message,
      timestamp,
      stack: error?.stack,
    };
  }

  static getFriendlyMessage(error: any): string {
    const appError = this.parseError(error);
    return appError.message;
  }

  static logError(error: AppError): void {
    console.error('[AppError]', {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp.toISOString(),
    });

    // In production, send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error);
    }
  }
}

/**
 * Safe async wrapper with error handling
 */
export const withErrorHandling = async <T,>(
  fn: () => Promise<T>,
  context: string = 'Operation'
): Promise<[T | null, AppError | null]> => {
  try {
    const result = await fn();
    return [result, null];
  } catch (error: any) {
    const appError = AppErrorHandler.parseError(error);
    AppErrorHandler.logError(appError);
    return [null, appError];
  }
};

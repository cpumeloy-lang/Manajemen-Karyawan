/**
 * ERROR HANDLING SERVICE
 * Comprehensive error management with structured error codes, retry logic, and user-friendly messages
 */

// ============================================================================
// ERROR CODES & TYPES
// ============================================================================

export enum ErrorCode {
  // Network & Connection
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',
  
  // Server & API
  SERVER_ERROR = 'SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Authentication
  AUTH_ERROR = 'AUTH_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // File & Upload
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  userMessage?: string;
  retryable?: boolean;
  statusCode?: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export class AppError extends Error {
  code: ErrorCode;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: Error;
  context: Record<string, any>;
  timestamp: Date;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.userMessage = options.userMessage || getDefaultUserMessage(options.code);
    this.retryable = options.retryable ?? isRetryableByDefault(options.code);
    this.statusCode = options.statusCode;
    this.originalError = options.originalError;
    this.context = options.context || {};
    this.timestamp = new Date();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      retryable: this.retryable,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context
    };
  }
}

// ============================================================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================================================

function getDefaultUserMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.NETWORK_ERROR]: 'Koneksi internet terputus. Periksa koneksi Anda dan coba lagi.',
    [ErrorCode.TIMEOUT]: 'Permintaan memakan waktu terlalu lama. Silakan coba lagi.',
    [ErrorCode.OFFLINE]: 'Anda sedang offline. Periksa koneksi internet Anda.',
    
    [ErrorCode.SERVER_ERROR]: 'Server sedang bermasalah. Coba lagi dalam beberapa menit.',
    [ErrorCode.BAD_REQUEST]: 'Data yang Anda kirim tidak valid. Periksa kembali dan coba lagi.',
    [ErrorCode.UNAUTHORIZED]: 'Sesi Anda telah berakhir. Silakan login kembali.',
    [ErrorCode.FORBIDDEN]: 'Anda tidak memiliki izin untuk mengakses ini.',
    [ErrorCode.NOT_FOUND]: 'Data yang Anda cari tidak ditemukan.',
    [ErrorCode.CONFLICT]: 'Data sudah ada atau terjadi konflik. Coba perbarui halaman.',
    [ErrorCode.RATE_LIMITED]: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat dan coba lagi.',
    
    [ErrorCode.DATABASE_ERROR]: 'Terjadi kesalahan database. Hubungi administrator.',
    [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Tidak dapat terhubung ke database. Periksa koneksi internet Anda.',
    [ErrorCode.CONSTRAINT_VIOLATION]: 'Data tidak valid atau duplikasi. Periksa kembali data Anda.',
    
    [ErrorCode.VALIDATION_ERROR]: 'Data tidak valid. Periksa kembali dan coba lagi.',
    [ErrorCode.INVALID_INPUT]: 'Input yang Anda berikan tidak sesuai format. Periksa kembali.',
    
    [ErrorCode.AUTH_ERROR]: 'Terjadi kesalahan autentikasi. Silakan login kembali.',
    [ErrorCode.SESSION_EXPIRED]: 'Sesi Anda telah berakhir. Silakan login kembali.',
    [ErrorCode.INVALID_CREDENTIALS]: 'Email atau password salah.',
    
    [ErrorCode.FILE_UPLOAD_ERROR]: 'Gagal mengunggah file. Periksa file dan coba lagi.',
    [ErrorCode.FILE_TOO_LARGE]: 'File terlalu besar. Ukuran maksimal 10MB.',
    [ErrorCode.INVALID_FILE_TYPE]: 'Tipe file tidak didukung. Gunakan file Excel atau CSV.',
    
    [ErrorCode.UNKNOWN_ERROR]: 'Terjadi kesalahan yang tidak terduga. Silakan hubungi administrator.'
  };

  return messages[code] || messages[ErrorCode.UNKNOWN_ERROR];
}

function isRetryableByDefault(code: ErrorCode): boolean {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.SERVER_ERROR,
    ErrorCode.DATABASE_CONNECTION_ERROR,
    ErrorCode.RATE_LIMITED
  ];
  return retryableCodes.includes(code);
}

// ============================================================================
// ERROR CLASSIFICATION & DETECTION
// ============================================================================

/**
 * Detect error type from Supabase error or generic error
 */
export function classifyError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Supabase error
  if (error?.message && typeof error.message === 'string') {
    const msg = error.message.toLowerCase();

    // Network errors
    if (msg.includes('network') || msg.includes('offline') || msg.includes('connection')) {
      return new AppError({
        code: ErrorCode.NETWORK_ERROR,
        message: error.message,
        originalError: error
      });
    }

    // Timeout errors
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return new AppError({
        code: ErrorCode.TIMEOUT,
        message: error.message,
        originalError: error
      });
    }

    // Auth errors
    if (msg.includes('unauthorized') || msg.includes('not authenticated')) {
      return new AppError({
        code: ErrorCode.UNAUTHORIZED,
        message: error.message,
        originalError: error,
        statusCode: 401
      });
    }

    if (msg.includes('session') || msg.includes('expired')) {
      return new AppError({
        code: ErrorCode.SESSION_EXPIRED,
        message: error.message,
        originalError: error,
        statusCode: 401
      });
    }

    // Forbidden
    if (msg.includes('forbidden') || msg.includes('permission') || msg.includes('not allowed')) {
      return new AppError({
        code: ErrorCode.FORBIDDEN,
        message: error.message,
        originalError: error,
        statusCode: 403
      });
    }

    // Not found
    if (msg.includes('not found') || msg.includes('does not exist')) {
      return new AppError({
        code: ErrorCode.NOT_FOUND,
        message: error.message,
        originalError: error,
        statusCode: 404
      });
    }

    // Conflict
    if (msg.includes('conflict') || msg.includes('duplicate')) {
      return new AppError({
        code: ErrorCode.CONFLICT,
        message: error.message,
        originalError: error,
        statusCode: 409
      });
    }

    // Database errors
    if (msg.includes('database') || msg.includes('relation') || msg.includes('table')) {
      return new AppError({
        code: ErrorCode.DATABASE_ERROR,
        message: error.message,
        originalError: error
      });
    }

    // Validation errors
    if (msg.includes('validation') || msg.includes('invalid')) {
      return new AppError({
        code: ErrorCode.VALIDATION_ERROR,
        message: error.message,
        originalError: error
      });
    }
  }

  // Server error (5xx)
  if (error?.statusCode >= 500 || error?.status >= 500) {
    return new AppError({
      code: ErrorCode.SERVER_ERROR,
      message: error.message || 'Server error',
      statusCode: error.statusCode || error.status,
      originalError: error
    });
  }

  // Bad request (4xx)
  if ((error?.statusCode >= 400 && error?.statusCode < 500) || (error?.status >= 400 && error?.status < 500)) {
    return new AppError({
      code: ErrorCode.BAD_REQUEST,
      message: error.message || 'Bad request',
      statusCode: error.statusCode || error.status,
      originalError: error
    });
  }

  // Unknown error
  return new AppError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: error?.message || 'Unknown error occurred',
    originalError: error instanceof Error ? error : undefined
  });
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: AppError, attempt: number) => boolean;
}

/**
 * Execute function with automatic retry logic (exponential backoff)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry
  } = options;

  let lastError: AppError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const appError = classifyError(error);
      lastError = appError;

      // Check if we should retry
      const isRetryable = shouldRetry
        ? shouldRetry(appError, attempt)
        : appError.retryable;

      if (!isRetryable || attempt === maxRetries) {
        throw appError;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delayMs * (0.5 + Math.random() * 0.5);

      console.warn(
        `[Retry ${attempt}/${maxRetries}] ${appError.code} - ${appError.message}. ` +
        `Retrying in ${Math.round(jitteredDelay)}ms...`
      );

      await sleep(jitteredDelay);
    }
  }

  throw lastError || new AppError({
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'Max retries exceeded'
  });
}

// ============================================================================
// LOGGING
// ============================================================================

export interface ErrorLog {
  timestamp: Date;
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode?: number;
  context?: Record<string, any>;
  stack?: string;
  userId?: string;
  action?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 500;

  log(error: AppError, userId?: string, action?: string): void {
    const log: ErrorLog = {
      timestamp: error.timestamp,
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.originalError?.stack,
      userId,
      action
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${error.code}]`, {
        message: error.message,
        userMessage: error.userMessage,
        statusCode: error.statusCode,
        context: error.context,
        stack: error.originalError?.stack
      });
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const errorLogger = new ErrorLogger();

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format error for display in UI
 */
export function formatErrorForUI(error: any): {
  title: string;
  message: string;
  retryable: boolean;
  code: ErrorCode;
} {
  const appError = classifyError(error);
  
  return {
    title: `Error: ${appError.code}`,
    message: appError.userMessage,
    retryable: appError.retryable,
    code: appError.code
  };
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: any): boolean {
  const appError = classifyError(error);
  return [
    ErrorCode.UNAUTHORIZED,
    ErrorCode.SESSION_EXPIRED,
    ErrorCode.AUTH_ERROR,
    ErrorCode.INVALID_CREDENTIALS
  ].includes(appError.code);
}

/**
 * Check if error is retriable
 */
export function isErrorRetriable(error: any): boolean {
  const appError = classifyError(error);
  return appError.retryable;
}

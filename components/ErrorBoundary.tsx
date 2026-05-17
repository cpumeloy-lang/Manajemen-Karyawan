import React from 'react';
import { AppError, classifyError, errorLogger, formatErrorForUI, ErrorCode } from '../services/errorHandlingService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: AppError; onRetry?: () => void}>;
  onError?: (error: AppError) => void;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  retryCount: number;
}

/**
 * Enhanced Error Boundary with AppError support, logging, and retry capability
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const appError = classifyError(error);
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = classifyError(error);
    
    // Log error
    errorLogger.log(appError, undefined, this.props.componentName || 'ErrorBoundary');
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `[ErrorBoundary: ${this.props.componentName || 'Unknown'}]`,
        error,
        errorInfo
      );
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, retryCount: this.state.retryCount + 1 });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return (
          <this.props.fallback 
            error={this.state.error} 
            onRetry={this.handleRetry}
          />
        );
      }

      const { title, message, retryable, code } = formatErrorForUI(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              {/* Error Icon */}
              <div className="text-red-500 text-6xl mb-4">
                {code === ErrorCode.SESSION_EXPIRED ? '🔐' : '⚠️'}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {code === ErrorCode.SESSION_EXPIRED ? 'Sesi Berakhir' : 'Oops! Terjadi Kesalahan'}
              </h1>

              {/* Message */}
              <p className="text-gray-600 mb-4">
                {message}
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-xs text-red-700 font-mono break-words">
                    <strong>Code:</strong> {code}
                  </p>
                  <p className="text-xs text-red-700 font-mono break-words mt-1">
                    <strong>Message:</strong> {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                {/* Retry Button (if retryable and not too many attempts) */}
                {retryable && this.state.retryCount < 3 && (
                  <button
                    onClick={this.handleRetry}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors text-sm"
                  >
                    Coba Lagi
                  </button>
                )}

                {/* Refresh Button */}
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors text-sm"
                >
                  Refresh Halaman
                </button>

                {/* Session Expired - Login Button */}
                {code === ErrorCode.SESSION_EXPIRED && (
                  <button
                    onClick={() => window.location.href = '/'}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors text-sm"
                  >
                    Ke Login
                  </button>
                )}
              </div>

              {/* Retry Count */}
              {this.state.retryCount > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  Percobaan ke-{this.state.retryCount}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
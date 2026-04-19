import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ProgressiveLoadingProps {
    children: React.ReactNode;
    isLoading: boolean;
    loadingText?: string;
    error?: string | null;
    onRetry?: () => void;
    isEmpty?: boolean;
    emptyText?: string;
    className?: string;
}

const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
    children,
    isLoading,
    loadingText = 'Memuat data...',
    error,
    onRetry,
    isEmpty = false,
    emptyText = 'Tidak ada data',
    className = ''
}) => {
    if (error) {
        return (
            <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-red-600 font-medium">Terjadi Kesalahan</p>
                        <p className="text-red-500 text-sm mt-1">{error}</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                            Coba Lagi
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={`p-8 flex justify-center ${className}`}>
                <LoadingSpinner size="medium" text={loadingText} />
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className={`p-8 text-center text-gray-500 ${className}`}>
                <p>{emptyText}</p>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProgressiveLoading;
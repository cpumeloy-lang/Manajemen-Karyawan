import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    text?: string;
    fullScreen?: boolean;
    color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
    size = 'medium', 
    text = 'Memuat...', 
    fullScreen = false,
    color = '#06736a'
}) => {
    const sizeClasses = {
        small: 'h-6 w-6',
        medium: 'h-8 w-8',
        large: 'h-12 w-12'
    };

    const textSizeClasses = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center">
            <div 
                className={`animate-spin rounded-full border-4 border-[#06736a] border-t-transparent ${sizeClasses[size]} mb-2`}
            ></div>
            {text && (
                <div className={`font-medium text-[#06736a] ${textSizeClasses[size]}`}>
                    {text}
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
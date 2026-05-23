import React from 'react';

export const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = 'blue' }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        yellow: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-700',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.blue}`}>
            {text}
        </span>
    );
};

export const Step: React.FC<{ no: number; title: string; children: React.ReactNode }> = ({ no, title, children }) => (
    <div className="flex gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#06736a] text-white text-sm font-bold flex items-center justify-center mt-0.5">
            {no}
        </div>
        <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
            <div className="text-sm text-gray-600 space-y-1">{children}</div>
        </div>
    </div>
);

export const InfoBox: React.FC<{ type?: 'info' | 'warning' | 'success'; children: React.ReactNode }> = ({ type = 'info', children }) => {
    const styles = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-green-50 border-green-200 text-green-800',
    };
    const icons = { info: 'ℹ️', warning: '⚠️', success: '✅' };
    return (
        <div className={`rounded-xl border px-4 py-3 text-sm flex gap-2 ${styles[type]}`}>
            <span>{icons[type]}</span>
            <div>{children}</div>
        </div>
    );
};

export const Code: React.FC<{ children: string }> = ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
);

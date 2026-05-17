/**
 * components/Sidebar/NavButton.tsx
 * Navigation button component with badge support
 * Extracted from App.tsx
 */

import React from 'react';
import type { View } from '../../types';

interface NavButtonProps {
  viewName: View;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isActive: boolean;
  onClick: () => void;
}

export const NavButton: React.FC<NavButtonProps> = ({
  label,
  icon,
  badge,
  isActive,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all relative ${
      isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/25'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span
        className={`ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full ${
          isActive
            ? 'bg-white/20 text-white'
            : 'bg-red-500 text-white animate-pulse'
        }`}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

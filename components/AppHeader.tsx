/**
 * components/AppHeader.tsx
 * Header component with search and action buttons
 * Extracted from App.tsx
 */

import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { isAdminRole, isHrRole, isKepalaRuanganRole } from '../utils/roleUtils';
import type { View } from '../types';

interface AppHeaderProps {
  effectiveView: View;
  searchTerm: string;
  dataLoading: boolean;
  userRole?: string;
  onSearchChange: (value: string) => void;
  onAddEmployee: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  effectiveView,
  searchTerm,
  dataLoading,
  userRole,
  onSearchChange,
  onAddEmployee,
}) => {
  const isEmployeeTableView = (isAdminRole(userRole) || isHrRole(userRole)) && effectiveView === 'employees';
  const isEmployeeViewOnly = isKepalaRuanganRole(userRole) && effectiveView === 'employees';

  return (
    <>
      <header className="flex justify-between items-center mb-8">
        {(isEmployeeTableView || isEmployeeViewOnly) ? (
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Cari nama karyawan..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
            />
          </div>
        ) : (
          <div />
        )}
        {isEmployeeTableView && (
          <button
            onClick={onAddEmployee}
            className="bg-[#06736a] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#054f46] transition-colors"
          >
            + Tambah Karyawan
          </button>
        )}
        {isEmployeeViewOnly && (
          <div className="text-sm text-gray-600">
            Mode View-Only: Hanya bisa melihat data karyawan unit Anda
          </div>
        )}
      </header>

      {dataLoading && (
        <div className="mb-4 bg-[#e6f3f2] border border-[#06736a] rounded-lg p-3 flex items-center">
          <LoadingSpinner size="small" text="" />
          <span className="ml-2 text-[#06736a] text-sm">Memperbarui data...</span>
        </div>
      )}
    </>
  );
};

/**
 * components/Sidebar/Sidebar.tsx
 * Main sidebar component with navigation
 * Extracted from App.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { View } from '../../types';
import { NavButton } from './NavButton';
import {
  UserGroupIcon,
  Squares2x2Icon,
  Cog6ToothIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BellAlertIcon,
  ArrowLeftOnRectangleIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
} from '../icons';
import { isAdminRole, isHrRole, isKepalaRuanganRole } from '../../utils/roleUtils';

interface SidebarProps {
  activePortal: 'personal' | 'operational' | null;
  effectiveView: View;
  systemSettings: { institution_name?: string; logo_url?: string } | null;
  authUser: { profile?: { role?: string; nama?: string }; email?: string };
  canAccessOperationalPortal: boolean;
  pendingRequestsCount: number;
  isLoggingOut: boolean;
  isChangePasswordOpen: boolean;
  
  // Callbacks
  onNavigate: (view: View) => void;
  onPortalToggle: () => void;
  onChangePasswordClick: () => void;
  onLogout: () => void;
  onAuditLogClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePortal,
  effectiveView,
  systemSettings,
  authUser,
  canAccessOperationalPortal,
  pendingRequestsCount,
  isLoggingOut,
  onNavigate,
  onPortalToggle,
  onChangePasswordClick,
  onLogout,
  onAuditLogClick,
}) => {
  const userRole = authUser?.profile?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  const handleNavigate = useCallback((view: View) => {
    onNavigate(view);
    setMobileOpen(false);
  }, [onNavigate]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
    {/* Mobile hamburger button */}
    <button
      onClick={() => setMobileOpen(true)}
      className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
      aria-label="Buka menu navigasi"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    {/* Mobile overlay */}
    {mobileOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={() => setMobileOpen(false)}
      />
    )}

    <aside className={`
      w-64 bg-white shadow-md flex flex-col p-4 fixed h-full z-50
      transition-transform duration-300 ease-in-out
      lg:translate-x-0
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        {systemSettings?.logo_url ? (
          <img src={systemSettings.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(systemSettings?.institution_name || 'H')[0].toUpperCase()}
          </div>
        )}
        <h1 className="text-lg font-bold text-primary truncate">
          {systemSettings?.institution_name || 'HRMS Pro'}
        </h1>
        {/* Close button (mobile) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden text-gray-400 hover:text-gray-700"
          aria-label="Tutup menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-2 overflow-y-auto overflow-x-hidden pr-1">
        {/* Admin Navigation */}
        {activePortal === 'operational' && isAdminRole(userRole) && (
          <>
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
              Admin
            </p>
            <NavButton
              viewName="dashboard"
              label="Dashboard"
              icon={<Squares2x2Icon className="h-5 w-5" />}
              isActive={effectiveView === 'dashboard'}
              onClick={() => handleNavigate('dashboard')}
            />
            <NavButton
              viewName="employees"
              label="Karyawan"
              icon={<UserGroupIcon className="h-5 w-5" />}
              isActive={effectiveView === 'employees'}
              onClick={() => handleNavigate('employees')}
            />
            <NavButton
              viewName="attendance"
              label="Kehadiran (Live)"
              icon={<ClockIcon className="h-5 w-5" />}
              isActive={effectiveView === 'attendance'}
              onClick={() => handleNavigate('attendance')}
            />
            <div className="pl-4">
              <NavButton
                viewName="attendance-report"
                label="Laporan Kehadiran"
                icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                isActive={effectiveView === 'attendance-report'}
                onClick={() => handleNavigate('attendance-report')}
              />
            </div>
            <NavButton
              viewName="payroll"
              label="Penggajian"
              icon={<CurrencyDollarIcon className="h-5 w-5" />}
              isActive={effectiveView === 'payroll'}
              onClick={() => handleNavigate('payroll')}
            />
            <NavButton
              viewName="requests"
              label="Permohonan"
              icon={<BellAlertIcon className="h-5 w-5" />}
              badge={pendingRequestsCount}
              isActive={effectiveView === 'requests'}
              onClick={() => handleNavigate('requests')}
            />
            <NavButton
              viewName="organization"
              label="Pengaturan Organisasi"
              icon={<Cog6ToothIcon className="h-5 w-5" />}
              isActive={effectiveView === 'organization'}
              onClick={() => handleNavigate('organization')}
            />
            <NavButton
              viewName="system"
              label="Pengaturan Sistem"
              icon={<Cog6ToothIcon className="h-5 w-5" />}
              isActive={effectiveView === 'system'}
              onClick={() => handleNavigate('system')}
            />
            <NavButton
              viewName="guide"
              label="Panduan Admin"
              icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
              isActive={effectiveView === 'guide'}
              onClick={() => handleNavigate('guide')}
            />
          </>
        )}

        {/* HRD / Kepala Ruangan Navigation */}
        {activePortal === 'operational' &&
          (isHrRole(userRole) || isKepalaRuanganRole(userRole)) && (
            <>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                {isHrRole(userRole) ? 'HRD' : 'Kepala Ruangan'}
              </p>
              <NavButton
                viewName="dashboard"
                label="Dashboard"
                icon={<Squares2x2Icon className="h-5 w-5" />}
                isActive={effectiveView === 'dashboard'}
                onClick={() => handleNavigate('dashboard')}
              />
              {isHrRole(userRole) && (
                <NavButton
                  viewName="employees"
                  label="Karyawan"
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  isActive={effectiveView === 'employees'}
                  onClick={() => handleNavigate('employees')}
                />
              )}
              {isKepalaRuanganRole(userRole) && (
                <NavButton
                  viewName="employees"
                  label="Data Karyawan Unit"
                  icon={<UserGroupIcon className="h-5 w-5" />}
                  isActive={effectiveView === 'employees'}
                  onClick={() => handleNavigate('employees')}
                />
              )}
              <NavButton
                viewName="attendance"
                label="Kehadiran (Live)"
                icon={<ClockIcon className="h-5 w-5" />}
                isActive={effectiveView === 'attendance'}
                onClick={() => handleNavigate('attendance')}
              />
              <div className="pl-4">
                <NavButton
                  viewName="attendance-report"
                  label="Laporan Kehadiran"
                  icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  isActive={effectiveView === 'attendance-report'}
                  onClick={() => handleNavigate('attendance-report')}
                />
              </div>
              {isKepalaRuanganRole(userRole) && (
                <>
                  <NavButton
                    viewName="unit-schedule"
                    label="Jadwal Unit"
                    icon={<ClockIcon className="h-5 w-5" />}
                    isActive={effectiveView === 'unit-schedule'}
                    onClick={() => handleNavigate('unit-schedule')}
                  />
                  <NavButton
                    viewName="guide"
                    label="Panduan"
                    icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                    isActive={effectiveView === 'guide'}
                    onClick={() => handleNavigate('guide')}
                  />
                </>
              )}
              {isHrRole(userRole) && (
                <>
                  <NavButton
                    viewName="guide"
                    label="Panduan HRD"
                    icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                    isActive={effectiveView === 'guide'}
                    onClick={() => handleNavigate('guide')}
                  />
                  <NavButton
                    viewName="requests"
                    label="Permohonan"
                    icon={<BellAlertIcon className="h-5 w-5" />}
                    badge={pendingRequestsCount}
                    isActive={effectiveView === 'requests'}
                    onClick={() => handleNavigate('requests')}
                  />
                  <NavButton
                    viewName="payroll"
                    label="Penggajian"
                    icon={<CurrencyDollarIcon className="h-5 w-5" />}
                    isActive={effectiveView === 'payroll'}
                    onClick={() => handleNavigate('payroll')}
                  />
                </>
              )}
            </>
          )}

        {/* Employee Navigation */}
        {activePortal === 'personal' && (
          <>
            <p className="px-4 pt-6 py-2 text-xs font-semibold text-gray-400 uppercase">
              Karyawan
            </p>
            <NavButton
              viewName="personal-dashboard"
              label="Dashboard Pribadi"
              icon={<UserCircleIcon className="h-5 w-5" />}
              isActive={effectiveView === 'personal-dashboard'}
              onClick={() => handleNavigate('personal-dashboard')}
            />
            <NavButton
              viewName="ess"
              label="Self-Service"
              icon={<UserCircleIcon className="h-5 w-5" />}
              isActive={effectiveView === 'ess'}
              onClick={() => handleNavigate('ess')}
            />
          </>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto">
        {/* Portal Toggle Button */}
        {canAccessOperationalPortal && (
          <button
            onClick={onPortalToggle}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a] mb-2 transition-colors"
            disabled={isLoggingOut}
          >
            <UserCircleIcon className="h-5 w-5" />
            <span>
              {activePortal === 'personal'
                ? 'Pindah ke Operasional'
                : 'Pindah ke Personal'}
            </span>
          </button>
        )}

        {/* User Info */}
        <div className="text-center text-xs text-gray-500 mb-2 p-2 border-t">
          <p className="font-semibold">{authUser?.profile?.nama}</p>
          <p>{authUser?.email}</p>
        </div>

        {/* Change Password Button */}
        <button
          onClick={onChangePasswordClick}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a] mb-2 transition-colors"
          disabled={isLoggingOut}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <span>Ubah Password</span>
        </button>

        {/* Audit Log Button (Admin only) */}
        {isAdminRole(userRole) && (
          <button
            onClick={onAuditLogClick}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a] mb-2 transition-colors"
            disabled={isLoggingOut}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>History Aktivitas</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
            isLoggingOut
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {isLoggingOut ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Logging out...</span>
            </>
          ) : (
            <>
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
};

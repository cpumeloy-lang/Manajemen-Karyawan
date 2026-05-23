/**
 * App.tsx - REFACTORED
 * 
 * Main application component - now acts as an orchestrator
 * All logic extracted into custom hooks and separate components
 * 
 * Previous: ~600 lines, 40+ imports, mixed concerns
 * Current: ~150 lines, focused on orchestration
 * 
 * Architecture:
 * App.tsx → Orchestration & Composition
 * ├─ useAppShell.ts → Portal, view, data management
 * ├─ useViewRenderer.tsx → View rendering logic  
 * ├─ Sidebar.tsx → Navigation UI
 * ├─ AppHeader.tsx → Header & search UI
 * └─ All other hooks → Business logic (unchanged)
 */

import React, { Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppInitialization } from './hooks/useAppInitialization.ts';
import { useAuthHandlers } from './hooks/useAuthHandlers.ts';
import { useEmployeeCRUD } from './hooks/useEmployeeCRUD.ts';
import { useEmployeeImport } from './hooks/useEmployeeImport.ts';
import { useOrganizationHandlers } from './hooks/useOrganizationHandlers.ts';
import { useAttendanceHandlers } from './hooks/useAttendanceHandlers.ts';
import { useRequestHandlers } from './hooks/useRequestHandlers.ts';
import { useSystemSettingsHandler } from './hooks/useSystemSettingsHandler.ts';
import { useMessageHandlers } from './hooks/useMessageHandlers.ts';
import { useAppShell } from './hooks/useAppShell.ts';
import { renderViewContent } from './hooks/useViewRenderer.tsx';
import { useAuth, useAppData, useUI, useUIActions, useAppError } from './stores/appStore.ts';
import type { View } from './types.ts';
import { isAdminRole, isKepalaRuanganRole, isHrRole } from './utils/roleUtils.ts';

// Components
import Login from './components/Login.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import PortalSelector from './components/PortalSelector.tsx';
import PersonalGuard from './components/guards/PersonalGuard.tsx';
import OperationalGuard from './components/guards/OperationalGuard.tsx';
import ChangePassword from './components/ChangePassword.tsx';
import ResetPassword from './components/ResetPassword.tsx';
import DatabaseSetup from './components/DatabaseSetup.tsx';
import EmployeeForm from './components/EmployeeForm.tsx';
import EmployeeDetail from './components/EmployeeDetail.tsx';
import { Sidebar } from './components/Sidebar/Sidebar.tsx';
import { AppHeader } from './components/AppHeader.tsx';


/**
 * AppContent component - All main hooks called here
 * Separated from conditional logic to fix React hook order violations
 */
const AppContent: React.FC = () => {
  // ====================================================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP (Rules of Hooks)
  // Early returns happen AFTER all hooks have been called.
  // ====================================================================

  // Initialize app
  useAppInitialization();

  // Get auth & error state
  const { authUser, loading: authLoading, isResetPasswordPage } = useAuth();
  const { error: appError, isDatabaseError } = useAppError();

  // UI state & actions
  const { setView, setIsFormOpen, setEmployeeToEdit, setIsDetailOpen, setEmployeeToView, setIsChangePasswordOpen, setSearchTerm, setStatusFilter, setDepartmentFilter, setUnitFilter, setEssDefaultTab } = useUIActions();
  const { isChangePasswordOpen, isLoggingOut } = useUI();

  // Shell state (portal/view/derived data)
  const [shellState, shellActions] = useAppShell();
  const { activePortal, effectiveView, isPersonalView, canAccessOperationalPortal, pendingRequestsCount, employeesWithDocuments, sortedAndFilteredEmployees } = shellState;

  // All handlers
  const { handleLogin, handleLogout } = useAuthHandlers();
  const { handleSaveEmployee, handleDeleteEmployee } = useEmployeeCRUD();
  const { handleImportEmployees } = useEmployeeImport();
  const { handleSaveWorkUnit, handleDeleteWorkUnit, handleSaveDepartment, handleDeleteDepartment, handleSavePosition, handleDeletePosition } = useOrganizationHandlers();
  const { handleSavePersonalAttendance, handleSaveOperationalAttendance, loadPendingAttendanceChangeRequests, loadAttendanceRevisionHistory, handleApproveAttendanceChangeRequest, handleRejectAttendanceChangeRequest } = useAttendanceHandlers();
  const { handleUpdateRequestStatus, handleNewRequest } = useRequestHandlers();
  const { handleUpdateSystemSettings } = useSystemSettingsHandler();
  const { successMessage, clearError, clearSuccess } = useMessageHandlers();

  // Data
  const { employees, workUnits, departments, positions, systemSettings, attendanceRecords, allRequests, documents, dataLoading } = useAppData();

  // UI state for forms/modals
  const { isFormOpen, employeeToEdit, isDetailOpen, employeeToView, searchTerm, statusFilter, departmentFilter, unitFilter, sortKey, sortDirection, essDefaultTab } = useUI();

  // ====================================================================
  // EARLY RETURNS (after all hooks are called)
  // ====================================================================

  if (authLoading) {
    return <LoadingSpinner fullScreen size="large" text="Memeriksa sesi..." />;
  }

  if (isResetPasswordPage) {
    return (
      <Suspense fallback={<LoadingSpinner fullScreen size="large" text="Memuat modul aplikasi..." />}>
        <ResetPassword />
      </Suspense>
    );
  }

  if (!authUser) {
    return <Login onLogin={handleLogin} initialError={appError} />;
  }

  if (isDatabaseError) {
    return (
      <Suspense fallback={<LoadingSpinner fullScreen size="large" text="Memuat modul aplikasi..." />}>
        <DatabaseSetup />
      </Suspense>
    );
  }

  // Check portal access
  if (activePortal === 'operational' && !canAccessOperationalPortal) {
    return <LoadingSpinner fullScreen size="large" text="Menyesuaikan profil akses..." />;
  }

  // Show portal selector
  if (activePortal === null) {
    return (
      <PortalSelector
        userName={authUser.profile.nama}
        canAccessOperational={canAccessOperationalPortal}
        onSelectPortal={(portal) => shellActions.handlePortalChange(portal, 'selector')}
      />
    );
  }

  // Render content
  const lazyFallback = <LoadingSpinner fullScreen size="large" text="Memuat modul aplikasi..." />;

  // Render the appropriate view
  const viewContent = renderViewContent({
    effectiveView,
    authUser,
    employees,
    employeesWithDocuments,
    sortedAndFilteredEmployees,
    attendanceRecords,
    allRequests,
    workUnits,
    departments,
    positions,
    systemSettings,
    dataLoading,
    sortKey,
    sortDirection,
    employeeToView,
    isAdminRole,
    isKepalaRuanganRole,
    isHrRole,
    onSort: shellActions.handleSort,
    onEdit: (emp) => {
      setEmployeeToEdit(emp);
      setIsFormOpen(true);
    },
    onDelete: handleDeleteEmployee,
    onView: (emp) => {
      setEmployeeToView(emp);
      setIsDetailOpen(true);
    },
    onNavigateToEmployeeAttendanceDetail: (emp) => {
      setEmployeeToView(emp);
      setView('employee-attendance-detail' as View);
    },
    onImport: handleImportEmployees,
    handleSaveWorkUnit,
    handleDeleteWorkUnit,
    handleSaveDepartment,
    handleDeleteDepartment,
    handleSavePosition,
    handleDeletePosition,
    handleUpdateSystemSettings,
    handleSaveOperationalAttendance,
    loadPendingAttendanceChangeRequests,
    loadAttendanceRevisionHistory,
    handleApproveAttendanceChangeRequest,
    handleRejectAttendanceChangeRequest,
    handleUpdateRequestStatus,
    handleNewRequest,
    handleSavePersonalAttendance,
    onBackFromEmployeeAttendanceDetail: () => setView('attendance' as View),
    onNavigate: (view: View) => setView(view),
    essDefaultTab,
    setEssDefaultTab,
  });

  const guardedView = isPersonalView ? (
    <PersonalGuard activePortal={activePortal}>{viewContent}</PersonalGuard>
  ) : (
    <OperationalGuard activePortal={activePortal}>{viewContent}</OperationalGuard>
  );

  return (
    <Suspense fallback={lazyFallback}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar Navigation */}
        <Sidebar
          activePortal={activePortal}
          effectiveView={effectiveView}
          systemSettings={systemSettings}
          authUser={authUser}
          canAccessOperationalPortal={canAccessOperationalPortal}
          pendingRequestsCount={pendingRequestsCount}
          isLoggingOut={isLoggingOut}
          isChangePasswordOpen={isChangePasswordOpen}
          onNavigate={(view) => setView(view)}
          onPortalToggle={() =>
            shellActions.handlePortalChange(
              activePortal === 'personal' ? 'operational' : 'personal',
              'toggle'
            )
          }
          onChangePasswordClick={() => setIsChangePasswordOpen(true)}
          onLogout={handleLogout}
          onAuditLogClick={() => setView('audit-log')}
        />

        {/* Main Content */}
        <main className="ml-0 lg:ml-64 flex-1 p-4 pt-16 lg:p-8 lg:pt-8">
          <AppHeader
            effectiveView={effectiveView}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            departmentFilter={departmentFilter}
            unitFilter={unitFilter}
            departments={departments}
            workUnits={workUnits}
            dataLoading={dataLoading}
            userRole={authUser.profile.role}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            onUnitFilterChange={setUnitFilter}
            onAddEmployee={() => {
              setEmployeeToEdit(null);
              setIsFormOpen(true);
            }}
          />

          {appError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {appError}</span>
            </div>
          )}

          {guardedView}

          {/* Modals */}
          <EmployeeForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEmployeeToEdit(null);
            }}
            onSave={handleSaveEmployee}
            employeeToEdit={employeeToEdit}
            workUnits={workUnits}
            departments={departments}
            positions={positions}
            currentUserRole={authUser.profile.role}
          />
          {employeeToView && (
            <EmployeeDetail
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              employee={employeeToView}
              workUnit={
                employeeToView.unitKerjaId
                  ? workUnits.find((w) => w.id === employeeToView.unitKerjaId)
                  : undefined
              }
              attendanceRecords={attendanceRecords.filter(
                (r) => r.employeeId === employeeToView.id
              )}
              onOpenAttendanceDetail={() => {
                setIsDetailOpen(false);
                setView('employee-attendance-detail');
              }}
            />
          )}

          <ChangePassword
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        </main>
      </div>

      {/* Fixed toast notifications */}
      {(successMessage || appError) && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {successMessage && (
            <div className="pointer-events-auto flex items-start gap-3 rounded-xl bg-green-600 px-4 py-3 text-white shadow-2xl">
              <svg className="h-5 w-5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium flex-1">{successMessage}</p>
              <button
                type="button"
                onClick={() => clearSuccess()}
                className="text-white/80 hover:text-white"
                title="Tutup notifikasi sukses"
                aria-label="Tutup notifikasi sukses"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}
          {appError && (
            <div className="pointer-events-auto flex items-start gap-3 rounded-xl bg-red-600 px-4 py-3 text-white shadow-2xl">
              <svg className="h-5 w-5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 012 0v1a1 1 0 01-2 0v-1zm0-4a1 1 0 012 0v3a1 1 0 01-2 0V9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium flex-1">{appError}</p>
              <button
                type="button"
                onClick={() => clearError()}
                className="text-white/80 hover:text-white"
                title="Tutup notifikasi error"
                aria-label="Tutup notifikasi error"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </Suspense>
  );
};


const RouterSync: React.FC = () => {
  const { view } = useUI();
  const { setView } = useUIActions();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. URL -> State (When user clicks back/forward or Link)
  React.useEffect(() => {
    const pathView = location.pathname.slice(1) || 'dashboard';
    if (pathView !== view) {
      setView(pathView as View);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, setView]);

  // 2. State -> URL (When internal buttons call setView)
  React.useEffect(() => {
    const path = `/${view}`;
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [view, navigate, location.pathname]);

  return null;
};

/**
 * Main App wrapper - Wraps content with error boundary to fix hook order violations
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <RouterSync />
      <AppContent />
    </ErrorBoundary>
  );
};

export default App;

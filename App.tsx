
import React, { Suspense, useMemo, useState } from 'react';
import { Employee, WorkUnit, Department, Position, SystemSettings as SystemSettingsType, AttendanceRecord, AllRequest, SortKey, SortDirection, RequestStatus, RequestType, LeaveRequest, ReimbursementRequest, Document } from './types.ts';
import Login from './components/Login.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import { UserGroupIcon, Cog6ToothIcon, ClockIcon, CurrencyDollarIcon, BellAlertIcon, ArrowLeftOnRectangleIcon, UserCircleIcon } from './components/icons.tsx';
import type { NewEmployeeData } from './components/EmployeeForm.tsx';
import { useAuth, useAppData, useAppDataActions, useUI, useUIActions, useAppError } from './stores/appStore.ts';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useAuthHandlers } from './hooks/useAuthHandlers';
import { useEmployeeCRUD } from './hooks/useEmployeeCRUD';
import { useEmployeeImport } from './hooks/useEmployeeImport';
import { useOrganizationHandlers } from './hooks/useOrganizationHandlers';
import { useAttendanceHandlers } from './hooks/useAttendanceHandlers';
import { useRequestHandlers } from './hooks/useRequestHandlers';
import { useSystemSettingsHandler } from './hooks/useSystemSettingsHandler';
import { useMessageHandlers } from './hooks/useMessageHandlers';
import { isAdminRole, isHrRole, isKepalaRuanganRole } from './utils/roleUtils';

const Dashboard = React.lazy(() => import('./components/Dashboard.tsx'));
const HRDashboard = React.lazy(() => import('./components/HRDashboard.tsx'));
const KepalaRuanganDashboard = React.lazy(() => import('./components/KepalaRuanganDashboard.tsx'));
const EmployeeTable = React.lazy(() => import('./components/EmployeeTable.tsx'));
const EmployeeForm = React.lazy(() => import('./components/EmployeeForm.tsx'));
const EmployeeDetail = React.lazy(() => import('./components/EmployeeDetail.tsx'));
const EmployeeAttendanceDetail = React.lazy(() => import('./components/EmployeeAttendanceDetail.tsx'));
const OrganizationSettings = React.lazy(() => import('./components/OrganizationSettings.tsx'));
const SystemSettings = React.lazy(() => import('./components/SystemSettings.tsx'));
const AttendanceManagement = React.lazy(() => import('./components/AttendanceManagement.tsx'));
const PayrollManagement = React.lazy(() => import('./components/PayrollManagement.tsx'));
const RequestManagement = React.lazy(() => import('./components/RequestManagement.tsx'));
const EmployeeSelfService = React.lazy(() => import('./components/EmployeeSelfService.tsx'));
const UnitScheduleManagement = React.lazy(() => import('./components/UnitScheduleManagement.tsx'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword.tsx'));
const ChangePassword = React.lazy(() => import('./components/ChangePassword.tsx'));
const AuditLogViewer = React.lazy(() => import('./components/AuditLogViewer.tsx'));
const DatabaseSetup = React.lazy(() => import('./components/DatabaseSetup.tsx'));

type View = 'dashboard' | 'personal-dashboard' | 'employees' | 'organization' | 'system' | 'attendance' | 'payroll' | 'requests' | 'ess' | 'unit-schedule' | 'audit-log' | 'employee-attendance-detail';

const App: React.FC = () => {
    // Initialize app (auth + data loading)
    useAppInitialization();

    // Get state from store
    const { authUser, loading: authLoading, isResetPasswordPage } = useAuth();
    const { employees, workUnits, departments, positions, systemSettings, attendanceRecords, allRequests, documents, dataLoading } = useAppData();
    const { setEmployees, setWorkUnits, setDepartments, setPositions, setSystemSettings, setAttendanceRecords, setAllRequests, setDocuments } = useAppDataActions();
    const { view, essDefaultTab, isChangePasswordOpen, isLoggingOut, isFormOpen, employeeToEdit, isDetailOpen, employeeToView, searchTerm, sortKey, sortDirection } = useUI();
    const { setView, setEssDefaultTab, setIsChangePasswordOpen, setIsLoggingOut, setIsFormOpen, setEmployeeToEdit, setIsDetailOpen, setEmployeeToView, setSearchTerm, setSortKey, setSortDirection } = useUIActions();
    const { error: appError, isDatabaseError } = useAppError();
    
    // Use custom hooks
    const { handleLogin, handleLogout } = useAuthHandlers();
    const { handleSaveEmployee, handleDeleteEmployee } = useEmployeeCRUD();
    const { handleImportEmployees } = useEmployeeImport();
    const { handleSaveWorkUnit, handleDeleteWorkUnit, handleSaveDepartment, handleDeleteDepartment, handleSavePosition, handleDeletePosition } = useOrganizationHandlers();
    const { handleSaveAttendance } = useAttendanceHandlers();
    const { handleUpdateRequestStatus, handleNewRequest } = useRequestHandlers();
    const { handleUpdateSystemSettings } = useSystemSettingsHandler();
    const { successMessage, showSuccess, showError } = useMessageHandlers();

    const employeesWithDocuments = useMemo(() => {
        const docsByEmployee = documents.reduce((acc, doc) => {
            (acc[doc.employeeId] = acc[doc.employeeId] || []).push(doc);
            return acc;
        }, {} as Record<string, Document[]>);

        return employees.map(emp => ({
            ...emp,
            documents: docsByEmployee[emp.id] || []
        }));
    }, [employees, documents]);

    const sortedAndFilteredEmployees = useMemo(() => {
        return [...employeesWithDocuments]
            .filter(e => e.nama.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const aVal = a[sortKey as keyof Employee] || '';
                const bVal = b[sortKey as keyof Employee] || '';
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
    }, [employeesWithDocuments, searchTerm, sortKey, sortDirection]);

    // Hitung jumlah permohonan yang pending
    const pendingRequestsCount = useMemo(() => {
        return allRequests.filter(req => req.status === RequestStatus.Pending).length;
    }, [allRequests]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    // Show loading only during initial check or when loading data
    if (authLoading) {
        return <LoadingSpinner fullScreen size="large" text="Memeriksa sesi..." />;
    }

    const lazyFallback = <LoadingSpinner fullScreen size="large" text="Memuat modul aplikasi..." />;

    // Show reset password page if on that route
    if (isResetPasswordPage) {
        return (
            <Suspense fallback={lazyFallback}>
                <ResetPassword />
            </Suspense>
        );
    }

    if (!authUser) {
        return <Login onLogin={handleLogin} initialError={appError} />;
    }

    // Show database setup if database error detected
    if (isDatabaseError) {
        return (
            <Suspense fallback={lazyFallback}>
                <DatabaseSetup />
            </Suspense>
        );
    }

    const renderView = () => {
        switch(view) {
            case 'employees': return <EmployeeTable 
                employees={sortedAndFilteredEmployees} 
                onEdit={(emp) => { 
                    setEmployeeToEdit(emp); 
                    setIsFormOpen(true); 
                }} 
                onDelete={handleDeleteEmployee} 
                onView={(emp) => { setEmployeeToView(emp); setIsDetailOpen(true); }} 
                onImport={handleImportEmployees}
                sortKey={sortKey} 
                sortDirection={sortDirection} 
                onSort={handleSort} 
            />;
            case 'organization': return <OrganizationSettings 
                workUnits={workUnits} 
                departments={departments} 
                positions={positions} 
                onSaveWorkUnit={handleSaveWorkUnit} 
                onDeleteWorkUnit={handleDeleteWorkUnit} 
                onSaveDepartment={handleSaveDepartment} 
                onDeleteDepartment={handleDeleteDepartment} 
                onSavePosition={handleSavePosition} 
                onDeletePosition={handleDeletePosition} 
            />;
            case 'system': return <SystemSettings 
                settings={systemSettings} 
                onUpdate={handleUpdateSystemSettings} 
                loading={dataLoading} 
            />;
            case 'attendance': return <AttendanceManagement employees={employees} attendanceRecords={attendanceRecords} onSave={handleSaveAttendance} />;
            case 'payroll': return <PayrollManagement employees={employees} attendanceRecords={attendanceRecords} />;
            case 'requests': return <RequestManagement allRequests={allRequests} employees={employees} onUpdateRequestStatus={handleUpdateRequestStatus} />;
            case 'audit-log': return isAdminRole(authUser.profile.role) ? <AuditLogViewer isInline /> : null;
            case 'unit-schedule': return isKepalaRuanganRole(authUser.profile.role) ? <UnitScheduleManagement kepalaRuangan={authUser.profile} /> : null;
            case 'ess': return <EmployeeSelfService 
                user={employeesWithDocuments.find(e=> e.id === authUser.profile.id) || authUser.profile} 
                attendanceRecords={attendanceRecords.filter(r => r.employeeId === authUser.profile.id)} 
                leaveRequests={allRequests.filter(r => r.employeeId === authUser.profile.id && r.type === RequestType.Cuti) as LeaveRequest[]} 
                reimbursementRequests={allRequests.filter(r => r.employeeId === authUser.profile.id && r.type === RequestType.Reimbursement) as ReimbursementRequest[]} 
                onNewRequest={handleNewRequest} 
                onSaveAttendance={handleSaveAttendance}
                defaultTab={essDefaultTab}
                onBackToDashboard={() => setView('dashboard')}
                onEditProfile={() => {
                    // Buka form edit dengan data profil karyawan sendiri
                    setEmployeeToEdit(employeesWithDocuments.find(e=> e.id === authUser.profile.id) || authUser.profile);
                    setIsFormOpen(true);
                }}
            />;
            case 'personal-dashboard': return <Dashboard
                employees={employees}
                currentUser={authUser.profile}
                onNavigate={(view, tab) => {
                    setView(view);
                    if (tab) setEssDefaultTab(tab);
                }}
            />;
            case 'dashboard': default: {
                // Render dashboard sesuai dengan role user
                if (isKepalaRuanganRole(authUser.profile.role)) {
                    return <KepalaRuanganDashboard
                        kepalaRuangan={authUser.profile}
                        onNavigate={(nextView) => setView(nextView as View)}
                    />;
                } else if (isHrRole(authUser.profile.role) || isAdminRole(authUser.profile.role)) {
                    return <HRDashboard
                        currentUser={authUser.profile}
                        employees={employees}
                        attendanceRecords={attendanceRecords}
                        allRequests={allRequests}
                        onNavigate={(nextView) => setView(nextView as View)}
                    />;
                } else {
                    return <Dashboard
                        employees={employees}
                        currentUser={authUser.profile}
                        onNavigate={(view, tab) => {
                            setView(view);
                            if (tab) setEssDefaultTab(tab);
                        }}
                    />;
                }
            }
            case 'employee-attendance-detail': {
                if (!employeeToView) {
                    return (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                            Pilih karyawan dari daftar untuk melihat detail absensi lengkap.
                        </div>
                    );
                }

                return (
                    <EmployeeAttendanceDetail
                        employee={employeeToView}
                        attendanceRecords={attendanceRecords.filter((record) => record.employeeId === employeeToView.id)}
                        workUnit={employeeToView.unitKerjaId ? workUnits.find((workUnit) => workUnit.id === employeeToView.unitKerjaId) : undefined}
                        onBack={() => {
                            setView('employees');
                        }}
                    />
                );
            }
        }
    };

    const NavButton: React.FC<{ viewName: View; label: string; icon: React.ReactNode; badge?: number }> = ({ viewName, label, icon, badge }) => (
        <button
            onClick={() => setView(viewName)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative ${view === viewName ? 'bg-[#06736a] text-white' : 'text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a]'}`}
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className={`ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full ${
                    view === viewName ? 'bg-white text-[#06736a]' : 'bg-red-500 text-white animate-pulse'
                }`}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );

    return (
        <Suspense fallback={lazyFallback}>
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="w-64 bg-white shadow-md flex flex-col p-4 fixed h-full">
                 <div className="flex items-center gap-2 mb-8 px-2">
                    <h1 className="text-xl font-bold text-[#06736a]">{systemSettings?.institution_name || 'HRMS Pro'}</h1>
                </div>
                <nav className="flex-grow space-y-2 overflow-y-auto overflow-x-hidden pr-1">
                    {isAdminRole(authUser.profile.role) && (
                        <>
                            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Admin</p>
                            <NavButton viewName="dashboard" label="Dashboard" icon={<UserGroupIcon className="h-5 w-5"/>} />
                            <NavButton viewName="employees" label="Karyawan" icon={<UserGroupIcon className="h-5 w-5"/>} />
                            <NavButton viewName="attendance" label="Kehadiran" icon={<ClockIcon className="h-5 w-5"/>} />
                            <NavButton viewName="payroll" label="Penggajian" icon={<CurrencyDollarIcon className="h-5 w-5"/>} />
                            <NavButton viewName="requests" label="Permohonan" icon={<BellAlertIcon className="h-5 w-5"/>} badge={pendingRequestsCount} />
                            <NavButton viewName="organization" label="Pengaturan Organisasi" icon={<Cog6ToothIcon className="h-5 w-5"/>} />
                            <NavButton viewName="system" label="Pengaturan Sistem" icon={<Cog6ToothIcon className="h-5 w-5"/>} />
                        </>
                    )}
                    {(isHrRole(authUser.profile.role) || isKepalaRuanganRole(authUser.profile.role)) && (
                        <>
                            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                                {isHrRole(authUser.profile.role) ? 'HRD' : 'Kepala Ruangan'}
                            </p>
                            <NavButton viewName="dashboard" label="Dashboard" icon={<UserGroupIcon className="h-5 w-5"/>} />
                            <NavButton viewName="attendance" label="Kehadiran" icon={<ClockIcon className="h-5 w-5"/>} />
                            {isKepalaRuanganRole(authUser.profile.role) && (
                                <NavButton viewName="unit-schedule" label="Jadwal Unit" icon={<ClockIcon className="h-5 w-5"/>} />
                            )}
                            {isHrRole(authUser.profile.role) && (
                                <>
                                    <NavButton viewName="requests" label="Permohonan" icon={<BellAlertIcon className="h-5 w-5"/>} badge={pendingRequestsCount} />
                                    <NavButton viewName="payroll" label="Penggajian" icon={<CurrencyDollarIcon className="h-5 w-5"/>} />
                                </>
                            )}
                        </>
                    )}
                    <p className="px-4 pt-6 py-2 text-xs font-semibold text-gray-400 uppercase">Karyawan</p>
                    <NavButton viewName="personal-dashboard" label="Dashboard Pribadi" icon={<UserCircleIcon className="h-5 w-5"/>} />
                    <NavButton viewName="ess" label="Self-Service" icon={<UserCircleIcon className="h-5 w-5"/>} />
                </nav>
                <div className="mt-auto">
                    <div className="text-center text-xs text-gray-500 mb-2 p-2 border-t">
                        <p className="font-semibold">{authUser.profile.nama}</p>
                        <p>{authUser.email}</p>
                    </div>
                    <button 
                        onClick={() => setIsChangePasswordOpen(true)} 
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a] mb-2 transition-colors"
                        disabled={isLoggingOut}
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span>Ubah Password</span>
                    </button>
                    {isAdminRole(authUser.profile.role) && (
                        <button 
                            onClick={() => setView('audit-log')}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#e6f3f2] hover:text-[#06736a] mb-2 transition-colors"
                            disabled={isLoggingOut}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>History Aktivitas</span>
                        </button>
                    )}
                    <button 
                        onClick={handleLogout} 
                        disabled={isLoggingOut}
                        className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                            isLoggingOut 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                        }`}
                    >
                        {isLoggingOut ? (
                            <>
                                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Logging out...</span>
                            </>
                        ) : (
                            <>
                                <ArrowLeftOnRectangleIcon className="h-5 w-5"/>
                                <span>Logout</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            <main className="ml-64 flex-1 p-8">
                 <header className="flex justify-between items-center mb-8">
                     {isAdminRole(authUser.profile.role) && view === 'employees' ? (
                        <div className="flex-1 max-w-lg">
                            <input
                                type="text"
                                placeholder="Cari nama karyawan..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
                            />
                        </div>
                    ) : <div />}
                     {isAdminRole(authUser.profile.role) && view === 'employees' && (
                        <button onClick={() => { setEmployeeToEdit(null); setIsFormOpen(true); }} className="bg-[#06736a] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#054f46] transition-colors">
                            + Tambah Karyawan
                        </button>
                    )}
                </header>
                
                {/* Data loading indicator */}
                {dataLoading && (
                    <div className="mb-4 bg-[#e6f3f2] border border-[#06736a] rounded-lg p-3 flex items-center">
                        <LoadingSpinner size="small" text="" />
                        <span className="ml-2 text-[#06736a] text-sm">Memperbarui data...</span>
                    </div>
                )}

                {successMessage && authUser && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="status">
                        <strong className="font-bold">Berhasil:</strong>
                        <span className="block sm:inline"> {successMessage}</span>
                    </div>
                )}
                
                {/* Global error display for initialization errors */}
                {appError && authUser && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline"> {appError}</span>
                    </div>
                )}
                {renderView()}
            </main>

            <EmployeeForm 
                isOpen={isFormOpen} 
                onClose={() => { 
                    setIsFormOpen(false); 
                    setEmployeeToEdit(null); // Reset saat close tanpa save
                }} 
                onSave={handleSaveEmployee} 
                employeeToEdit={employeeToEdit} 
                workUnits={workUnits}
                departments={departments}
                positions={positions}
                currentUserRole={authUser.profile.role}
            />
            {employeeToView && isDetailOpen && (
                 <EmployeeDetail 
                    isOpen={isDetailOpen} 
                    onClose={() => setIsDetailOpen(false)} 
                    employee={employeeToView} 
                    workUnit={employeeToView.unitKerjaId ? workUnits.find(w => w.id === employeeToView.unitKerjaId) : undefined} 
                    attendanceRecords={attendanceRecords.filter(r => r.employeeId === employeeToView.id)} 
                    onOpenAttendanceDetail={() => {
                        setIsDetailOpen(false);
                        setView('employee-attendance-detail');
                    }}
                 />
            )}

            {/* Change Password Modal - Available for ALL users (admin & employee) */}
            <ChangePassword isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
            
        </div>
        </Suspense>
    );
};

const AppWithErrorBoundary: React.FC = () => {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
};

export default AppWithErrorBoundary;

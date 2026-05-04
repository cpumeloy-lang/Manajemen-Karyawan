/**
 * useViewRenderer.tsx
 * Centralized view rendering for the main app shell.
 */

import React from 'react';
import type {
  Employee,
  View,
  AuthenticatedUser,
  AttendanceRecord,
  AllRequest,
  WorkUnit,
  Department,
  Position,
  SystemSettings,
  SortKey,
  AttendanceChangeRequest,
  AttendanceRevisionHistory,
  ShiftDefinition,
} from '../types';
import type { RequestType, RequestStatus } from '../types';
import { DEFAULT_SHIFT_DEFINITIONS } from '../types';

import {
  renderDashboard,
  renderEmployeeAttendanceDetail,
  renderEmployeeSelfService,
} from './viewRendererHelpers.tsx';

const Dashboard = React.lazy(() => import('../components/Dashboard'));
const EmployeeTable = React.lazy(() => import('../components/EmployeeTable'));
const OrganizationSettings = React.lazy(() => import('../components/OrganizationSettings'));
const SystemSettings = React.lazy(() => import('../components/SystemSettings'));
const HikvisionPanel = React.lazy(() => import('../components/HikvisionPanel'));
const GuidePanel = React.lazy(() => import('../components/GuidePanel'));
const AttendanceManagement = React.lazy(() => import('../components/AttendanceManagement'));
const PayrollManagement = React.lazy(() => import('../components/PayrollManagement'));
const RequestManagement = React.lazy(() => import('../components/RequestManagement'));
const UnitScheduleManagement = React.lazy(() => import('../components/UnitScheduleManagement'));
const AuditLogViewer = React.lazy(() => import('../components/AuditLogViewer'));

interface ViewRendererProps {
  effectiveView: View;
  authUser: AuthenticatedUser;
  employees: Employee[];
  employeesWithDocuments: Employee[];
  sortedAndFilteredEmployees: Employee[];
  attendanceRecords: AttendanceRecord[];
  allRequests: AllRequest[];
  workUnits: WorkUnit[];
  departments: Department[];
  positions: Position[];
  systemSettings: SystemSettings | null;
  dataLoading: boolean;
  sortKey: SortKey | string;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => Promise<void> | void;
  onView: (emp: Employee) => void;
  onNavigateToEmployeeAttendanceDetail: (emp: Employee) => void;
  onImport: (importedData?: any[]) => Promise<void> | void;
  handleSaveWorkUnit: (wu: unknown) => void;
  handleDeleteWorkUnit: (wu: unknown) => void;
  handleSaveDepartment: (dept: unknown) => void;
  handleDeleteDepartment: (dept: unknown) => void;
  handleSavePosition: (pos: unknown) => void;
  handleDeletePosition: (pos: unknown) => void;
  handleUpdateSystemSettings: (settings: unknown) => void;
  handleSaveOperationalAttendance: (record: unknown) => Promise<boolean> | void;
  loadPendingAttendanceChangeRequests: () => Promise<AttendanceChangeRequest[]> | void;
  loadAttendanceRevisionHistory: () => Promise<AttendanceRevisionHistory[]> | void;
  handleApproveAttendanceChangeRequest: (requestId: string, note?: string) => Promise<boolean> | void;
  handleRejectAttendanceChangeRequest: (requestId: string, note?: string) => Promise<boolean> | void;
  handleUpdateRequestStatus: (requestId: string, type: RequestType | string, newStatus: RequestStatus | string) => Promise<void> | void;
  handleNewRequest: (request: unknown) => void;
  handleSavePersonalAttendance: (record: unknown) => Promise<boolean> | void;
  onBackFromEmployeeAttendanceDetail: () => void;
  employeeToView: Employee | null;
  isAdminRole: (role: string) => boolean;
  isKepalaRuanganRole: (role: string) => boolean;
  isHrRole: (role: string) => boolean;
  onNavigate?: (view: View) => void;
  essDefaultTab?: 'overview' | 'attendance';
  setEssDefaultTab?: (tab: 'overview' | 'attendance') => void;
}

export const renderViewContent = (props: ViewRendererProps): React.ReactNode => {
  const {
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
    onSort,
    onEdit,
    onDelete,
    onView,
    onImport,
    onNavigateToEmployeeAttendanceDetail,
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
    onBackFromEmployeeAttendanceDetail,
    employeeToView,
    isAdminRole,
    isKepalaRuanganRole,
    isHrRole,
    onNavigate,
    essDefaultTab,
    setEssDefaultTab,
  } = props;

  switch (effectiveView) {
    case 'employees':
      return (
        <EmployeeTable
          employees={sortedAndFilteredEmployees}
          workUnits={workUnits}
          onEdit={onEdit as any}
          onDelete={onDelete as any}
          onView={onView as any}
          onImport={onImport as any}
          sortKey={sortKey as any}
          sortDirection={sortDirection}
          onSort={onSort}
          isViewOnly={isKepalaRuanganRole(authUser?.profile?.role)}
        />
      );

    case 'organization':
      return (
        <OrganizationSettings
          workUnits={workUnits}
          departments={departments}
          positions={positions}
          onSaveWorkUnit={handleSaveWorkUnit}
          onDeleteWorkUnit={handleDeleteWorkUnit}
          onSaveDepartment={handleSaveDepartment}
          onDeleteDepartment={handleDeleteDepartment}
          onSavePosition={handleSavePosition}
          onDeletePosition={handleDeletePosition}
        />
      );

    case 'system':
      return (
        <div className="space-y-6">
          <SystemSettings settings={systemSettings} onUpdate={handleUpdateSystemSettings as any} loading={dataLoading} />
          <HikvisionPanel />
        </div>
      );

    case 'attendance':
      return (
        <AttendanceManagement
          employees={employees}
          attendanceRecords={attendanceRecords}
          onSave={handleSaveOperationalAttendance as any}
          canManageAttendance={true}
          canApproveAttendanceRequests={true}
          currentUserId={authUser.id}
          onLoadPendingRequests={loadPendingAttendanceChangeRequests as any}
          onLoadRevisionHistory={loadAttendanceRevisionHistory as any}
          onApproveRequest={handleApproveAttendanceChangeRequest as any}
          onRejectRequest={handleRejectAttendanceChangeRequest as any}
          onOpenEmployeeHistory={onNavigateToEmployeeAttendanceDetail}
        />
      );

    case 'attendance-report':
      return (
        <AttendanceManagement
          employees={employees}
          attendanceRecords={attendanceRecords}
          onSave={handleSaveOperationalAttendance as any}
          canManageAttendance={true}
          canApproveAttendanceRequests={true}
          currentUserId={authUser.id}
          onLoadPendingRequests={loadPendingAttendanceChangeRequests as any}
          onLoadRevisionHistory={loadAttendanceRevisionHistory as any}
          onApproveRequest={handleApproveAttendanceChangeRequest as any}
          onRejectRequest={handleRejectAttendanceChangeRequest as any}
          onOpenEmployeeHistory={onNavigateToEmployeeAttendanceDetail}
          isReportMode={true}
          shiftDefinitions={(() => {
            // Merge: system settings + all unit-specific shift definitions (deduplicated by name)
            const base: ShiftDefinition[] = (systemSettings?.default_shifts?.length)
              ? systemSettings.default_shifts
              : DEFAULT_SHIFT_DEFINITIONS;
            const names = new Set(base.map(s => s.name));
            const extra: ShiftDefinition[] = [];
            workUnits.forEach(u => {
              ((u as any).shifts as ShiftDefinition[] | undefined || []).forEach(s => {
                if (!names.has(s.name)) { names.add(s.name); extra.push(s); }
              });
            });
            return [...base, ...extra];
          })()}
        />
      );

    case 'payroll':
      return <PayrollManagement employees={employees} attendanceRecords={attendanceRecords} />;

    case 'requests':
      return <RequestManagement allRequests={allRequests} employees={employees} onUpdateRequestStatus={handleUpdateRequestStatus} />;

    case 'audit-log':
      return isAdminRole(authUser.profile.role) ? <AuditLogViewer isInline /> : null;

    case 'guide':
      return <GuidePanel />;

    case 'unit-schedule':
      return isKepalaRuanganRole(authUser.profile.role) ? <UnitScheduleManagement kepalaRuangan={authUser.profile} /> : null;

    case 'ess': {
      return renderEmployeeSelfService(
        authUser,
        employeesWithDocuments,
        attendanceRecords,
        allRequests,
        handleNewRequest,
        handleSavePersonalAttendance,
        onEdit,
        essDefaultTab,
        onNavigate
      );
    }

    case 'personal-dashboard':
      return <Dashboard employees={employees} currentUser={authUser.profile} onNavigate={(view, tab) => {
        if (view === 'ess' && onNavigate) {
          if (tab && setEssDefaultTab) setEssDefaultTab(tab);
          onNavigate('ess' as View);
        }
      }} />;

    case 'employee-attendance-detail':
      return renderEmployeeAttendanceDetail(employeeToView, attendanceRecords, workUnits, loadAttendanceRevisionHistory as any, onBackFromEmployeeAttendanceDetail);

    case 'dashboard':
    default:
      return renderDashboard(authUser, employees, attendanceRecords, allRequests, isAdminRole, isHrRole, isKepalaRuanganRole, onNavigate);
  }
};

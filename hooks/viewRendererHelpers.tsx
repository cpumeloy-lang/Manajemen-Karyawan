import React from 'react';
import { RequestType } from '../types';
import type {
  Employee,
  AuthenticatedUser,
  AttendanceRecord,
  AllRequest,
  WorkUnit,
  LeaveRequest,
  ReimbursementRequest,
  View,
  AttendanceRevisionHistory,
} from '../types';

const Dashboard = React.lazy(() => import('../components/Dashboard'));
const HRDashboard = React.lazy(() => import('../components/HRDashboard'));
const KepalaRuanganDashboard = React.lazy(() => import('../components/KepalaRuanganDashboard'));
const EmployeeAttendanceDetail = React.lazy(() => import('../components/EmployeeAttendanceDetail'));
const EmployeeSelfService = React.lazy(() => import('../components/EmployeeSelfService'));

export const getCurrentEmployee = (
  authUser: AuthenticatedUser,
  employeesWithDocuments: Employee[]
): Employee => {
  return employeesWithDocuments.find((employee) => employee.id === authUser.profile.id) || authUser.profile;
};

export const getEmployeeRequests = (
  authUser: AuthenticatedUser,
  allRequests: AllRequest[]
) => {
  return {
    leaveRequests: allRequests.filter(
      (request) => request.employeeId === authUser.profile.id && request.type === RequestType.Cuti
    ) as LeaveRequest[],
    reimbursementRequests: allRequests.filter(
      (request) =>
        request.employeeId === authUser.profile.id && request.type === RequestType.Reimbursement
    ) as ReimbursementRequest[],
  };
};

export const renderDashboard = (
  authUser: AuthenticatedUser,
  employees: Employee[],
  attendanceRecords: AttendanceRecord[],
  allRequests: AllRequest[],
  isAdminRole: (role: string) => boolean,
  isHrRole: (role: string) => boolean,
  isKepalaRuanganRole: (role: string) => boolean,
  onNavigate?: (view: View) => void
) => {
  if (isKepalaRuanganRole(authUser.profile.role)) {
    return (
      <KepalaRuanganDashboard
        kepalaRuangan={authUser.profile}
        onNavigate={(view) => onNavigate?.(view as View)}
      />
    );
  }

  if (isHrRole(authUser.profile.role) || isAdminRole(authUser.profile.role)) {
    return (
      <HRDashboard
        currentUser={authUser.profile}
        employees={employees}
        attendanceRecords={attendanceRecords}
        allRequests={allRequests}
        onNavigate={(view) => onNavigate?.(view as View)}
      />
    );
  }

  return (
    <Dashboard
      employees={employees}
      currentUser={authUser.profile}
      onNavigate={(view, tab) => {
        void tab;
        onNavigate?.(view as View);
      }}
    />
  );
};

export const renderEmployeeAttendanceDetail = (
  employeeToView: Employee | null,
  attendanceRecords: AttendanceRecord[],
  workUnits: WorkUnit[],
  onLoadRevisionHistory: () => Promise<AttendanceRevisionHistory[]>,
  onBack: () => void
) => {
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
      workUnit={
        employeeToView.unitKerjaId
          ? workUnits.find((workUnit) => workUnit.id === employeeToView.unitKerjaId)
          : undefined
      }
      onLoadRevisionHistory={onLoadRevisionHistory}
      onBack={onBack}
    />
  );
};

export const renderEmployeeSelfService = (
  authUser: AuthenticatedUser,
  employeesWithDocuments: Employee[],
  attendanceRecords: AttendanceRecord[],
  allRequests: AllRequest[],
  handleNewRequest: (request: unknown) => void,
  handleSavePersonalAttendance: (record: unknown) => void,
  onEditProfile: (employee: Employee) => void,
  essDefaultTab?: 'overview' | 'attendance',
  onNavigate?: (view: View) => void
) => {
  const currentEmployee = getCurrentEmployee(authUser, employeesWithDocuments);
  const { leaveRequests, reimbursementRequests } = getEmployeeRequests(authUser, allRequests);

  return (
    <EmployeeSelfService
      user={currentEmployee}
      attendanceRecords={attendanceRecords.filter((record) => record.employeeId === authUser.profile.id)}
      leaveRequests={leaveRequests}
      reimbursementRequests={reimbursementRequests}
      onNewRequest={handleNewRequest}
      onSaveAttendance={handleSavePersonalAttendance as any}
      defaultTab={essDefaultTab || 'overview'}
      onBackToDashboard={() => onNavigate?.('personal-dashboard' as View)}
      onEditProfile={onEditProfile as any}
    />
  );
};
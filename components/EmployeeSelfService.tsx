/**
 * EmployeeSelfService.tsx - REFACTORED
 * 
 * Employee Self-Service portal - now acts as a thin orchestrator.
 * All business logic extracted into custom hooks and sub-components.
 * 
 * Previous: ~736 lines, mixed concerns (attendance logic, data computation, UI)
 * Current:  ~180 lines, focused on composition and tab routing
 * 
 * Architecture:
 * EmployeeSelfService.tsx → Tab routing & composition
 * ├─ useESSAttendance.ts  → Check-in/out, verification, geofence
 * ├─ useESSData.ts        → Attendance filters, kinerja analytics, payslip
 * ├─ ESSOverviewTab.tsx   → Overview dashboard tab
 * ├─ ESSRiwayatAbsensiTab.tsx → Attendance history tab
 * ├─ ESSKinerjaTab.tsx    → Performance analytics tab
 * ├─ ESSProfileTab.tsx    → Profile management tab
 * └─ ESSRequestModal.tsx  → Leave/reimbursement request modal
 */
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Employee, LeaveRequest, ReimbursementRequest, AttendanceRecord, RequestType, Payslip, AllRequest, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';
import { useAppData } from '../stores/appStore';
import PayslipDetail from './PayslipDetail.tsx';
const FaceEnrollmentModal = lazy(() => import('./FaceEnrollmentModal.tsx'));
const AttendanceVerificationFlow = lazy(() => import('./AttendanceVerificationFlow.tsx'));

// Hooks
import { useESSAttendance } from '../hooks/useESSAttendance';
import { useESSData } from '../hooks/useESSData';

// Sub-components
import ESSOverviewTab from './employee-self-service/ESSOverviewTab';
import ESSRiwayatAbsensiTab from './employee-self-service/ESSRiwayatAbsensiTab';
import ESSKinerjaTab from './employee-self-service/ESSKinerjaTab';
import ESSProfileTab from './employee-self-service/ESSProfileTab';
import ESSRequestModal from './employee-self-service/ESSRequestModal';

interface EmployeeSelfServiceProps {
    user: Employee;
    attendanceRecords: AttendanceRecord[];
    leaveRequests: LeaveRequest[];
    reimbursementRequests: ReimbursementRequest[];
    onNewRequest: (request: Omit<AllRequest, 'id' | 'status' | 'requestedAt'>) => void;
    onSaveAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    defaultTab?: 'overview' | 'attendance' | 'profile' | 'kinerja';
    onBackToDashboard?: () => void;
    onEditProfile?: () => void;
}

const EmployeeSelfService: React.FC<EmployeeSelfServiceProps> = ({ user, attendanceRecords, leaveRequests, reimbursementRequests, onNewRequest, onSaveAttendance, defaultTab = 'overview', onBackToDashboard, onEditProfile }) => {
    const { systemSettings } = useAppData();
    const activeShiftDefs = (systemSettings?.default_shifts && systemSettings.default_shifts.length > 0)
        ? systemSettings.default_shifts
        : DEFAULT_SHIFT_DEFINITIONS;

    // Tab state
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'profile' | 'kinerja'>(() => defaultTab ?? 'overview');
    useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

    // Modal state
    const [isPayslipDetailOpen, setIsPayslipDetailOpen] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestType, setRequestType] = useState<RequestType>(RequestType.Cuti);

    // Hooks — all business logic
    const attendance = useESSAttendance({ user, attendanceRecords, onSaveAttendance, activeShiftDefs });
    const data = useESSData({ user, attendanceRecords, systemSettings });

    // Modal helpers
    const openPayslip = (payslip: Payslip) => { setSelectedPayslip(payslip); setIsPayslipDetailOpen(true); };
    const openRequestModal = (type: RequestType) => { setRequestType(type); setIsRequestModalOpen(true); };

    // Tab config
    const tabs = [
        { key: 'overview' as const, label: '📋 Overview' },
        { key: 'kinerja' as const, label: '📊 Kinerja Saya' },
        { key: 'profile' as const, label: '👤 Profil Saya' },
        { key: 'attendance' as const, label: '📅 Riwayat Absensi' },
    ];

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Back Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {onBackToDashboard && (
                    <button onClick={onBackToDashboard} className="inline-flex items-center gap-2 text-[#06736a] hover:text-[#089c8e] font-medium transition-colors group self-start">
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Kembali ke Dashboard
                    </button>
                )}
                <nav className="text-xs sm:text-sm text-gray-500 w-full sm:w-auto overflow-x-auto">
                    <ol className="flex items-center gap-2 whitespace-nowrap sm:justify-end">
                        <li>Dashboard</li><li>/</li>
                        <li className="text-[#06736a] font-medium">Self Service</li>
                        {activeTab === 'attendance' && (<><li>/</li><li className="text-[#06736a] font-medium">Riwayat Absensi</li></>)}
                    </ol>
                </nav>
            </div>

            {/* Profile Card */}
            <div className="rounded-2xl bg-white p-4 shadow-md sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <img className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#e6f3f2] sm:h-24 sm:w-24 sm:rounded-full" src={user.foto} alt={user.nama} />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Portal Karyawan</p>
                        <h2 className="mt-1 text-2xl font-bold text-primary break-words sm:text-3xl">{user.nama}</h2>
                        <p className="mt-1 text-sm text-gray-600 sm:text-base">{user.jabatan} - {user.departemen}</p>
                        <p className="mt-1 text-sm text-gray-500 break-all">{user.email}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="rounded-2xl bg-white shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="grid grid-cols-4 gap-1 p-1 sm:flex sm:-mb-px sm:min-w-max sm:p-0">
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:rounded-none sm:px-6 sm:py-4 sm:text-sm sm:border-b-2 sm:whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'bg-[#e6f3f2] text-[#06736a] sm:bg-transparent sm:border-[#06736a]'
                                        : 'bg-gray-50 text-gray-500 hover:text-gray-700 sm:bg-transparent sm:border-transparent sm:hover:border-gray-300'
                                }`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'kinerja' && (
                    <ESSKinerjaTab overallKinerja={data.overallKinerja} kinerjaTrendData={data.kinerjaTrendData} monthlyKinerjaSummary={data.monthlyKinerjaSummary} leaveRequests={leaveRequests} sisaCuti={user.sisaCuti} />
                )}

                <div className="p-4 sm:p-6">
                    {activeTab === 'overview' && (
                        <ESSOverviewTab user={user} todaysRecord={attendance.todaysRecord} pendingCheckIn={attendance.pendingCheckIn} todaySchedule={attendance.todaySchedule} activeShiftDefs={activeShiftDefs}
                            isGeofenceConfigured={attendance.isGeofenceConfigured} officeRadiusMeters={attendance.officeRadiusMeters} attendanceActionError={attendance.attendanceActionError}
                            handleCheckInClick={attendance.handleCheckInClick} handleCheckOutClick={attendance.handleCheckOutClick} isAttendanceSubmitting={attendance.isAttendanceSubmitting}
                            setActiveTab={setActiveTab} attendanceSummary={data.attendanceSummary} openRequestModal={openRequestModal}
                            leaveRequests={leaveRequests} reimbursementRequests={reimbursementRequests} payslipHistory={data.payslipHistory}
                            openPayslip={openPayslip} formatDate={data.formatDate} formatMoney={data.formatMoney} />
                    )}
                    {activeTab === 'attendance' && (
                        <ESSRiwayatAbsensiTab attendanceMonthFilter={data.attendanceMonthFilter} setAttendanceMonthFilter={data.setAttendanceMonthFilter}
                            attendanceMonths={data.attendanceMonths} attendanceDateFilter={data.attendanceDateFilter} setAttendanceDateFilter={data.setAttendanceDateFilter}
                            attendanceSummary={data.attendanceSummary} todaysRecord={attendance.todaysRecord} pendingCheckIn={attendance.pendingCheckIn}
                            isLanMode={attendance.isLanMode} isGeofenceConfigured={attendance.isGeofenceConfigured} officeRadiusMeters={attendance.officeRadiusMeters}
                            handleCheckOutClick={attendance.handleCheckOutClick} isAttendanceSubmitting={attendance.isAttendanceSubmitting}
                            handleCheckInClick={attendance.handleCheckInClick} attendanceActionError={attendance.attendanceActionError}
                            filteredAttendanceRecords={data.filteredAttendanceRecords} formatDate={data.formatDate} />
                    )}
                    {activeTab === 'profile' && (
                        <ESSProfileTab user={user} onEditProfile={onEditProfile} setIsFaceEnrollmentOpen={attendance.setIsFaceEnrollmentOpen} />
                    )}
                </div>
            </div>

            {/* Modals */}
            <PayslipDetail isOpen={isPayslipDetailOpen} onClose={() => setIsPayslipDetailOpen(false)} payslip={selectedPayslip} employee={user} />
            <ESSRequestModal isOpen={isRequestModalOpen} requestType={requestType} onClose={() => setIsRequestModalOpen(false)} onSubmit={onNewRequest} employeeId={user.id} />

            <Suspense fallback={null}>
                {attendance.isVerificationFlowOpen && (
                    <AttendanceVerificationFlow isOpen={attendance.isVerificationFlowOpen} onClose={() => attendance.setIsVerificationFlowOpen(false)}
                        onSuccess={attendance.handleVerificationSuccess} employee={{ id: user.id, name: user.nama }} actionType={attendance.verificationActionType}
                        isGeofenceEnabled={attendance.isGeofenceConfigured} officeLocation={{ lat: attendance.officeLat, lng: attendance.officeLng }} officeRadius={attendance.officeRadiusMeters} />
                )}
                {attendance.isFaceEnrollmentOpen && (
                    <FaceEnrollmentModal isOpen={attendance.isFaceEnrollmentOpen} onClose={() => attendance.setIsFaceEnrollmentOpen(false)}
                        employeeId={user.id} employeeName={user.nama}
                        onEnrolled={() => { attendance.setFaceEnrolled(true); attendance.setAttendanceActionError(null); }} />
                )}
            </Suspense>
        </div>
    );
};

export default EmployeeSelfService;
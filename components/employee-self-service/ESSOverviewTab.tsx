import React from 'react';
import { Employee, LeaveRequest, ReimbursementRequest, RequestType, RequestStatus, Payslip, EmployeeSchedule, ShiftDefinition, AttendanceRecord } from '../../types';
import { CalendarDaysIcon, ClipboardDocumentListIcon } from '../icons';

export const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    const statusClasses = {
        [RequestStatus.Pending]: "bg-yellow-100 text-yellow-800",
        [RequestStatus.Approved]: "bg-green-100 text-green-800",
        [RequestStatus.Rejected]: "bg-red-100 text-red-800",
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
};

interface ESSOverviewTabProps {
    user: Employee;
    todaysRecord: AttendanceRecord | null;
    pendingCheckIn: { tanggal: string; clockIn: string; location: string; latitude?: number; longitude?: number } | null;
    todaySchedule: EmployeeSchedule | null;
    activeShiftDefs: ShiftDefinition[];
    isGeofenceConfigured: boolean;
    officeRadiusMeters: number;
    attendanceActionError: string | null;
    handleCheckInClick: () => void;
    handleCheckOutClick: () => void;
    isAttendanceSubmitting: boolean;
    setActiveTab: (tab: 'overview' | 'attendance' | 'profile' | 'kinerja') => void;
    attendanceSummary: { total: number; lateCount: number; onTimeCount: number; totalOvertime: number; lateRate: number; onTimeRate: number };
    openRequestModal: (type: RequestType) => void;
    leaveRequests: LeaveRequest[];
    reimbursementRequests: ReimbursementRequest[];
    payslipHistory: { period: string, payslip: Payslip }[];
    openPayslip: (payslip: Payslip) => void;
    formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
    formatMoney: (value: number) => string;
}

const ESSOverviewTab: React.FC<ESSOverviewTabProps> = ({
    user,
    todaysRecord,
    pendingCheckIn,
    todaySchedule,
    activeShiftDefs,
    isGeofenceConfigured,
    officeRadiusMeters,
    attendanceActionError,
    handleCheckInClick,
    handleCheckOutClick,
    isAttendanceSubmitting,
    setActiveTab,
    attendanceSummary,
    openRequestModal,
    leaveRequests,
    reimbursementRequests,
    payslipHistory,
    openPayslip,
    formatDate,
    formatMoney
}) => {
    const getTodayDate = () => new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* ══ HERO: CHECK-IN / CHECK-OUT ══ */}
            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-lg ${todaysRecord?.clockOut
                    ? 'bg-gradient-to-br from-[#06736a] to-[#04504a]'
                    : pendingCheckIn?.tanggal === getTodayDate()
                        ? 'bg-gradient-to-br from-[#0891b2] to-[#0e7490]'
                        : 'bg-gradient-to-br from-[#1e293b] to-[#334155]'
                }`}>
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white"></div>
                    <div className="absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white"></div>
                </div>

                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Status & Info */}
                    <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white leading-tight">
                            {todaysRecord?.clockOut
                                ? '✅ Shift Selesai'
                                : pendingCheckIn?.tanggal === getTodayDate()
                                    ? '🟢 Sedang Bertugas'
                                    : '⏰ Belum Check-In'}
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Shift <span className="font-semibold text-white">{todaySchedule?.shift_name || user.shift}</span>
                            {(() => {
                                if (todaySchedule && !todaySchedule.is_off_day) {
                                    return ` · Jam masuk: ${todaySchedule.shift_start_time || '?'}`;
                                }
                                if (todaySchedule?.is_off_day) return ' · Hari Libur';
                                const sDef = activeShiftDefs.find(s => s.name === user.shift);
                                return sDef ? ` · Jam masuk: ${sDef.startTime}` : '';
                            })()}
                        </p>

                        {/* Time badges */}
                        <div className="mt-4 flex flex-wrap gap-3">
                            {(todaysRecord || pendingCheckIn?.tanggal === getTodayDate()) && (
                                <div className="rounded-2xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Check In</p>
                                    <p className="text-xl font-black text-white">{todaysRecord?.clockIn || pendingCheckIn?.clockIn}</p>
                                </div>
                            )}
                            {todaysRecord?.clockOut && (
                                <div className="rounded-2xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Check Out</p>
                                    <p className="text-xl font-black text-white">{todaysRecord.clockOut}</p>
                                </div>
                            )}
                            {todaysRecord?.overtimeHours && todaysRecord.overtimeHours > 0 && (
                                <div className="rounded-2xl px-4 py-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>Lembur</p>
                                    <p className="text-xl font-black text-white">{todaysRecord.overtimeHours}j</p>
                                </div>
                            )}
                        </div>

                        {isGeofenceConfigured && (
                            <p className="mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>📍 Geo-fencing aktif · radius {officeRadiusMeters}m</p>
                        )}
                        {attendanceActionError && (
                            <p className="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200">{attendanceActionError}</p>
                        )}
                    </div>

                    {/* Right: Action Button */}
                    <div className="flex flex-col gap-3 sm:items-end">
                        {!todaysRecord?.clockOut && (
                            <>
                                {pendingCheckIn?.tanggal === getTodayDate() ? (
                                    <button
                                        type="button"
                                        onClick={handleCheckOutClick}
                                        disabled={isAttendanceSubmitting}
                                        className="group flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#0891b2] shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {isAttendanceSubmitting ? (
                                            <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Menyimpan...</span>
                                        ) : (
                                            <><span className="text-xl">📷</span> Check Out Sekarang</>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleCheckInClick}
                                        disabled={isAttendanceSubmitting}
                                        className="group flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#1e293b] shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {isAttendanceSubmitting ? (
                                            <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Memproses...</span>
                                        ) : (
                                            <><span className="text-xl">📷</span> Check In Sekarang</>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('attendance')}
                                    className="text-xs transition-colors text-center" style={{ color: 'rgba(255,255,255,0.5)' }}
                                >
                                    Lihat riwayat absensi →
                                </button>
                            </>
                        )}
                        {todaysRecord?.clockOut && (
                            <div className="text-center">
                                <p className="text-white/60 text-sm">Durasi kerja</p>
                                <p className="text-white font-black text-2xl">
                                    {(() => {
                                        const [ih, im] = (todaysRecord.clockIn || '00:00').split(':').map(Number);
                                        const [oh, om] = (todaysRecord.clockOut || '00:00').split(':').map(Number);
                                        const dur = (oh * 60 + om) - (ih * 60 + im);
                                        return `${Math.floor(Math.max(0, dur) / 60)}j ${Math.max(0, dur) % 60}m`;
                                    })()}
                                </p>
                                <button
                                    onClick={() => setActiveTab('attendance')}
                                    className="mt-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                                >
                                    Lihat riwayat →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ STATS RINGKAS ══ */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-[#06736a]">{attendanceSummary.total}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Hadir</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
                    <p className={`text-2xl font-black ${attendanceSummary.onTimeRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{attendanceSummary.onTimeRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">Tepat Waktu</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
                    <p className={`text-2xl font-black ${attendanceSummary.lateCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{attendanceSummary.lateCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Kali Terlambat</p>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-black text-blue-600">{user.sisaCuti ?? 12}</p>
                    <p className="text-xs text-gray-500 mt-1">Sisa Cuti</p>
                </div>
            </div>

            {/* ══ KONTEN BAWAH: AKSI + PERMOHONAN + SLIP GAJI ══ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Aksi Cepat */}
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Aksi Cepat</p>
                    <div className="space-y-2">
                        <button onClick={() => openRequestModal(RequestType.Cuti)} className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                            <CalendarDaysIcon className="w-5 h-5 flex-shrink-0" />
                            Ajukan Cuti
                        </button>
                        <button onClick={() => openRequestModal(RequestType.Reimbursement)} className="flex w-full items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-700 transition hover:bg-green-100">
                            <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0" />
                            Klaim Reimbursement
                        </button>
                        <button onClick={() => setActiveTab('kinerja')} className="flex w-full items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-left text-sm font-semibold text-purple-700 transition hover:bg-purple-100">
                            <span className="text-base flex-shrink-0">📊</span>
                            Lihat Kinerja Saya
                        </button>
                        <button onClick={() => setActiveTab('attendance')} className="flex w-full items-center gap-3 rounded-xl bg-gray-100 px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-200">
                            <span className="text-base flex-shrink-0">📅</span>
                            Riwayat Absensi
                        </button>
                        {todaySchedule && (
                            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
                                {todaySchedule.is_off_day ? (
                                    <>
                                        <span className="text-gray-500">Hari Ini: </span>
                                        <span className="font-bold text-gray-400">💤 Libur</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-gray-500">Jadwal Hari Ini: </span>
                                        <span className="font-bold text-[#06736a]">{todaySchedule.shift_name}</span>
                                        {todaySchedule.shift_start_time && (
                                            <span className="text-gray-400 ml-1">({todaySchedule.shift_start_time})</span>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {!todaySchedule && user.shift && (
                            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
                                <span className="text-gray-500">Jadwal Shift: </span>
                                <span className="font-bold text-[#06736a]">{user.shift}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Permohonan */}
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Status Permohonan Saya</p>
                    {[...leaveRequests, ...reimbursementRequests].length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-400">
                            <p className="text-2xl mb-1">📋</p>
                            <p className="text-sm">Belum ada permohonan.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {[...leaveRequests, ...reimbursementRequests]
                                .sort((a, b) => new Date(b.requestedAt) > new Date(a.requestedAt) ? 1 : -1)
                                .map(req => (
                                    <div key={req.id} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-400 uppercase">{req.type}</p>
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {req.type === RequestType.Cuti ? `${formatDate(req.startDate)} - ${formatDate(req.endDate)}` : `Rp ${formatMoney(req.amount)}`}
                                            </p>
                                            <p className="text-xs text-gray-400">{formatDate(req.requestedAt)}</p>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* Slip Gaji */}
                    {payslipHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Slip Gaji Terbaru</p>
                            <div className="space-y-1">
                                {payslipHistory.slice(0, 3).map(item => (
                                    <button key={item.period} onClick={() => openPayslip(item.payslip)}
                                        className="w-full rounded-xl bg-white px-4 py-2.5 text-left text-sm font-medium text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50 flex items-center justify-between">
                                        <span>Slip Gaji — {item.period}</span>
                                        <span className="text-gray-400">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ESSOverviewTab;

import React, { useEffect, useMemo, useState } from 'react';
import { Employee, LeaveRequest, ReimbursementRequest, AttendanceRecord, RequestStatus, RequestType, Payslip, AllRequest } from '../types.ts';
import { calculatePayslip } from '../services/payrollService.ts';
import PayslipDetail from './PayslipDetail.tsx';
import { XMarkIcon, CalendarDaysIcon, ClipboardDocumentListIcon } from './icons.tsx';

interface EmployeeSelfServiceProps {
    user: Employee;
    attendanceRecords: AttendanceRecord[];
    leaveRequests: LeaveRequest[];
    reimbursementRequests: ReimbursementRequest[];
    onNewRequest: (request: Omit<AllRequest, 'id' | 'status' | 'requestedAt'>) => void;
    onSaveAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    defaultTab?: 'overview' | 'attendance' | 'profile';
    onBackToDashboard?: () => void;
    onEditProfile?: () => void; // Callback untuk edit profil karyawan
}

const EmployeeSelfService: React.FC<EmployeeSelfServiceProps> = ({ user, attendanceRecords, leaveRequests, reimbursementRequests, onNewRequest, onSaveAttendance, defaultTab = 'overview', onBackToDashboard, onEditProfile }) => {
    const [isPayslipDetailOpen, setIsPayslipDetailOpen] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestType, setRequestType] = useState<RequestType>(RequestType.Cuti);
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'profile'>(defaultTab);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
    const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);
    const [pendingCheckIn, setPendingCheckIn] = useState<{ tanggal: string; clockIn: string; location: string; latitude?: number; longitude?: number } | null>(null);
    const [isLanMode] = useState(true);

    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const getNowTime = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };
    const pendingStorageKey = `hrms.pending-attendance.${user.id}`;
    const officeLat = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LAT || '0');
    const officeLng = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LNG || '0');
    const officeRadiusMeters = Number(import.meta.env.VITE_ATTENDANCE_RADIUS_METERS || '300');
    const isGeofenceConfigured = Number.isFinite(officeLat) && Number.isFinite(officeLng) && officeLat !== 0 && officeLng !== 0;

    useEffect(() => {
        try {
            const raw = localStorage.getItem(pendingStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.tanggal && parsed?.clockIn) {
                setPendingCheckIn(parsed);
            }
        } catch {
            // Ignore invalid local storage data.
        }
    }, [pendingStorageKey]);

    const persistPendingCheckIn = (value: { tanggal: string; clockIn: string; location: string; latitude?: number; longitude?: number } | null) => {
        setPendingCheckIn(value);
        try {
            if (value) {
                localStorage.setItem(pendingStorageKey, JSON.stringify(value));
            } else {
                localStorage.removeItem(pendingStorageKey);
            }
        } catch {
            // Ignore storage write errors.
        }
    };

    const resolveCurrentLocation = async (): Promise<{ location: string; latitude?: number; longitude?: number }> => {
        if (!('geolocation' in navigator)) {
            return { location: 'Portal Mobile (lokasi tidak tersedia)' };
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = Number(position.coords.latitude.toFixed(6));
                    const longitude = Number(position.coords.longitude.toFixed(6));
                    resolve({
                        location: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                        latitude,
                        longitude,
                    });
                },
                () => {
                    resolve({ location: 'Portal Mobile (lokasi gagal dideteksi)' });
                },
                {
                    enableHighAccuracy: false,
                    timeout: 7000,
                    maximumAge: 30000,
                }
            );
        });
    };

    const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRadians = (deg: number) => (deg * Math.PI) / 180;
        const earthRadius = 6371000;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    };

    const calculateAttendanceSummary = (clockIn: string, clockOut: string) => {
        const shiftStartTimes: Record<'Pagi' | 'Siang' | 'Malam', number> = {
            Pagi: 8,
            Siang: 14,
            Malam: 21,
        };
        const shiftStart = shiftStartTimes[user.shift as 'Pagi' | 'Siang' | 'Malam'] ?? 8;

        const [inHour, inMinute] = clockIn.split(':').map(Number);
        const [outHour, outMinute] = clockOut.split(':').map(Number);

        const isLate = inHour > shiftStart || (inHour === shiftStart && inMinute > 0);

        const inValue = inHour + inMinute / 60;
        let outValue = outHour + outMinute / 60;
        if (outValue < inValue) outValue += 24;

        const overtimeHours = Math.max(0, parseFloat((outValue - inValue - 8).toFixed(2)));
        return { isLate, overtimeHours };
    };

    const todaysRecord = useMemo(() => {
        const today = getTodayDate();
        return attendanceRecords.find((record) => record.tanggal === today) || null;
    }, [attendanceRecords]);

    const handleCheckIn = async () => {
        if (todaysRecord) return;
        setAttendanceActionError(null);
        setIsAttendanceSubmitting(true);
        try {
            const locationData = await resolveCurrentLocation();

            if (isGeofenceConfigured) {
                if (locationData.latitude === undefined || locationData.longitude === undefined) {
                    setAttendanceActionError('Geo-fencing aktif: aktifkan izin lokasi untuk check-in.');
                    return;
                }

                const distance = calculateDistanceMeters(locationData.latitude, locationData.longitude, officeLat, officeLng);
                if (distance > officeRadiusMeters) {
                    setAttendanceActionError(`Anda berada di luar radius absensi (${Math.round(distance)} m). Batas saat ini ${officeRadiusMeters} m dari lokasi kantor.`);
                    return;
                }
            }

            persistPendingCheckIn({
                tanggal: getTodayDate(),
                clockIn: getNowTime(),
                location: locationData.location,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
            });
        } catch {
            setAttendanceActionError('Gagal memproses check-in. Coba lagi.');
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        if (!pendingCheckIn) return;

        setAttendanceActionError(null);
        setIsAttendanceSubmitting(true);
        try {
            if (isLanMode && !navigator.onLine) {
                setAttendanceActionError('Mode LAN aktif: perangkat harus terhubung ke jaringan LAN RS untuk menyimpan check-out.');
                return;
            }

            const clockOut = getNowTime();
            const summary = calculateAttendanceSummary(pendingCheckIn.clockIn, clockOut);

            const success = await onSaveAttendance({
                employeeId: user.id,
                tanggal: pendingCheckIn.tanggal,
                clockIn: pendingCheckIn.clockIn,
                clockOut,
                location: pendingCheckIn.location,
                isLate: summary.isLate,
                overtimeHours: summary.overtimeHours,
            });

            if (success) {
                persistPendingCheckIn(null);
            } else {
                setAttendanceActionError('Check-out gagal disimpan ke server LAN. Data check-in tetap pending, silakan coba lagi saat jaringan LAN stabil.');
            }
        } catch {
            setAttendanceActionError('Check-out gagal diproses pada mode LAN. Silakan cek koneksi LAN lalu coba lagi.');
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const payslipHistory = useMemo(() => {
        const history: { period: string, payslip: Payslip }[] = [];
        const periods = new Set(attendanceRecords.map(r => new Date(r.tanggal).toISOString().slice(0, 7))); // "YYYY-MM"
        
        periods.forEach(p => {
            const [year, month] = p.split('-').map(Number);
            const periodName = `${new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' })} ${year}`;
            const recordsForPeriod = attendanceRecords.filter(r => r.tanggal.startsWith(p));
            if (recordsForPeriod.length > 0 && user.compensation) {
                const payslip = calculatePayslip(user, recordsForPeriod, periodName);
                history.push({ period: periodName, payslip });
            }
        });
        return history.sort((a,b) => new Date(b.payslip.id.slice(-7)) > new Date(a.payslip.id.slice(-7)) ? 1 : -1);
    }, [attendanceRecords, user]);
    
    const openPayslip = (payslip: Payslip) => {
        setSelectedPayslip(payslip);
        setIsPayslipDetailOpen(true);
    };
    
    const openRequestModal = (type: RequestType) => {
        setRequestType(type);
        setIsRequestModalOpen(true);
    }

    const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) => {
        return new Date(dateStr).toLocaleDateString('id-ID', options);
    };

    const formatMoney = (value: number) => new Intl.NumberFormat('id-ID').format(value);
    
    const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
        const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        const statusClasses = {
            [RequestStatus.Diajukan]: "bg-yellow-100 text-yellow-800",
            [RequestStatus.Disetujui]: "bg-green-100 text-green-800",
            [RequestStatus.Ditolak]: "bg-red-100 text-red-800",
        };
        return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
    };

    const RequestModal: React.FC = () => {
        const [leaveData, setLeaveData] = useState({ startDate: '', endDate: '', reason: ''});
        const [reimbursementData, setReimbursementData] = useState({ date: '', description: '', amount: 0 });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (requestType === RequestType.Cuti) {
                onNewRequest({ ...leaveData, type: RequestType.Cuti, employeeId: user.id });
            } else {
                onNewRequest({ ...reimbursementData, type: RequestType.Reimbursement, employeeId: user.id });
            }
            setIsRequestModalOpen(false);
        };

        return (
             <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
                <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                     <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:p-5">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pengajuan Baru</p>
                            <h2 className="text-lg sm:text-xl font-bold text-primary">Pengajuan {requestType}</h2>
                        </div>
                        <button aria-label="Tutup modal" title="Tutup modal" onClick={() => setIsRequestModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:p-6">
                        {requestType === RequestType.Cuti ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                        <input type="date" title="Tanggal Mulai" value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
                                        <input type="date" title="Tanggal Selesai" value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Alasan</label>
                                    <textarea title="Alasan Cuti" placeholder="Tulis alasan pengajuan cuti" value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})} rows={4} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required></textarea>
                                </div>
                            </>
                        ) : (
                            <>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
                                    <input type="date" title="Tanggal Transaksi" value={reimbursementData.date} onChange={e => setReimbursementData({...reimbursementData, date: e.target.value})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Jumlah (Rp)</label>
                                    <input type="number" title="Jumlah Reimbursement" placeholder="Contoh: 150000" value={reimbursementData.amount} onChange={e => setReimbursementData({...reimbursementData, amount: Number(e.target.value)})} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                                    <textarea title="Deskripsi Reimbursement" placeholder="Tulis deskripsi biaya yang diklaim" value={reimbursementData.description} onChange={e => setReimbursementData({...reimbursementData, description: e.target.value})} rows={4} className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 shadow-sm focus:border-[#06736a] focus:outline-none focus:ring-4 focus:ring-[#06736a]/10" required></textarea>
                                </div>
                            </>
                        )}
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setIsRequestModalOpen(false)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 sm:w-auto">Batal</button>
                            <button type="submit" className="w-full rounded-xl border border-transparent bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-opacity-90 sm:w-auto">Ajukan</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Back Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {onBackToDashboard && (
                    <button
                        onClick={onBackToDashboard}
                        className="inline-flex items-center gap-2 text-[#06736a] hover:text-[#089c8e] font-medium transition-colors group self-start"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Kembali ke Dashboard
                    </button>
                )}
                {/* Breadcrumb */}
                <nav className="text-xs sm:text-sm text-gray-500 w-full sm:w-auto overflow-x-auto">
                    <ol className="flex items-center gap-2 whitespace-nowrap sm:justify-end">
                        <li>Dashboard</li>
                        <li>/</li>
                        <li className="text-[#06736a] font-medium">Self Service</li>
                        {activeTab === 'attendance' && (
                            <>
                                <li>/</li>
                                <li className="text-[#06736a] font-medium">Riwayat Absensi</li>
                            </>
                        )}
                    </ol>
                </nav>
            </div>

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

            {/* Tabs Navigation */}
            <div className="rounded-2xl bg-white shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="grid grid-cols-3 gap-1 p-1 sm:flex sm:-mb-px sm:min-w-max sm:p-0">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:rounded-none sm:px-6 sm:py-4 sm:text-sm sm:border-b-2 sm:whitespace-nowrap ${
                                activeTab === 'overview'
                                    ? 'bg-[#e6f3f2] text-[#06736a] sm:bg-transparent sm:border-[#06736a]'
                                    : 'bg-gray-50 text-gray-500 hover:text-gray-700 sm:bg-transparent sm:border-transparent sm:hover:border-gray-300'
                            }`}
                        >
                            📋 Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:rounded-none sm:px-6 sm:py-4 sm:text-sm sm:border-b-2 sm:whitespace-nowrap ${
                                activeTab === 'profile'
                                    ? 'bg-[#e6f3f2] text-[#06736a] sm:bg-transparent sm:border-[#06736a]'
                                    : 'bg-gray-50 text-gray-500 hover:text-gray-700 sm:bg-transparent sm:border-transparent sm:hover:border-gray-300'
                            }`}
                        >
                            👤 Profil Saya
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:rounded-none sm:px-6 sm:py-4 sm:text-sm sm:border-b-2 sm:whitespace-nowrap ${
                                activeTab === 'attendance'
                                    ? 'bg-[#e6f3f2] text-[#06736a] sm:bg-transparent sm:border-[#06736a]'
                                    : 'bg-gray-50 text-gray-500 hover:text-gray-700 sm:bg-transparent sm:border-transparent sm:hover:border-gray-300'
                            }`}
                        >
                            📅 Riwayat Absensi
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                            {/* Left Column */}
                            <div className="space-y-6 lg:col-span-2 lg:space-y-8">
                                 <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Aksi utama</p>
                                            <h3 className="text-lg font-bold text-primary">Pengajuan Baru</h3>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                                        <button onClick={() => openRequestModal(RequestType.Cuti)} className="flex items-center justify-between gap-4 rounded-2xl bg-blue-50 px-4 py-4 text-left font-semibold text-blue-700 transition hover:bg-blue-100 sm:flex-col sm:justify-center sm:py-5">
                                            <CalendarDaysIcon className="w-8 h-8"/>
                                            <span className="sm:text-center">Ajukan Cuti</span>
                                        </button>
                                        <button onClick={() => openRequestModal(RequestType.Reimbursement)} className="flex items-center justify-between gap-4 rounded-2xl bg-green-50 px-4 py-4 text-left font-semibold text-green-700 transition hover:bg-green-100 sm:flex-col sm:justify-center sm:py-5">
                                            <ClipboardDocumentListIcon className="w-8 h-8"/>
                                            <span className="sm:text-center">Klaim Reimbursement</span>
                                        </button>
                                    </div>
                                </div>
                                 <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <h3 className="text-lg font-bold text-primary">Status Permohonan Saya</h3>
                                    </div>
                                    <div className="space-y-3 sm:hidden">
                                        {[...leaveRequests, ...reimbursementRequests].sort((a,b) => new Date(b.requestedAt) > new Date(a.requestedAt) ? 1 : -1).map(req => (
                                            <div key={req.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{req.type}</p>
                                                        <div className="mt-1 text-sm text-gray-700">
                                                            {req.type === RequestType.Cuti && (
                                                                <div>
                                                                    <p className="font-semibold">{`${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}</p>
                                                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{req.reason}</p>
                                                                </div>
                                                            )}
                                                            {req.type === RequestType.Reimbursement && (
                                                                <div>
                                                                    <p className="font-semibold">{`Rp ${formatMoney(req.amount)}`}</p>
                                                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{req.description}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <StatusBadge status={req.status} />
                                                </div>
                                                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                                    <span>{formatDate(req.requestedAt)}</span>
                                                    <span className="capitalize">{req.type}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="hidden overflow-x-auto sm:block">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Detail</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tgl Diajukan</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {[...leaveRequests, ...reimbursementRequests].sort((a,b) => new Date(b.requestedAt) > new Date(a.requestedAt) ? 1 : -1).map(req => (
                                                    <tr key={req.id}>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{req.type}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {req.type === RequestType.Cuti && (
                                                                <div>
                                                                    <p className="font-semibold">{`${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}</p>
                                                                    <p className="text-xs text-gray-500 truncate max-w-xs">{req.reason}</p>
                                                                </div>
                                                            )}
                                                            {req.type === RequestType.Reimbursement && (
                                                                <div>
                                                                    <p className="font-semibold">{`Rp ${formatMoney(req.amount)}`}</p>
                                                                    <p className="text-xs text-gray-500 truncate max-w-xs">{req.description}</p>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(req.requestedAt)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm"><StatusBadge status={req.status} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6 lg:space-y-8">
                                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-primary mb-2">Jadwal & Cuti</h3>
                                    <div className="space-y-3 text-sm sm:space-y-2">
                                         <p className="text-gray-700">Jadwal Shift: <span className="font-bold">{user.shift}</span></p>
                                         <p className="text-gray-700">Sisa Cuti Tahunan: <span className="font-bold text-[#06736a]">{user.sisaCuti} hari</span></p>
                                    </div>
                                </div>
                                 <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-primary mb-4">Slip Gaji Saya</h3>
                                     <ul className="space-y-2">
                                        {payslipHistory.map(item => (
                                            <li key={item.period}>
                                                <button onClick={() => openPayslip(item.payslip)} className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50">
                                                    Slip Gaji - {item.period}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div>
                            <h3 className="text-lg font-bold text-primary mb-4">Riwayat Kehadiran Saya</h3>

                            <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Absensi Hari Ini</p>
                                {isLanMode && (
                                    <p className="mt-2 text-xs text-blue-700">Mode jaringan: LAN RS (sinkronisasi internet/offline ditunda sementara).</p>
                                )}
                                {isGeofenceConfigured && (
                                    <p className="mt-2 text-xs text-gray-600">Geo-fencing aktif (radius {officeRadiusMeters} meter).</p>
                                )}
                                {todaysRecord ? (
                                    <div className="mt-2 text-sm text-green-700 font-medium">
                                        Absensi hari ini sudah tercatat ({todaysRecord.clockIn} - {todaysRecord.clockOut || '-'})
                                    </div>
                                ) : pendingCheckIn?.tanggal === getTodayDate() ? (
                                    <div className="mt-2 space-y-3">
                                        <p className="text-sm text-gray-700">Check-in tercatat jam <span className="font-semibold">{pendingCheckIn.clockIn}</span>. Lanjutkan check-out saat selesai shift.</p>
                                        <button
                                            type="button"
                                            onClick={handleCheckOut}
                                            disabled={isAttendanceSubmitting}
                                            className="rounded-xl bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055b55] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isAttendanceSubmitting ? 'Menyimpan...' : 'Check Out Sekarang'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-3">
                                        <p className="text-sm text-gray-700">Belum ada absensi hari ini. Tekan tombol di bawah untuk check-in.</p>
                                        <button
                                            type="button"
                                            onClick={handleCheckIn}
                                            disabled={isAttendanceSubmitting}
                                            className="rounded-xl bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055b55] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isAttendanceSubmitting ? 'Memproses...' : 'Check In Sekarang'}
                                        </button>
                                    </div>
                                )}
                                {attendanceActionError && (
                                    <p className="mt-3 text-sm text-red-600">{attendanceActionError}</p>
                                )}
                            </div>

                            {attendanceRecords.length > 0 ? (
                                <>
                                    <div className="space-y-3 sm:hidden">
                                        {attendanceRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((record) => (
                                            <div key={record.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {formatDate(record.tanggal, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">{record.location}</p>
                                                    </div>
                                                    {record.isLate ? (
                                                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Terlambat</span>
                                                    ) : (
                                                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">Tepat Waktu</span>
                                                    )}
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Clock In</p>
                                                        <p className="font-medium">{record.clockIn}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Clock Out</p>
                                                        <p className="font-medium">{record.clockOut}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Lembur</p>
                                                        <p className="font-medium">{record.overtimeHours > 0 ? `${record.overtimeHours} jam` : '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="hidden overflow-x-auto sm:block">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lembur</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {attendanceRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((record) => (
                                                    <tr key={record.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {formatDate(record.tanggal, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.clockIn}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record.clockOut}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.location}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {record.isLate ? (
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                                    Terlambat
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                                    Tepat Waktu
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                            {record.overtimeHours > 0 ? `${record.overtimeHours} jam` : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">Belum ada riwayat absensi</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Tab Profil Saya */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            {user.isLocked && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                                    <p className="text-sm text-red-700">
                                        🔒 Profil Anda telah dikunci oleh HRD. Jika ada perubahan data yang perlu dilakukan, silakan hubungi HRD.
                                    </p>
                                </div>
                            )}
                            
                            {!user.isProfileCompleted && !user.isLocked && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                                    <p className="text-sm text-yellow-700">
                                        ⚠️ Profil Anda belum lengkap. Silakan lengkapi data profil Anda untuk verifikasi HRD.
                                    </p>
                                </div>
                            )}
                            
                            {user.isProfileCompleted && !user.isVerified && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                                    <p className="text-sm text-blue-700">
                                        ℹ️ Profil Anda sedang menunggu verifikasi HRD.
                                    </p>
                                </div>
                            )}
                            
                            {user.isVerified && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                                    <p className="text-sm text-green-700">
                                        ✓ Profil Anda telah diverifikasi oleh HRD pada {user.verifiedAt ? new Date(user.verifiedAt).toLocaleDateString('id-ID') : '-'}.
                                    </p>
                                </div>
                            )}
                            
                            {/* Data Profil */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Data Pribadi */}
                                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Data Pribadi</h3>
                                    <div className="space-y-3 text-sm">
                                        <div><span className="text-gray-600">NIK:</span> <span className="font-medium">{user.nik || '-'}</span></div>
                                        <div><span className="text-gray-600">No. KTP:</span> <span className="font-medium">{user.ktpNumber || '-'}</span></div>
                                        <div><span className="text-gray-600">NPWP:</span> <span className="font-medium">{user.npwp || '-'}</span></div>
                                        <div><span className="text-gray-600">Tanggal Lahir:</span> <span className="font-medium">{user.birthDate ? new Date(user.birthDate).toLocaleDateString('id-ID') : '-'}</span></div>
                                        <div><span className="text-gray-600">Status Pernikahan:</span> <span className="font-medium">{user.maritalStatus || '-'}</span></div>
                                        <div><span className="text-gray-600">Tanggungan:</span> <span className="font-medium">{user.dependents || 0}</span></div>
                                    </div>
                                </div>
                                
                                {/* Kontak */}
                                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Kontak</h3>
                                    <div className="space-y-3 text-sm">
                                        <div><span className="text-gray-600">Email:</span> <span className="font-medium">{user.email}</span></div>
                                        <div><span className="text-gray-600">Telepon:</span> <span className="font-medium">{user.telepon || '-'}</span></div>
                                        <div><span className="text-gray-600">Alamat KTP:</span> <span className="font-medium">{user.address?.ktp || '-'}</span></div>
                                        <div><span className="text-gray-600">Alamat Domisili:</span> <span className="font-medium">{user.address?.domisili || '-'}</span></div>
                                    </div>
                                </div>
                                
                                {/* Kepegawaian */}
                                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Data Kepegawaian</h3>
                                    <div className="space-y-3 text-sm">
                                        <div><span className="text-gray-600">Jabatan:</span> <span className="font-medium">{user.jabatan}</span></div>
                                        <div><span className="text-gray-600">Departemen:</span> <span className="font-medium">{user.departemen}</span></div>
                                        <div><span className="text-gray-600">Tanggal Masuk:</span> <span className="font-medium">{new Date(user.hireDate).toLocaleDateString('id-ID')}</span></div>
                                        <div><span className="text-gray-600">Status:</span> <span className="font-medium">{user.status}</span></div>
                                        <div><span className="text-gray-600">Shift:</span> <span className="font-medium">{user.shift}</span></div>
                                    </div>
                                </div>
                                
                                {/* BPJS */}
                                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                                    <h3 className="text-lg font-bold text-[#06736a] mb-4">BPJS & Bank</h3>
                                    <div className="space-y-3 text-sm">
                                        <div><span className="text-gray-600">BPJS Kesehatan:</span> <span className="font-medium">{user.bpjsKesehatan || '-'}</span></div>
                                        <div><span className="text-gray-600">BPJS Ketenagakerjaan:</span> <span className="font-medium">{user.bpjsKetenagakerjaan || '-'}</span></div>
                                        <div><span className="text-gray-600">Bank:</span> <span className="font-medium">{user.bankAccount?.bankName || '-'}</span></div>
                                        <div><span className="text-gray-600">No. Rekening:</span> <span className="font-medium">{user.bankAccount?.accountNumber || '-'}</span></div>
                                        <div><span className="text-gray-600">Nama Pemegang:</span> <span className="font-medium">{user.bankAccount?.accountHolder || '-'}</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tombol Edit Profil */}
                            <div className="flex justify-stretch pt-2 sm:justify-center sm:pt-4">
                                <button
                                    onClick={onEditProfile}
                                    disabled={user.isLocked}
                                    className={`w-full rounded-2xl px-6 py-4 font-medium transition-colors sm:w-auto ${
                                        user.isLocked
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-[#06736a] text-white hover:bg-[#054f46]'
                                    }`}
                                >
                                    {user.isLocked ? '🔒 Profil Terkunci' : '✏️ Lengkapi/Edit Profil'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <PayslipDetail isOpen={isPayslipDetailOpen} onClose={() => setIsPayslipDetailOpen(false)} payslip={selectedPayslip} employee={user} />
            {isRequestModalOpen && <RequestModal />}
        </div>
    );
};

export default EmployeeSelfService;
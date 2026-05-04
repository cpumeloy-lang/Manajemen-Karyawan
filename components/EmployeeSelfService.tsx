import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { Employee, LeaveRequest, ReimbursementRequest, AttendanceRecord, RequestStatus, RequestType, Payslip, AllRequest, DEFAULT_SHIFT_DEFINITIONS, EmployeeSchedule } from '../types.ts';
import { useAppData } from '../stores/appStore';
import { calculatePayslip, buildPayrollConfig } from '../services/payrollService.ts';
import { supabase } from '../services/supabaseClient.ts';
import { faceVerificationService, type FaceVerificationResult } from '../services/faceVerificationService.ts';
import PayslipDetail from './PayslipDetail.tsx';
// Lazy-load face verification components — they pull in face-api.js (~600KB)
const FaceEnrollmentModal = lazy(() => import('./FaceEnrollmentModal.tsx'));
const AttendanceVerificationFlow = lazy(() => import('./AttendanceVerificationFlow.tsx'));
import { uploadAttendancePhoto } from '../services/attendancePhotoService.ts';
import { XMarkIcon, CalendarDaysIcon, ClipboardDocumentListIcon } from './icons.tsx';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';

interface EmployeeSelfServiceProps {
    user: Employee;
    attendanceRecords: AttendanceRecord[];
    leaveRequests: LeaveRequest[];
    reimbursementRequests: ReimbursementRequest[];
    onNewRequest: (request: Omit<AllRequest, 'id' | 'status' | 'requestedAt'>) => void;
    onSaveAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    defaultTab?: 'overview' | 'attendance' | 'profile' | 'kinerja';
    onBackToDashboard?: () => void;
    onEditProfile?: () => void; // Callback untuk edit profil karyawan
}

const EmployeeSelfService: React.FC<EmployeeSelfServiceProps> = ({ user, attendanceRecords, leaveRequests, reimbursementRequests, onNewRequest, onSaveAttendance, defaultTab = 'overview', onBackToDashboard, onEditProfile }) => {
    const { systemSettings } = useAppData();
    const activeShiftDefs = (systemSettings?.default_shifts && systemSettings.default_shifts.length > 0)
        ? systemSettings.default_shifts
        : DEFAULT_SHIFT_DEFINITIONS;
    const [isPayslipDetailOpen, setIsPayslipDetailOpen] = useState(false);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestType, setRequestType] = useState<RequestType>(RequestType.Cuti);
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'profile' | 'kinerja'>(() => defaultTab ?? 'overview');

    // Pastikan tab aktif sinkron saat defaultTab berubah dari parent
    useEffect(() => {
        if (defaultTab) setActiveTab(defaultTab);
    }, [defaultTab]);
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
    const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);
    const [pendingCheckIn, setPendingCheckIn] = useState<{ tanggal: string; clockIn: string; location: string; latitude?: number; longitude?: number } | null>(null);
    const [isLanMode] = useState(true);
    
    // Verification States
    const [isVerificationFlowOpen, setIsVerificationFlowOpen] = useState(false);
    const [isFaceEnrollmentOpen, setIsFaceEnrollmentOpen] = useState(false);
    const [verificationActionType, setVerificationActionType] = useState<'checkin' | 'checkout'>('checkin');
    const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);
    const [todaySchedule, setTodaySchedule] = useState<EmployeeSchedule | null>(null);

    useEffect(() => {
        faceVerificationService.hasEnrolledFace(user.id).then(setFaceEnrolled);
        // Load today's schedule from employee_schedules table
        import('../services/scheduleService.ts').then(({ getTodaySchedule }) => {
            getTodaySchedule(user.id).then(setTodaySchedule).catch(() => {});
        });
    }, [user.id]);

    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const getNowTime = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };
    const todayDate = getTodayDate();
    const pendingStorageKey = `hrms.pending-attendance.${user.id}`;
    const officeLat = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LAT || '0');
    const officeLng = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LNG || '0');
    const officeRadiusMeters = Number(import.meta.env.VITE_ATTENDANCE_RADIUS_METERS || '300');
    const isGeofenceConfigured = Number.isFinite(officeLat) && Number.isFinite(officeLng) && officeLat !== 0 && officeLng !== 0;

    const serverPendingRecord = useMemo(() => {
        return attendanceRecords.find((record) => record.tanggal === todayDate && !record.clockOut) || null;
    }, [attendanceRecords, todayDate]);

    useEffect(() => {
        if (serverPendingRecord) {
            setPendingCheckIn({
                tanggal: serverPendingRecord.tanggal,
                clockIn: serverPendingRecord.clockIn,
                location: serverPendingRecord.location,
                latitude: serverPendingRecord.latitude,
                longitude: serverPendingRecord.longitude,
            });
            return;
        }

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
    }, [pendingStorageKey, serverPendingRecord]);

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
        // Prefer per-date schedule over static shift definition
        const shiftDef = activeShiftDefs.find(s => s.name === (todaySchedule?.shift_name || user.shift));
        const shiftStartStr = (todaySchedule && !todaySchedule.is_off_day && todaySchedule.shift_start_time)
            ? todaySchedule.shift_start_time
            : (shiftDef?.startTime || '08:00');
        const shiftEndStr = (todaySchedule && !todaySchedule.is_off_day && todaySchedule.shift_end_time)
            ? todaySchedule.shift_end_time
            : (shiftDef?.endTime || '16:00');
        const [startH, startM] = shiftStartStr.split(':').map(Number);
        const [endH,   endM]   = shiftEndStr.split(':').map(Number);
        const tolerance = shiftDef?.lateToleranceMinutes ?? 15;

        // Shift duration from definition (handles overnight)
        let shiftDuration = (endH + endM / 60) - (startH + startM / 60);
        if (shiftDuration <= 0) shiftDuration += 24;

        const [inHour, inMinute] = clockIn.split(':').map(Number);
        const [outHour, outMinute] = clockOut.split(':').map(Number);

        const isLate = (inHour * 60 + inMinute) > (startH * 60 + startM + tolerance);

        const inValue = inHour + inMinute / 60;
        let outValue = outHour + outMinute / 60;
        if (outValue < inValue) outValue += 24;

        const overtimeHours = Math.max(0, parseFloat((outValue - inValue - shiftDuration).toFixed(2)));
        return { isLate, overtimeHours };
    };

    const todaysRecord = useMemo(() => {
        const today = getTodayDate();
        return attendanceRecords.find((record) => record.tanggal === today) || null;
    }, [attendanceRecords]);

    const [attendanceMonthFilter, setAttendanceMonthFilter] = useState('all');
    const [attendanceDateFilter, setAttendanceDateFilter] = useState({ start: '', end: '' });

    const attendanceMonths = useMemo(() => {
        const values = new Set<string>();
        attendanceRecords.forEach((record) => {
            values.add(record.tanggal.slice(0, 7));
        });
        return [...values].sort((a, b) => b.localeCompare(a));
    }, [attendanceRecords]);

    const filteredAttendanceRecords = useMemo(() => {
        return [...attendanceRecords]
            .filter((record) => attendanceMonthFilter === 'all' || record.tanggal.startsWith(attendanceMonthFilter))
            .filter((record) => {
                if (attendanceDateFilter.start && record.tanggal < attendanceDateFilter.start) return false;
                if (attendanceDateFilter.end && record.tanggal > attendanceDateFilter.end) return false;
                return true;
            })
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, attendanceDateFilter.end, attendanceDateFilter.start, attendanceMonthFilter]);

    const attendanceSummary = useMemo(() => {
        const total = filteredAttendanceRecords.length;
        const lateCount = filteredAttendanceRecords.filter((record) => record.isLate).length;
        const onTimeCount = total - lateCount;
        const totalOvertime = Number(filteredAttendanceRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(2));
        const lateRate = total ? Number(((lateCount / total) * 100).toFixed(0)) : 0;
        const onTimeRate = total ? Number(((onTimeCount / total) * 100).toFixed(0)) : 0;
        return { total, lateCount, onTimeCount, totalOvertime, lateRate, onTimeRate };
    }, [filteredAttendanceRecords]);

    // ── Metrik Kinerja Mandiri (sama seperti HR Dashboard tapi hanya data karyawan ini) ──
    const kinerjaTrendData = useMemo(() => {
        // Ambil 90 hari terakhir, kelompokkan per minggu
        const now = new Date();
        const weeks: Record<string, { hadir: number; terlambat: number; lembur: number; label: string }> = {};

        attendanceRecords.forEach(rec => {
            const d = new Date(rec.tanggal);
            const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
            if (diffDays > 90) return;
            const weekNum = Math.floor(diffDays / 7);
            const key = String(weekNum);
            if (!weeks[key]) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - (weekNum + 1) * 7);
                weeks[key] = {
                    label: weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                    hadir: 0, terlambat: 0, lembur: 0
                };
            }
            weeks[key].hadir += 1;
            if (rec.isLate) weeks[key].terlambat += 1;
            weeks[key].lembur += Number(rec.overtimeHours || 0);
        });

        return Object.keys(weeks)
            .sort((a, b) => Number(b) - Number(a))
            .reverse()
            .map(k => ({ ...weeks[k], lembur: Number(weeks[k].lembur.toFixed(1)) }));
    }, [attendanceRecords]);

    const monthlyKinerjaSummary = useMemo(() => {
        const byMonth: Record<string, { bulan: string; hadir: number; terlambat: number; lembur: number; skor: number }> = {};

        attendanceRecords.forEach(rec => {
            const ym = rec.tanggal.slice(0, 7);
            if (!byMonth[ym]) {
                const [y, m] = ym.split('-').map(Number);
                byMonth[ym] = {
                    bulan: new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                    hadir: 0, terlambat: 0, lembur: 0, skor: 0
                };
            }
            byMonth[ym].hadir += 1;
            if (rec.isLate) byMonth[ym].terlambat += 1;
            byMonth[ym].lembur += Number(rec.overtimeHours || 0);
        });

        return Object.keys(byMonth)
            .sort()
            .slice(-6)
            .map(k => {
                const d = byMonth[k];
                const skor = d.hadir > 0 ? Math.max(0, Math.round(100 - (d.terlambat / d.hadir) * 100)) : 0;
                return { ...d, lembur: Number(d.lembur.toFixed(1)), skor };
            });
    }, [attendanceRecords]);

    const overallKinerja = useMemo(() => {
        const total = attendanceRecords.length;
        const lateCount = attendanceRecords.filter(r => r.isLate).length;
        const totalOvertime = attendanceRecords.reduce((s, r) => s + Number(r.overtimeHours || 0), 0);
        const punctualityScore = total > 0 ? Math.max(0, Math.round(100 - (lateCount / total) * 100)) : 0;
        const avgOvertimePerDay = total > 0 ? Number((totalOvertime / total).toFixed(1)) : 0;
        const grade = punctualityScore >= 90 ? { label: 'Sangat Baik', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
            : punctualityScore >= 75 ? { label: 'Baik', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
            : punctualityScore >= 60 ? { label: 'Cukup', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
            : { label: 'Perlu Perhatian', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
        return { total, lateCount, totalOvertime: Number(totalOvertime.toFixed(1)), punctualityScore, avgOvertimePerDay, grade };
    }, [attendanceRecords]);

    const handleVerificationSuccess = async (result: { photoUrl: string; photoBlob?: Blob; faceDescriptor?: Float32Array; verificationResult: FaceVerificationResult }) => {
        setAttendanceActionError(null);
        setIsAttendanceSubmitting(true);

        try {
            // If verification failed, show error
            if (!result.verificationResult.verified) {
                setAttendanceActionError(`Verifikasi gagal: ${result.verificationResult.message}`);
                setIsAttendanceSubmitting(false);
                setIsVerificationFlowOpen(false);
                return;
            }

            // Upload foto absensi ke Supabase Storage
            let photoUrl = '';
            if (result.photoBlob) {
                photoUrl = await uploadAttendancePhoto(result.photoBlob, user.id, verificationActionType);
            }

            const locationData = await resolveCurrentLocation();

            const biometricPayload = {
                photoUrl,
                faceDescriptor: result.faceDescriptor,
                faceMatchScore: result.verificationResult.matchScore,
                timestamp: new Date().toISOString(),
            };

            if (verificationActionType === 'checkin') {
                await executeCheckIn(biometricPayload, locationData);
            } else if (verificationActionType === 'checkout') {
                await executeCheckOut(biometricPayload, locationData);
            }

            setIsVerificationFlowOpen(false);
        } catch (error: any) {
            setAttendanceActionError(`Gagal memproses absensi: ${error.message}`);
            setIsAttendanceSubmitting(false);
        }
    };

    const handleCheckInClick = () => {
        if (faceEnrolled === false) {
            setAttendanceActionError('⚠️ Wajah Anda belum terdaftar. Silakan lakukan Enroll Face Recognition terlebih dahulu di tab Profil.');
            setIsFaceEnrollmentOpen(true);
            return;
        }
        if (todaysRecord && !todaysRecord.clockOut) {
            setAttendanceActionError('Anda sudah melakukan check-in hari ini. Silakan check-out terlebih dahulu.');
            return;
        }
        setAttendanceActionError(null);
        setVerificationActionType('checkin');
        setIsVerificationFlowOpen(true);
    };

    const handleCheckOutClick = () => {
        if (faceEnrolled === false) {
            setAttendanceActionError('⚠️ Wajah Anda belum terdaftar. Silakan lakukan Enroll Face Recognition terlebih dahulu di tab Profil.');
            setIsFaceEnrollmentOpen(true);
            return;
        }
        setAttendanceActionError(null);
        setVerificationActionType('checkout');
        setIsVerificationFlowOpen(true);
    };

    const executeCheckIn = async (attendanceData: { photoUrl: string; faceDescriptor?: Float32Array; faceMatchScore?: number; timestamp: string }, locationData: { location: string; latitude?: number; longitude?: number }) => {
        try {
            const draft = {
                tanggal: getTodayDate(),
                clockIn: getNowTime(),
                clockOut: '',
                location: locationData.location,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                isLate: false,
                overtimeHours: 0,
                status: 'Pending' as const,
                source: 'web-ess' as const,
                notes: 'Check-in melalui Employee Self Service dengan face verification',
                photoUrl: attendanceData.photoUrl || '',
                biometricType: 'face' as const,
                biometricVerified: true,
                faceMatchScoreCheckIn: attendanceData.faceMatchScore,
            };

            const saved = await onSaveAttendance({
                employeeId: user.id,
                tanggal: draft.tanggal,
                clockIn: draft.clockIn,
                clockOut: draft.clockOut,
                location: draft.location,
                latitude: draft.latitude,
                longitude: draft.longitude,
                isLate: draft.isLate,
                overtimeHours: draft.overtimeHours,
                status: draft.status,
                source: draft.source,
                notes: draft.notes,
                photoUrl: draft.photoUrl,
                biometricType: draft.biometricType,
                biometricVerified: draft.biometricVerified,
                faceMatchScoreCheckIn: draft.faceMatchScoreCheckIn,
            });

            if (saved) {
                persistPendingCheckIn(draft);
                setAttendanceActionError(null);
            }
        } catch (error: any) {
            setAttendanceActionError('Gagal memproses check-in. Coba lagi.');
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const executeCheckOut = async (attendanceData: { photoUrl: string; faceDescriptor?: Float32Array; faceMatchScore?: number; timestamp: string }, locationData: { location: string; latitude?: number; longitude?: number }) => {
        try {
            const effectiveDraft = pendingCheckIn || (serverPendingRecord ? {
                tanggal: serverPendingRecord.tanggal,
                clockIn: serverPendingRecord.clockIn,
                location: serverPendingRecord.location,
                latitude: serverPendingRecord.latitude,
                longitude: serverPendingRecord.longitude,
            } : null);

            if (!effectiveDraft) {
                setAttendanceActionError('Tidak ada check-in hari ini. Silakan check-in terlebih dahulu.');
                setIsAttendanceSubmitting(false);
                return;
            }

            if (isLanMode && !navigator.onLine) {
                setAttendanceActionError('Mode LAN aktif: perangkat harus terhubung ke jaringan LAN RS.');
                setIsAttendanceSubmitting(false);
                return;
            }

            const clockOut = getNowTime();
            const summary = calculateAttendanceSummary(effectiveDraft.clockIn, clockOut);

            const success = await onSaveAttendance({
                employeeId: user.id,
                tanggal: effectiveDraft.tanggal,
                clockIn: effectiveDraft.clockIn,
                clockOut,
                location: effectiveDraft.location,
                latitude: effectiveDraft.latitude,
                longitude: effectiveDraft.longitude,
                isLate: summary.isLate,
                overtimeHours: summary.overtimeHours,
                status: summary.isLate ? 'Terlambat' : 'Hadir',
                source: 'web-ess',
                notes: 'Check-out melalui Employee Self Service dengan face verification',
                photoUrl: attendanceData.photoUrl || '',
                biometricType: 'face',
                biometricVerified: true,
                faceMatchScoreCheckOut: attendanceData.faceMatchScore,
            });

            if (success) {
                persistPendingCheckIn(null);
                setAttendanceActionError(null);
            }
        } catch (error: any) {
            setAttendanceActionError('Gagal memproses check-out. Coba lagi.');
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
                const payslip = calculatePayslip(user, recordsForPeriod, periodName, buildPayrollConfig(systemSettings));
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
            [RequestStatus.Pending]: "bg-yellow-100 text-yellow-800",
            [RequestStatus.Approved]: "bg-green-100 text-green-800",
            [RequestStatus.Rejected]: "bg-red-100 text-red-800",
        };
        return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
    };

    // Request modal form state — hoisted to parent level to survive re-renders
    const [leaveData, setLeaveData] = useState({ startDate: '', endDate: '', reason: ''});
    const [reimbursementData, setReimbursementData] = useState({ date: '', description: '', amount: 0 });

    const handleRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (requestType === RequestType.Cuti) {
            onNewRequest({ ...leaveData, type: RequestType.Cuti, employeeId: user.id });
        } else {
            onNewRequest({ ...reimbursementData, type: RequestType.Reimbursement, employeeId: user.id });
        }
        setIsRequestModalOpen(false);
        setLeaveData({ startDate: '', endDate: '', reason: '' });
        setReimbursementData({ date: '', description: '', amount: 0 });
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
                    <nav className="grid grid-cols-4 gap-1 p-1 sm:flex sm:-mb-px sm:min-w-max sm:p-0">
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
                            onClick={() => setActiveTab('kinerja')}
                            className={`rounded-xl px-3 py-3 text-xs font-semibold transition-colors sm:rounded-none sm:px-6 sm:py-4 sm:text-sm sm:border-b-2 sm:whitespace-nowrap ${
                                activeTab === 'kinerja'
                                    ? 'bg-[#e6f3f2] text-[#06736a] sm:bg-transparent sm:border-[#06736a]'
                                    : 'bg-gray-50 text-gray-500 hover:text-gray-700 sm:bg-transparent sm:border-transparent sm:hover:border-gray-300'
                            }`}
                        >
                            📊 Kinerja Saya
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

                {/* ── TAB: KINERJA SAYA ── */}
                {activeTab === 'kinerja' && (
                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Header */}
                        <div>
                            <h2 className="text-xl font-bold text-[#06736a]">📊 Evaluasi Kinerja Mandiri</h2>
                            <p className="text-sm text-gray-500 mt-1">Pantau performa kehadiran dan produktivitas Anda secara mandiri berdasarkan data absensi.</p>
                        </div>

                        {/* Skor Kinerja Utama */}
                        <div className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${overallKinerja.grade.bg}`}>
                            <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Skor Ketepatan Kehadiran</p>
                                <p className={`text-5xl font-black mt-1 ${overallKinerja.grade.color}`}>{overallKinerja.punctualityScore}<span className="text-2xl">%</span></p>
                                <p className={`text-sm font-bold mt-1 ${overallKinerja.grade.color}`}>Grade: {overallKinerja.grade.label}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:min-w-[280px]">
                                <div className="bg-white/70 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-800">{overallKinerja.total}</p>
                                    <p className="text-xs text-gray-500 mt-1">Total Hadir</p>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-red-600">{overallKinerja.lateCount}</p>
                                    <p className="text-xs text-gray-500 mt-1">Kali Terlambat</p>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{overallKinerja.totalOvertime}<span className="text-sm">j</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Total Lembur</p>
                                </div>
                                <div className="bg-white/70 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-purple-600">{overallKinerja.avgOvertimePerDay}<span className="text-sm">j</span></p>
                                    <p className="text-xs text-gray-500 mt-1">Rata-rata Lembur/Hari</p>
                                </div>
                            </div>
                        </div>

                        {/* Grafik Tren Mingguan */}
                        {kinerjaTrendData.length > 1 ? (
                            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-5">
                                <h3 className="text-base font-bold text-gray-700 mb-4">📈 Tren Kehadiran Mingguan (90 Hari Terakhir)</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={kinerjaTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line type="monotone" dataKey="hadir" name="Hari Hadir" stroke="#06736a" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#ef4444" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="lembur" name="Lembur (Jam)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-300 p-8 text-center text-gray-400">
                                <p className="text-2xl mb-2">📭</p>
                                <p className="text-sm">Data absensi belum cukup untuk menampilkan grafik tren.</p>
                            </div>
                        )}

                        {/* Tabel Perbandingan Bulanan */}
                        {monthlyKinerjaSummary.length > 0 && (
                            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 sm:p-5">
                                <h3 className="text-base font-bold text-gray-700 mb-4">📅 Perbandingan Kinerja per Bulan</h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={monthlyKinerjaSummary} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="skor" name="Skor Ketepatan (%)" fill="#06736a" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="terlambat" name="Kali Terlambat" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="text-xs font-semibold text-gray-500 uppercase border-b">
                                                <th className="py-2 pr-4">Bulan</th>
                                                <th className="py-2 pr-4 text-center">Hadir</th>
                                                <th className="py-2 pr-4 text-center">Terlambat</th>
                                                <th className="py-2 pr-4 text-center">Lembur (j)</th>
                                                <th className="py-2 text-center">Skor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {monthlyKinerjaSummary.map((m, i) => (
                                                <tr key={i} className="hover:bg-white transition-colors">
                                                    <td className="py-2 pr-4 font-medium">{m.bulan}</td>
                                                    <td className="py-2 pr-4 text-center">{m.hadir}</td>
                                                    <td className={`py-2 pr-4 text-center font-semibold ${m.terlambat > 0 ? 'text-red-600' : 'text-green-600'}`}>{m.terlambat}</td>
                                                    <td className="py-2 pr-4 text-center text-blue-600">{m.lembur}</td>
                                                    <td className="py-2 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                            m.skor >= 90 ? 'bg-green-100 text-green-700'
                                                            : m.skor >= 75 ? 'bg-blue-100 text-blue-700'
                                                            : m.skor >= 60 ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>{m.skor}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Status Cuti */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl bg-[#e6f3f2] border border-[#b2dbd7] p-4 text-center">
                                <p className="text-3xl font-black text-[#06736a]">{user.sisaCuti ?? 12}</p>
                                <p className="text-sm text-gray-600 mt-1">Sisa Cuti Tahunan</p>
                            </div>
                            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-center">
                                <p className="text-3xl font-black text-yellow-600">
                                    {leaveRequests.filter(r => r.status === RequestStatus.Pending).length}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Pengajuan Cuti Pending</p>
                            </div>
                            <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                                <p className="text-3xl font-black text-green-600">
                                    {leaveRequests.filter(r => r.status === RequestStatus.Approved).length}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Cuti Disetujui</p>
                            </div>
                        </div>

                        {/* Tips Peningkatan Kinerja */}
                        {overallKinerja.punctualityScore < 90 && (
                            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                                <h4 className="font-bold text-amber-800 mb-2">💡 Catatan untuk Peningkatan</h4>
                                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                                    {overallKinerja.lateCount > 3 && <li>Anda tercatat terlambat {overallKinerja.lateCount} kali — usahakan tiba sebelum jam shift dimulai.</li>}
                                    {overallKinerja.punctualityScore < 75 && <li>Skor ketepatan di bawah 75% — konsultasikan dengan HRD jika ada kendala transportasi atau jadwal.</li>}
                                    {overallKinerja.avgOvertimePerDay > 2 && <li>Rata-rata lembur {overallKinerja.avgOvertimePerDay} jam/hari — pastikan keseimbangan kerja terjaga.</li>}
                                </ul>
                            </div>
                        )}
                        {overallKinerja.punctualityScore >= 90 && (
                            <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                                <h4 className="font-bold text-green-800 mb-1">🏆 Performa Sangat Baik!</h4>
                                <p className="text-sm text-green-700">Skor ketepatan Anda {overallKinerja.punctualityScore}% — pertahankan kedisiplinan ini. Kinerja Anda sudah sesuai standar rumah sakit.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">

                            {/* ══ HERO: CHECK-IN / CHECK-OUT ══ */}
                            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-lg ${
                                todaysRecord?.clockOut
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
                                        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>
                                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white leading-tight">
                                            {todaysRecord?.clockOut
                                                ? '✅ Shift Selesai'
                                                : pendingCheckIn?.tanggal === getTodayDate()
                                                ? '🟢 Sedang Bertugas'
                                                : '⏰ Belum Check-In'}
                                        </h2>
                                        <p className="mt-1 text-sm" style={{color:'rgba(255,255,255,0.7)'}}>
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
                                                <div className="rounded-2xl px-4 py-2" style={{background:'rgba(255,255,255,0.15)'}}>
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>Check In</p>
                                                    <p className="text-xl font-black text-white">{todaysRecord?.clockIn || pendingCheckIn?.clockIn}</p>
                                                </div>
                                            )}
                                            {todaysRecord?.clockOut && (
                                                <div className="rounded-2xl px-4 py-2" style={{background:'rgba(255,255,255,0.15)'}}>
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>Check Out</p>
                                                    <p className="text-xl font-black text-white">{todaysRecord.clockOut}</p>
                                                </div>
                                            )}
                                            {todaysRecord?.overtimeHours && todaysRecord.overtimeHours > 0 && (
                                                <div className="rounded-2xl px-4 py-2" style={{background:'rgba(255,255,255,0.15)'}}>
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,0.6)'}}>Lembur</p>
                                                    <p className="text-xl font-black text-white">{todaysRecord.overtimeHours}j</p>
                                                </div>
                                            )}
                                        </div>

                                        {isGeofenceConfigured && (
                                            <p className="mt-3 text-xs" style={{color:'rgba(255,255,255,0.5)'}}>📍 Geo-fencing aktif · radius {officeRadiusMeters}m</p>
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
                                                            <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Menyimpan...</span>
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
                                                            <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Memproses...</span>
                                                        ) : (
                                                            <><span className="text-xl">📷</span> Check In Sekarang</>
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setActiveTab('attendance')}
                                                    className="text-xs transition-colors text-center" style={{color:'rgba(255,255,255,0.5)'}}
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
                                                        return `${Math.floor(Math.max(0,dur)/60)}j ${Math.max(0,dur)%60}m`;
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
                                            <CalendarDaysIcon className="w-5 h-5 flex-shrink-0"/>
                                            Ajukan Cuti
                                        </button>
                                        <button onClick={() => openRequestModal(RequestType.Reimbursement)} className="flex w-full items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-left text-sm font-semibold text-green-700 transition hover:bg-green-100">
                                            <ClipboardDocumentListIcon className="w-5 h-5 flex-shrink-0"/>
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
                                                .sort((a,b) => new Date(b.requestedAt) > new Date(a.requestedAt) ? 1 : -1)
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
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                                <p className="text-sm font-semibold text-yellow-800">💡 Evaluasi Diri: Pantau metrik Anda setiap bulan. On-time rate ≥80% dan late rate ≤20% menunjukkan disiplin baik.</p>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <select 
                                        value={attendanceMonthFilter} 
                                        onChange={(e) => setAttendanceMonthFilter(e.target.value)} 
                                        className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-[#06736a]" 
                                        aria-label="Pilih bulan"
                                    >
                                        <option value="all">Semua bulan</option>
                                        {attendanceMonths.map((month) => (
                                            <option key={month} value={month}>
                                                {new Date(`${month}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                                            </option>
                                        ))}
                                    </select>
                                    <input 
                                        type="date" 
                                        value={attendanceDateFilter.start} 
                                        onChange={(e) => setAttendanceDateFilter((prev) => ({ ...prev, start: e.target.value }))} 
                                        className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-[#06736a]" 
                                        aria-label="Tanggal mulai" 
                                    />
                                    <input 
                                        type="date" 
                                        value={attendanceDateFilter.end} 
                                        onChange={(e) => setAttendanceDateFilter((prev) => ({ ...prev, end: e.target.value }))} 
                                        className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-[#06736a]" 
                                        aria-label="Tanggal akhir" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-sm">
                                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
                                    <span className="block text-xs text-gray-500">Total</span>
                                    <span className="block text-xl font-bold">{attendanceSummary.total}</span>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
                                    <span className="block text-xs text-gray-500">Tepat Waktu</span>
                                    <span className="block text-xl font-bold text-green-700">{attendanceSummary.onTimeCount}</span>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
                                    <span className="block text-xs text-gray-500">Terlambat</span>
                                    <span className="block text-xl font-bold text-red-700">{attendanceSummary.lateCount}</span>
                                </div>
                                <div className={`rounded-lg border-2 p-3 text-center shadow-sm ${attendanceSummary.onTimeRate >= 80 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                                    <span className="block text-xs text-gray-500">On-Time %</span>
                                    <span className={`block text-xl font-bold ${attendanceSummary.onTimeRate >= 80 ? "text-green-700" : "text-red-700"}`}>{attendanceSummary.onTimeRate}%</span>
                                </div>
                                <div className={`rounded-lg border-2 p-3 text-center shadow-sm ${attendanceSummary.lateRate <= 20 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                                    <span className="block text-xs text-gray-500">Late Rate %</span>
                                    <span className={`block text-xl font-bold ${attendanceSummary.lateRate <= 20 ? "text-green-700" : "text-red-700"}`}>{attendanceSummary.lateRate}%</span>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
                                    <span className="block text-xs text-gray-500">Lembur (jam)</span>
                                    <span className="block text-xl font-bold">{attendanceSummary.totalOvertime}</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-primary mb-2">Check-In/Out Hari Ini</h3>

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
                                            onClick={handleCheckOutClick}
                                            disabled={isAttendanceSubmitting}
                                            className="rounded-xl bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055b55] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isAttendanceSubmitting ? 'Menyimpan...' : <>📷 Check Out Sekarang</>}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-3">
                                        <p className="text-sm text-gray-700">Belum ada absensi hari ini. Tekan tombol di bawah untuk check-in.</p>
                                        <button
                                            type="button"
                                            onClick={handleCheckInClick}
                                            disabled={isAttendanceSubmitting}
                                            className="rounded-xl bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055b55] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isAttendanceSubmitting ? 'Memproses...' : <>📷 Check In Sekarang</>}
                                        </button>
                                    </div>
                                )}
                                {attendanceActionError && (
                                    <p className="mt-3 text-sm text-red-600">{attendanceActionError}</p>
                                )}
                            </div>

                            {filteredAttendanceRecords.length > 0 ? (
                                <>
                                    <div className="space-y-3 sm:hidden">
                                        {filteredAttendanceRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((record) => (
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
                                                {filteredAttendanceRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map((record) => (
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
                                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                                    Belum ada rekaman absensi pada periode ini.
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
                                        <div><span className="text-gray-600">Agama:</span> <span className="font-medium">{user.agama || '-'}</span></div>
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
                            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:pt-4">
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
                                
                                <button
                                    onClick={() => setIsFaceEnrollmentOpen(true)}
                                    className="w-full rounded-2xl px-6 py-4 font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                                >
                                    👤 Enroll Face Recognition
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <PayslipDetail isOpen={isPayslipDetailOpen} onClose={() => setIsPayslipDetailOpen(false)} payslip={selectedPayslip} employee={user} />
            {isRequestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
                    <div className="w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:p-5">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Pengajuan Baru</p>
                                <h2 className="text-lg sm:text-xl font-bold text-primary">Pengajuan {requestType}</h2>
                            </div>
                            <button aria-label="Tutup modal" title="Tutup modal" onClick={() => setIsRequestModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleRequestSubmit} className="space-y-4 px-5 py-5 sm:p-6">
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
                                <button type="submit" className="w-full rounded-xl border border-transparent bg-[#06736a] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#054f46] sm:w-auto">Ajukan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <Suspense fallback={null}>
                {isVerificationFlowOpen && (
                    <AttendanceVerificationFlow
                        isOpen={isVerificationFlowOpen}
                        onClose={() => setIsVerificationFlowOpen(false)}
                        onSuccess={handleVerificationSuccess}
                        employee={{ id: user.id, name: user.nama }}
                        actionType={verificationActionType}
                        isGeofenceEnabled={isGeofenceConfigured}
                        officeLocation={{ lat: officeLat, lng: officeLng }}
                        officeRadius={officeRadiusMeters}
                    />
                )}
                {isFaceEnrollmentOpen && (
                    <FaceEnrollmentModal
                        isOpen={isFaceEnrollmentOpen}
                        onClose={() => setIsFaceEnrollmentOpen(false)}
                        employeeId={user.id}
                        employeeName={user.nama}
                        onEnrolled={() => {
                            setFaceEnrolled(true);
                            setAttendanceActionError(null);
                        }}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default EmployeeSelfService;
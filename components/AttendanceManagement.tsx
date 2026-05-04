import React, { useState, useMemo, useRef } from 'react';
import { Employee, AttendanceRecord, AttendanceChangeRequest, AttendanceReasonCode, AttendanceRevisionHistory, Shift, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS, WEEK_DAYS, getScheduleForDay } from '../types.ts';
import { ClockIcon, EyeIcon, MapPinIcon, ClipboardDocumentListIcon } from './icons.tsx';
import FaceVerificationDashboard from './FaceVerificationDashboard.tsx';
import { recalculateAttendanceMetrics } from '../services/attendanceMetricsService.ts';

interface AttendanceManagementProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    onSave: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    canManageAttendance?: boolean;
    canApproveAttendanceRequests?: boolean;
    currentUserId?: string;
    onLoadPendingRequests?: () => Promise<AttendanceChangeRequest[]>;
    onLoadRevisionHistory?: () => Promise<AttendanceRevisionHistory[]>;
    onApproveRequest?: (requestId: string, reviewNote?: string) => Promise<boolean> | boolean;
    onRejectRequest?: (requestId: string, reviewNote?: string) => Promise<boolean> | boolean;
    onOpenEmployeeHistory?: (employee: Employee) => void;
    isReportMode?: boolean;
    shiftDefinitions?: ShiftDefinition[]; // Custom shift defs (system settings / unit override)
}

const LIVE_REFRESH_INTERVAL_SECONDS = 30;

const ATTENDANCE_REASON_CODE_OPTIONS: Array<{ code: AttendanceReasonCode; label: string }> = [
    { code: 'FORGOT_CHECK_IN', label: 'Lupa Check-in' },
    { code: 'FORGOT_CHECK_OUT', label: 'Lupa Check-out' },
    { code: 'DEVICE_FAILURE', label: 'Gangguan Perangkat' },
    { code: 'NETWORK_FAILURE', label: 'Gangguan Jaringan' },
    { code: 'SHIFT_ADJUSTMENT', label: 'Penyesuaian Shift' },
    { code: 'EMERGENCY_OVERRIDE', label: 'Emergency Override' },
    { code: 'BULK_IMPORT_FIX', label: 'Perbaikan Bulk Import' },
];

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
    employees,
    attendanceRecords,
    onSave,
    canManageAttendance = true,
    canApproveAttendanceRequests = false,
    currentUserId,
    onLoadPendingRequests,
    onLoadRevisionHistory,
    onApproveRequest,
    onRejectRequest,
    onOpenEmployeeHistory,
    isReportMode = false,
    shiftDefinitions,
}) => {
    const activeShiftDefs = (shiftDefinitions && shiftDefinitions.length > 0) ? shiftDefinitions : DEFAULT_SHIFT_DEFINITIONS;
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 8) + '01';
    const [recalcFrom, setRecalcFrom] = useState(firstOfMonth);
    const [recalcTo,   setRecalcTo]   = useState(today);
    const [recalcSource, setRecalcSource] = useState<'all' | 'hikvision' | 'mobile'>('hikvision');
    const [recalculating, setRecalculating] = useState(false);
    const [recalcResult, setRecalcResult] = useState<{ updated: number; skipped: number; errors: number } | null>(null);
    const generatedAt = new Date();
    const [newRecord, setNewRecord] = useState({
        employeeId: '',
        tanggal: today,
        clockIn: '',
        clockOut: '',
        location: 'RS Utama (Manual)',
        notes: '',
        source: 'web-admin' as const,
        reasonCode: '' as AttendanceReasonCode | '',
        reasonDetail: '',
        latitude: '',
        longitude: '',
        locationDistanceMeters: '',
        locationVerified: false,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [showManualForm, setShowManualForm] = useState(true);
    const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<AttendanceChangeRequest[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [revisionHistory, setRevisionHistory] = useState<AttendanceRevisionHistory[]>([]);
    const [loadingRevision, setLoadingRevision] = useState(false);
    const [revisionActionFilter, setRevisionActionFilter] = useState<'ALL' | 'APPROVE' | 'REJECT' | 'SYSTEM'>('ALL');
    const [revisionReasonFilter, setRevisionReasonFilter] = useState<string>('ALL');
    const [revisionSearchTerm, setRevisionSearchTerm] = useState('');
    const [revisionPage, setRevisionPage] = useState(1);
    const [revisionPageSize, setRevisionPageSize] = useState(20);
    const [isLocating, setIsLocating] = useState(false);
    const [liveHistoryMode, setLiveHistoryMode] = useState<'ALL' | 'LATE' | 'OVERTIME'>('ALL');
    const [liveHistoryLimit, setLiveHistoryLimit] = useState(50);
    const [liveHistorySyncedAt, setLiveHistorySyncedAt] = useState(new Date());
    const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState(true);
    const [nextLiveRefreshIn, setNextLiveRefreshIn] = useState(LIVE_REFRESH_INTERVAL_SECONDS);
    const detailSectionRef = useRef<HTMLElement | null>(null);

    const officeLat = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LAT || '0');
    const officeLng = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LNG || '0');
    const officeRadiusMeters = Number(import.meta.env.VITE_ATTENDANCE_RADIUS_METERS || '300');
    const isGeofenceConfigured = Number.isFinite(officeLat) && Number.isFinite(officeLng) && officeLat !== 0 && officeLng !== 0;

    const employeeMap = useMemo(() => 
        new Map(employees.map(emp => [emp.id, emp])), 
    [employees]);

    const normalizeSearchText = (value?: string | null) => {
        return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    };

    const isSubsequenceMatch = (needle: string, haystack: string) => {
        if (!needle) return true;
        let idx = 0;
        for (const ch of haystack) {
            if (ch === needle[idx]) idx += 1;
            if (idx === needle.length) return true;
        }
        return false;
    };

    const normalizedSearchTerm = useMemo(() => normalizeSearchText(searchTerm), [searchTerm]);

    const matchesEmployeeSearch = (employee?: Employee) => {
        if (!employee) return false;

        if (selectedEmployeeId) {
            return employee.id === selectedEmployeeId;
        }

        if (!normalizedSearchTerm) return true;

        const normalizedFields = [employee.nama, employee.nik, employee.jabatan, employee.departemen]
            .map((field) => normalizeSearchText(String(field ?? '')))
            .filter(Boolean);

        const haystack = normalizedFields.join(' ');
        const compactHaystack = haystack.replace(/\s+/g, '');
        const initials = normalizedFields
            .map((field) => field.split(' ').filter(Boolean).map((word) => word[0]).join(''))
            .join(' ');
        const tokens = normalizedSearchTerm.split(' ').filter(Boolean);

        return tokens.every((token) => {
            if (haystack.includes(token) || initials.includes(token)) return true;
            if (token.length <= 2) return false;
            return isSubsequenceMatch(token, compactHaystack);
        });
    };

    const matchingEmployees = useMemo(() => {
        return [...employees]
            .filter((employee) => matchesEmployeeSearch(employee))
            .slice(0, 8);
    }, [employees, normalizedSearchTerm]);

    const selectedEmployee = useMemo(
        () => (selectedEmployeeId ? employees.find((employee) => employee.id === selectedEmployeeId) || null : null),
        [employees, selectedEmployeeId]
    );

    const attendanceSummaryByEmployee = useMemo(() => {
        const summary = new Map<string, { total: number; late: number; latestDate: string | null }>();

        attendanceRecords.forEach((record) => {
            const current = summary.get(record.employeeId) || { total: 0, late: 0, latestDate: null };
            current.total += 1;
            if (record.isLate) current.late += 1;
            if (!current.latestDate || record.tanggal > current.latestDate) {
                current.latestDate = record.tanggal;
            }
            summary.set(record.employeeId, current);
        });

        return summary;
    }, [attendanceRecords]);

    const calculateAttendanceDetails = (employeeId: string, clockIn: string, clockOut: string, recordDate?: string) => {
        const employee = employeeMap.get(employeeId);
        if (!employee) return { isLate: false, overtimeHours: 0 };

        // Resolve shift definition: use activeShiftDefs (system settings / unit override)
        const shiftDef = activeShiftDefs.find(s => s.name === employee.shift);

        // Determine day-of-week to apply weekend override via getScheduleForDay
        let shiftStartStr = '08:00';
        let shiftEndStr = '16:00';
        if (shiftDef) {
            const dateStr = recordDate || new Date().toISOString().split('T')[0];
            const dow = new Date(dateStr).getDay(); // 0=Sun, 6=Sat
            const weekDayKey = WEEK_DAYS[dow === 0 ? 6 : dow - 1]; // map JS day → WeekDay
            const sched = getScheduleForDay(shiftDef, weekDayKey);
            if (sched) {
                shiftStartStr = sched.startTime;
                shiftEndStr   = sched.endTime;
            }
        }

        const tolerance = shiftDef?.lateToleranceMinutes ?? 15;

        // Calculate shift duration from definition (not hardcoded 8h)
        const [defStartH, defStartM] = shiftStartStr.split(':').map(Number);
        const [defEndH,   defEndM]   = shiftEndStr.split(':').map(Number);
        let defDuration = (defEndH + defEndM / 60) - (defStartH + defStartM / 60);
        if (defDuration <= 0) defDuration += 24; // overnight

        const [clockInHour, clockInMinute] = clockIn.split(':').map(Number);
        const clockInTotal = clockInHour * 60 + clockInMinute;
        const startTotal   = defStartH * 60 + defStartM + tolerance;
        const isLate = clockInTotal > startTotal;

        const [clockOutHour, clockOutMinute] = clockOut.split(':').map(Number);
        const clockInTime  = clockInHour  + clockInMinute  / 60;
        let   clockOutTime = clockOutHour + clockOutMinute / 60;
        if (clockOutTime < clockInTime) clockOutTime += 24;

        const workDuration  = clockOutTime - clockInTime;
        const overtimeHours = Math.max(0, parseFloat((workDuration - defDuration).toFixed(2)));

        return { isLate, overtimeHours };
    };

    const handleRecalculate = async () => {
        if (!recalcFrom || !recalcTo) return;
        setRecalculating(true);
        setRecalcResult(null);
        try {
            const res = await recalculateAttendanceMetrics(
                recalcFrom, recalcTo, activeShiftDefs,
                recalcSource === 'all' ? undefined : recalcSource
            );
            setRecalcResult(res);
        } catch (e: any) {
            setRecalcResult({ updated: 0, skipped: 0, errors: 1 });
        } finally {
            setRecalculating(false);
        }
    };

    const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371000 * c;
    };

    const loadPendingRequests = async () => {
        if (!onLoadPendingRequests) return;
        setLoadingPending(true);
        try {
            const data = await onLoadPendingRequests();
            setPendingRequests(data || []);
        } finally {
            setLoadingPending(false);
        }
    };

    const loadRevisionHistory = async () => {
        if (!onLoadRevisionHistory) return;
        setLoadingRevision(true);
        try {
            const data = await onLoadRevisionHistory();
            setRevisionHistory(data || []);
        } finally {
            setLoadingRevision(false);
        }
    };

    React.useEffect(() => {
        if (!isApprovalDrawerOpen) return;
        void loadPendingRequests();
    }, [isApprovalDrawerOpen]);

    React.useEffect(() => {
        if (!selectedEmployeeId) {
            setRevisionHistory([]);
            return;
        }

        void loadRevisionHistory();
    }, [selectedEmployeeId]);

    const handleCaptureCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Browser tidak mendukung geolocation.');
            return;
        }

        setIsLocating(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                });
            });

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            let verified = true;
            let distance = '';

            if (isGeofenceConfigured) {
                const meters = calculateDistanceMeters(lat, lng, officeLat, officeLng);
                distance = String(Math.round(meters));
                verified = meters <= officeRadiusMeters;
            }

            setNewRecord((prev) => ({
                ...prev,
                latitude: String(lat),
                longitude: String(lng),
                locationDistanceMeters: distance,
                locationVerified: verified,
            }));
        } catch {
            alert('Gagal mengambil lokasi saat ini. Aktifkan izin lokasi lalu coba lagi.');
        } finally {
            setIsLocating(false);
        }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageAttendance) {
            alert('Akses ditolak. Anda tidak memiliki izin input absensi operasional.');
            return;
        }

        if (!newRecord.employeeId || !newRecord.clockIn || !newRecord.clockOut) {
            alert("Harap lengkapi semua field.");
            return;
        }

        if (!newRecord.reasonCode) {
            alert('Reason code wajib dipilih untuk perubahan absensi manual.');
            return;
        }

        if (!newRecord.latitude || !newRecord.longitude) {
            alert('Koordinat GPS wajib diisi untuk verifikasi lokasi maker.');
            return;
        }
        
        const { isLate, overtimeHours } = calculateAttendanceDetails(newRecord.employeeId, newRecord.clockIn, newRecord.clockOut, newRecord.tanggal);

        setIsSaving(true);
        try {
            const saved = await onSave({
                ...newRecord,
                isLate,
                overtimeHours,
                latitude: Number(newRecord.latitude),
                longitude: Number(newRecord.longitude),
                reasonCode: newRecord.reasonCode,
                reasonDetail: newRecord.reasonDetail,
                locationDistanceMeters: newRecord.locationDistanceMeters ? Number(newRecord.locationDistanceMeters) : null,
                locationVerified: newRecord.locationVerified,
            } as any);
            if (!saved) return;

            setNewRecord({
                employeeId: '',
                tanggal: today,
                clockIn: '',
                clockOut: '',
                location: 'RS Utama (Manual)',
                notes: '',
                source: 'web-admin',
                reasonCode: '',
                reasonDetail: '',
                latitude: '',
                longitude: '',
                locationDistanceMeters: '',
                locationVerified: false,
            });

            void loadPendingRequests();
        } finally {
            setIsSaving(false);
        }
    };

    const handleApproveRequest = async (requestId: string) => {
        if (!onApproveRequest) return;
        const note = window.prompt('Catatan approval (opsional):', '') || '';
        const approved = await onApproveRequest(requestId, note);
        if (approved) {
            void loadPendingRequests();
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        if (!onRejectRequest) return;
        const note = window.prompt('Alasan reject (wajib):', '') || '';
        if (!note.trim()) {
            alert('Alasan reject wajib diisi.');
            return;
        }
        const rejected = await onRejectRequest(requestId, note);
        if (rejected) {
            void loadPendingRequests();
        }
    };
    
    const filteredRecords = useMemo(() => {
        return attendanceRecords
            .map(record => ({
                ...record,
                employeeName: employeeMap.get(record.employeeId)?.nama || 'N/A',
                employeeMeta: employeeMap.get(record.employeeId),
            }))
            .filter(record => matchesEmployeeSearch(record.employeeMeta))
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, employeeMap, normalizedSearchTerm]);

    const personalAttendanceRecords = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return filteredRecords.filter((record) => record.employeeId === selectedEmployeeId);
    }, [filteredRecords, selectedEmployeeId]);

    const scopedRevisionHistory = useMemo(() => {
        if (!selectedEmployeeId) return [];
        return revisionHistory.filter((item) => item.employee_id === selectedEmployeeId);
    }, [revisionHistory, selectedEmployeeId]);

    const revisionReasonOptions = useMemo(() => {
        const reasonSet = new Set<string>();
        scopedRevisionHistory.forEach((item) => {
            if (item.reason_code) reasonSet.add(item.reason_code);
        });
        return [...reasonSet].sort((a, b) => a.localeCompare(b));
    }, [scopedRevisionHistory]);

    const filteredRevisionHistory = useMemo(() => {
        const normalizedSearch = revisionSearchTerm.trim().toLowerCase();

        return scopedRevisionHistory
            .filter((item) => revisionActionFilter === 'ALL' || item.action === revisionActionFilter)
            .filter((item) => revisionReasonFilter === 'ALL' || (item.reason_code || '') === revisionReasonFilter)
            .filter((item) => {
                if (!normalizedSearch) return true;

                const employeeName = employeeMap.get(item.employee_id)?.nama || '';
                return [
                    employeeName,
                    item.employee_id,
                    item.reason_code,
                    item.reason_detail,
                    item.attendance_date,
                    item.action,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
            });
    }, [employeeMap, revisionActionFilter, revisionReasonFilter, revisionSearchTerm, scopedRevisionHistory]);

    const liveHistorySourceRecords = useMemo(() => {
        return selectedEmployeeId ? personalAttendanceRecords : filteredRecords;
    }, [selectedEmployeeId, personalAttendanceRecords, filteredRecords]);

    const totalRevisionPages = useMemo(
        () => Math.max(1, Math.ceil(filteredRevisionHistory.length / revisionPageSize)),
        [filteredRevisionHistory.length, revisionPageSize]
    );

    const liveHistoryRecords = useMemo(() => {
        return liveHistorySourceRecords
            .filter((record) => {
                if (liveHistoryMode === 'LATE') return record.isLate;
                if (liveHistoryMode === 'OVERTIME') return (record.overtimeHours || 0) > 0;
                return true;
            })
            .slice(0, liveHistoryLimit);
    }, [liveHistoryLimit, liveHistoryMode, liveHistorySourceRecords]);

    const pagedRevisionHistory = useMemo(() => {
        const start = (revisionPage - 1) * revisionPageSize;
        return filteredRevisionHistory.slice(start, start + revisionPageSize);
    }, [filteredRevisionHistory, revisionPage, revisionPageSize]);

    React.useEffect(() => {
        setRevisionPage(1);
    }, [revisionActionFilter, revisionReasonFilter, revisionSearchTerm, revisionPageSize]);

    React.useEffect(() => {
        if (revisionPage > totalRevisionPages) {
            setRevisionPage(totalRevisionPages);
        }
    }, [revisionPage, totalRevisionPages]);

    React.useEffect(() => {
        setLiveHistorySyncedAt(new Date());
    }, [attendanceRecords]);

    React.useEffect(() => {
        if (!isLiveAutoRefresh) return;

        const timer = window.setInterval(() => {
            setNextLiveRefreshIn((prev) => {
                if (prev <= 1) {
                    setLiveHistorySyncedAt(new Date());
                    return LIVE_REFRESH_INTERVAL_SECONDS;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [isLiveAutoRefresh]);

    const refreshLiveHistory = () => {
        setLiveHistorySyncedAt(new Date());
        setNextLiveRefreshIn(LIVE_REFRESH_INTERVAL_SECONDS);
    };

    const exportCsv = (fileName: string, rows: Array<Record<string, string | number | boolean | null>>) => {
        if (!rows.length) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        const headers = Object.keys(rows[0]);
        const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportAttendance = () => {
        if (!selectedEmployeeId) {
            alert('Pilih karyawan terlebih dahulu pada menu personal.');
            return;
        }

        exportCsv(`attendance-report-${Date.now()}.csv`, personalAttendanceRecords.map((record) => ({
            employee_name: record.employeeName,
            employee_id: record.employeeId,
            tanggal: record.tanggal,
            clock_in: record.clockIn,
            clock_out: record.clockOut,
            is_late: record.isLate,
            overtime_hours: record.overtimeHours,
            location: record.location,
        })));
    };

    const exportRevisionHistory = () => {
        if (!selectedEmployeeId) {
            alert('Pilih karyawan terlebih dahulu pada menu personal.');
            return;
        }

        exportCsv(`attendance-revision-history-${Date.now()}.csv`, filteredRevisionHistory.map((item) => ({
            id: item.id,
            employee_name: employeeMap.get(item.employee_id)?.nama || item.employee_id,
            employee_id: item.employee_id,
            attendance_date: item.attendance_date,
            action: item.action,
            reason_code: item.reason_code || '',
            reason_detail: item.reason_detail || '',
            changed_by: item.changed_by || '',
            created_at: item.created_at,
        })));
    };

    return (
        <div className="space-y-2">
            <div className="fixed left-64 right-0 top-0 z-30 bg-gray-50 px-6 pt-2">
                <section className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-xl font-bold text-[#06736a]">{isReportMode ? 'Laporan Kehadiran Karyawan' : 'Kehadiran Karyawan (Live)'}</h2>
                            <p className="mt-1 text-sm text-gray-600">{isReportMode ? 'Ringkasan operasional absensi untuk monitoring dan audit kehadiran.' : 'Pantau histori operasional absensi terbaru secara realtime.'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 xl:min-w-[500px]">
                            <button
                                type="button"
                                onClick={() => setIsApprovalDrawerOpen(true)}
                                className="rounded-lg border border-[#06736a]/30 bg-[#e6f3f2] px-3 py-1.5 text-left hover:bg-[#d6ecea]"
                            >
                                <p className="text-xs uppercase tracking-wide text-[#06736a]">Approval Queue</p>
                                <p className="font-semibold text-[#055f57]">{pendingRequests.length} pending request</p>
                            </button>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Dibuat</p>
                                <p className="font-semibold text-gray-800">{generatedAt.toLocaleDateString('id-ID')}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Jam Cetak</p>
                                <p className="font-semibold text-gray-800">{generatedAt.toLocaleTimeString('id-ID')}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="h-[84px] lg:h-[80px] xl:h-[72px]" aria-hidden="true" />

            {isReportMode && (
                <>
            <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
                    <div className="lg:col-span-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Cari Karyawan</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Masukkan nama karyawan"
                                value={searchTerm}
                                onFocus={() => setIsSearchDropdownOpen(true)}
                                onBlur={() => {
                                    window.setTimeout(() => setIsSearchDropdownOpen(false), 120);
                                }}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedEmployeeId(null);
                                    setIsSearchDropdownOpen(true);
                                }}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            />

                            {isSearchDropdownOpen && normalizedSearchTerm && (
                                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {matchingEmployees.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-gray-500">Tidak ada karyawan yang cocok.</p>
                                    ) : (
                                        matchingEmployees.map((employee) => (
                                            <button
                                                key={employee.id}
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm(employee.nama);
                                                    setSelectedEmployeeId(employee.id);
                                                    setIsSearchDropdownOpen(false);
                                                }}
                                                className="flex w-full items-start justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-[#f2faf9]"
                                            >
                                                <span className="truncate text-xs font-medium text-gray-900">{employee.nama}</span>
                                                <span className="shrink-0 text-[11px] text-gray-500">{employee.nik || '-'}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedEmployeeId && (
                            <div className="mt-1 flex items-center justify-between">
                                <p className="text-[11px] text-emerald-700">Karyawan dipilih: {searchTerm}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedEmployeeId(null);
                                        setSearchTerm('');
                                    }}
                                    className="text-[11px] font-semibold text-[#06736a] hover:underline"
                                >
                                    Tampilkan semua
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-1">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Menu Cepat</label>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedEmployee) {
                                    onOpenEmployeeHistory?.(selectedEmployee);
                                    return;
                                }
                                detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-full rounded-lg bg-[#06736a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#055f57]"
                        >
                            Detail Laporan
                        </button>
                    </div>
                </div>
            </section>

            <section ref={detailSectionRef} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-[#06736a]" />
                    <div>
                        <h3 className="text-sm font-bold text-[#06736a]">Cari Karyawan untuk Detail Laporan</h3>
                        <p className="text-xs text-gray-500">Pilih karyawan untuk membuka detail laporan absensi personal.</p>
                    </div>
                </div>
                {matchingEmployees.length === 0 ? (
                    <p className="text-sm text-gray-500">Tidak ada karyawan yang cocok dengan kata kunci pencarian.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {matchingEmployees.map((employee) => {
                            const summary = attendanceSummaryByEmployee.get(employee.id);
                            return (
                                <div key={employee.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-[#06736a]/30 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <img
                                            src={employee.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nama)}&background=random`}
                                            alt={employee.nama}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-900">{employee.nama}</p>
                                            <p className="truncate text-xs text-gray-500">{employee.jabatan} · {employee.departemen}</p>
                                            <p className="mt-1 text-xs text-gray-500">NIK: {employee.nik || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Riwayat: {summary?.total || 0}</span>
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Terlambat: {summary?.late || 0}</span>
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Terakhir: {summary?.latestDate || '-'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenEmployeeHistory?.(employee)}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06736a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#055f57]"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Lihat Detail Laporan
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            </>
            )}

            {!isReportMode && (
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <ClockIcon className="h-5 w-5 text-[#06736a]" />
                            <h3 className="text-lg font-bold text-[#06736a]">Live History Absensi Karyawan</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                            {selectedEmployee ? `Pantau histori absensi personal untuk ${selectedEmployee.nama}.` : 'Pantau histori operasional absensi terbaru untuk semua karyawan.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">Total baris: {liveHistoryRecords.length}</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">Sinkron: {liveHistorySyncedAt.toLocaleTimeString('id-ID')}</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">Refresh berikutnya: {isLiveAutoRefresh ? `${nextLiveRefreshIn} dtk` : 'manual'}</span>
                    </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <select
                        value={liveHistoryMode}
                        onChange={(e) => setLiveHistoryMode(e.target.value as 'ALL' | 'LATE' | 'OVERTIME')}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Filter mode live history"
                    >
                        <option value="ALL">Semua Histori</option>
                        <option value="LATE">Hanya Terlambat</option>
                        <option value="OVERTIME">Hanya Lembur</option>
                    </select>
                    <select
                        value={liveHistoryLimit}
                        onChange={(e) => setLiveHistoryLimit(Number(e.target.value))}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Jumlah data live history"
                    >
                        <option value={25}>25 data terbaru</option>
                        <option value={50}>50 data terbaru</option>
                        <option value={100}>100 data terbaru</option>
                        <option value={200}>200 data terbaru</option>
                    </select>
                    <button type="button" onClick={refreshLiveHistory} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        Refresh Live
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const nextValue = !isLiveAutoRefresh;
                            setIsLiveAutoRefresh(nextValue);
                            if (nextValue) setNextLiveRefreshIn(LIVE_REFRESH_INTERVAL_SECONDS);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${isLiveAutoRefresh ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Auto Refresh: {isLiveAutoRefresh ? 'ON' : 'OFF'}
                    </button>
                </div>

                {liveHistoryRecords.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
                                    {selectedEmployee ? null : (
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Karyawan</th>
                                    )}
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Masuk</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pulang</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lembur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {liveHistoryRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{new Date(record.tanggal).toLocaleDateString('id-ID')}</td>
                                        {selectedEmployee ? null : (
                                            <td className="px-4 py-3 text-sm text-gray-700">{employeeMap.get(record.employeeId)?.nama || record.employeeId || '-'}</td>
                                        )}
                                        <td className={`whitespace-nowrap px-4 py-3 text-sm ${record.isLate ? 'font-semibold text-red-600' : 'text-gray-700'}`}>{record.clockIn}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{record.clockOut}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            {record.isLate ? (
                                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Terlambat</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Tepat Waktu</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{record.overtimeHours > 0 ? `${record.overtimeHours} jam` : '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <span className="inline-flex items-center gap-1">
                                                <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                {record.location}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Tidak ada data live history pada filter yang dipilih.</div>
                )}
            </section>
            )}

            {!isReportMode && (
            <FaceVerificationDashboard />
            )}

            {isReportMode && (
            <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-700">Live History Absensi kini tersedia langsung di halaman Kehadiran.</p>
                <p className="mt-1 text-xs text-gray-500">Gunakan tab Kehadiran (Live) di menu samping untuk memantau data secara realtime.</p>
            </section>
            )}

            {isApprovalDrawerOpen && (
                <div className="fixed inset-0 z-50">
                    <button
                        type="button"
                        aria-label="Tutup panel approval"
                        className="absolute inset-0 bg-black/35"
                        onClick={() => setIsApprovalDrawerOpen(false)}
                    />
                    <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Workflow</p>
                                    <h3 className="text-lg font-bold text-[#06736a]">Approval Queue</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsApprovalDrawerOpen(false)}
                                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 p-4">
                            <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                <div className="mb-2 flex items-center justify-between gap-1.5">
                                    <h3 className="text-sm font-bold text-primary flex items-center gap-1.5"><ClockIcon className="w-4 h-4" />Input Manual</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowManualForm(prev => !prev)}
                                        className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2]"
                                    >
                                        {showManualForm ? 'Sembunyikan' : 'Tampilkan'}
                                    </button>
                                </div>
                                {!canManageAttendance && (
                                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                        Mode baca saja: akun Anda tidak memiliki izin untuk membuat atau memperbarui catatan absensi operasional.
                                    </div>
                                )}
                                {showManualForm ? (
                                    <form onSubmit={handleSaveRecord} className="grid grid-cols-1 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Karyawan</label>
                                            <select
                                                value={newRecord.employeeId}
                                                onChange={e => setNewRecord({ ...newRecord, employeeId: e.target.value })}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                disabled={!canManageAttendance || isSaving}
                                                required
                                                title="Pilih karyawan"
                                            >
                                                <option value="">Pilih Karyawan</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nama}</option>)}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                                                <input type="date" value={newRecord.tanggal} onChange={e => setNewRecord({ ...newRecord, tanggal: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Tanggal kehadiran" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Lokasi</label>
                                                <input type="text" value={newRecord.location} onChange={e => setNewRecord({ ...newRecord, location: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" placeholder="RS Utama / GPS kantor" title="Lokasi kehadiran" disabled={!canManageAttendance || isSaving} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason Code *</label>
                                                <select
                                                    value={newRecord.reasonCode}
                                                    onChange={e => setNewRecord({ ...newRecord, reasonCode: e.target.value as AttendanceReasonCode })}
                                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                    disabled={!canManageAttendance || isSaving}
                                                    required
                                                    title="Reason code perubahan absensi"
                                                >
                                                    <option value="">Pilih Reason Code</option>
                                                    {ATTENDANCE_REASON_CODE_OPTIONS.map(option => (
                                                        <option key={option.code} value={option.code}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Detail Alasan</label>
                                                <input
                                                    type="text"
                                                    value={newRecord.reasonDetail}
                                                    onChange={e => setNewRecord({ ...newRecord, reasonDetail: e.target.value })}
                                                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                    placeholder="Contoh: perangkat fingerprint error shift pagi"
                                                    disabled={!canManageAttendance || isSaving}
                                                    title="Detail alasan perubahan"
                                                />
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Verifikasi Lokasi Maker</p>
                                                <button
                                                    type="button"
                                                    onClick={handleCaptureCurrentLocation}
                                                    disabled={!canManageAttendance || isSaving || isLocating}
                                                    className="rounded-lg border border-[#06736a]/30 px-2.5 py-1 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isLocating ? 'Mengambil GPS...' : 'Ambil GPS Saat Ini'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Latitude *</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={newRecord.latitude}
                                                        onChange={e => setNewRecord({ ...newRecord, latitude: e.target.value })}
                                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                        disabled={!canManageAttendance || isSaving}
                                                        required
                                                        placeholder="Contoh: -6.200000"
                                                        title="Koordinat latitude maker"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Longitude *</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={newRecord.longitude}
                                                        onChange={e => setNewRecord({ ...newRecord, longitude: e.target.value })}
                                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                        disabled={!canManageAttendance || isSaving}
                                                        required
                                                        placeholder="Contoh: 106.816666"
                                                        title="Koordinat longitude maker"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                                <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">
                                                    Jarak ke kantor: {newRecord.locationDistanceMeters ? `${newRecord.locationDistanceMeters} m` : '-'}
                                                </span>
                                                <span className={`rounded-full px-2 py-1 border ${newRecord.locationVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                                    {newRecord.locationVerified ? 'Lokasi terverifikasi' : 'Lokasi belum terverifikasi'}
                                                </span>
                                                {isGeofenceConfigured && (
                                                    <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">
                                                        Radius geofence: {officeRadiusMeters} m
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Jam Masuk</label>
                                                <input type="time" value={newRecord.clockIn} onChange={e => setNewRecord({ ...newRecord, clockIn: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam masuk" disabled={!canManageAttendance || isSaving} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Jam Pulang</label>
                                                <input type="time" value={newRecord.clockOut} onChange={e => setNewRecord({ ...newRecord, clockOut: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam pulang" disabled={!canManageAttendance || isSaving} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan / Alasan</label>
                                            <textarea
                                                value={newRecord.notes}
                                                onChange={e => setNewRecord({ ...newRecord, notes: e.target.value })}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                                rows={3}
                                                placeholder="Masukkan keterangan untuk audit kehadiran manual"
                                                title="Catatan atau alasan manual"
                                                disabled={!canManageAttendance || isSaving}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!canManageAttendance || isSaving}
                                            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSaving ? 'Mengirim request...' : 'Kirim Request Perubahan'}
                                        </button>
                                    </form>
                                ) : (
                                    <p className="text-sm text-gray-500">Panel input manual disembunyikan.</p>
                                )}
                            </section>

                            <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-[#06736a]">Maker-Checker Queue</h3>
                                    <button
                                        type="button"
                                        onClick={() => void loadPendingRequests()}
                                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {loadingPending ? (
                                    <p className="text-sm text-gray-500">Memuat pending request...</p>
                                ) : pendingRequests.length === 0 ? (
                                    <p className="text-sm text-gray-500">Tidak ada request absensi yang menunggu approval.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {pendingRequests.map((request) => {
                                            const isOwnRequest = Boolean(currentUserId && request.maker_user_id === currentUserId);
                                            return (
                                                <div key={request.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-xs font-semibold text-gray-900">{request.employee_id} · {request.attendance_date}</p>
                                                            <p className="text-xs text-gray-600">Reason: {request.reason_code}</p>
                                                            {request.reason_detail && <p className="text-xs text-gray-500 mt-0.5">{request.reason_detail}</p>}
                                                        </div>
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Pending</span>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs border ${request.location_verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                                            {request.location_verified ? 'Lokasi Verified' : 'Lokasi Unverified'}
                                                        </span>
                                                        {request.location_distance_meters !== null && request.location_distance_meters !== undefined && (
                                                            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                                                                Jarak: {Math.round(request.location_distance_meters)} m
                                                            </span>
                                                        )}
                                                    </div>

                                                    {canApproveAttendanceRequests && !isOwnRequest && (
                                                        <div className="mt-2 flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleApproveRequest(request.id)}
                                                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleRejectRequest(request.id)}
                                                                className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}

                                                    {canApproveAttendanceRequests && isOwnRequest && (
                                                        <p className="mt-2 text-xs text-amber-700">Request ini dibuat oleh akun Anda. Maker tidak dapat menjadi checker.</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </div>
                    </aside>
                </div>
            )}

            {/* ── Recalculate Metrics Panel (admin/report mode only) ── */}
            {isReportMode && canManageAttendance && (
                <section className="rounded-xl border border-orange-200 bg-orange-50 p-5 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🔄</span>
                        <h4 className="font-semibold text-orange-900 text-sm">Hitung Ulang Terlambat & Lembur</h4>
                        <span className="text-xs text-orange-700 ml-1">— untuk data Hikvision / biometrik yang belum terhitung</span>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="block text-xs text-orange-700 mb-1">Dari Tanggal</label>
                            <input type="date" value={recalcFrom} onChange={e => setRecalcFrom(e.target.value)}
                                className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-orange-700 mb-1">Sampai Tanggal</label>
                            <input type="date" value={recalcTo} onChange={e => setRecalcTo(e.target.value)}
                                className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-orange-700 mb-1">Sumber Data</label>
                            <select value={recalcSource} onChange={e => setRecalcSource(e.target.value as any)}
                                className="px-3 py-2 text-sm border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white">
                                <option value="hikvision">Hikvision saja</option>
                                <option value="mobile">Mobile saja</option>
                                <option value="all">Semua sumber</option>
                            </select>
                        </div>
                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating || !recalcFrom || !recalcTo}
                            className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium transition-colors"
                        >
                            {recalculating ? '⏳ Menghitung...' : '🔄 Hitung Ulang'}
                        </button>
                    </div>
                    {recalcResult && (
                        <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${recalcResult.errors > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {recalcResult.errors > 0
                                ? `⚠️ Selesai dengan error: ${recalcResult.updated} diperbarui, ${recalcResult.skipped} dilewati, ${recalcResult.errors} error`
                                : `✅ Berhasil: ${recalcResult.updated} rekaman diperbarui, ${recalcResult.skipped} dilewati`
                            }
                        </div>
                    )}
                    <p className="mt-2 text-xs text-orange-600">
                        ⓘ Proses ini membaca jadwal karyawan dari <code>employee_schedules</code> (atau definisi shift aktif) lalu memperbarui kolom <code>is_late</code> dan <code>overtime_hours</code> di database. Muat ulang halaman setelah selesai.
                    </p>
                </section>
            )}
        </div>
    );
};

export default AttendanceManagement;

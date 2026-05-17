import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Employee, AttendanceRecord, WorkUnit, AttendanceRevisionHistory } from '../types.ts';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, PrinterIcon } from './icons.tsx';
import { dataService } from '../services/DataService';
import { useAppDataActions } from '../stores/appStore';
import { mapAttendanceRecordToUI, sortAttendanceByDateDesc } from '../utils/dataMapping';

interface EmployeeAttendanceDetailProps {
    employee: Employee;
    attendanceRecords: AttendanceRecord[];
    workUnit?: WorkUnit;
    onLoadRevisionHistory?: () => Promise<AttendanceRevisionHistory[]>;
    onBack: () => void;
}

const EmployeeAttendanceDetail: React.FC<EmployeeAttendanceDetailProps> = ({ employee, attendanceRecords, workUnit, onLoadRevisionHistory, onBack }) => {
    const { setAttendanceRecords } = useAppDataActions();

    const refreshAttendanceData = useCallback(async () => {
        const result = await dataService.getAttendance();
        if (result.success && result.data) {
            setAttendanceRecords(sortAttendanceByDateDesc((result.data as any[]).map(mapAttendanceRecordToUI)));
        }
        setLiveHistorySyncedAt(new Date());
        setNextLiveRefreshIn(30);
    }, [setAttendanceRecords]);
    const [monthFilter, setMonthFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [revisionHistory, setRevisionHistory] = useState<AttendanceRevisionHistory[]>([]);
    const [loadingRevision, setLoadingRevision] = useState(false);
    const [revisionActionFilter, setRevisionActionFilter] = useState<'ALL' | 'APPROVE' | 'REJECT' | 'SYSTEM'>('ALL');
    const [revisionReasonFilter, setRevisionReasonFilter] = useState<string>('ALL');
    const [revisionSearchTerm, setRevisionSearchTerm] = useState('');
    const [revisionPage, setRevisionPage] = useState(1);
    const [revisionPageSize, setRevisionPageSize] = useState(20);
    const [liveHistoryMode, setLiveHistoryMode] = useState<'ALL' | 'LATE' | 'OVERTIME'>('ALL');
    const [liveHistoryLimit, setLiveHistoryLimit] = useState(50);
    const [liveHistorySyncedAt, setLiveHistorySyncedAt] = useState(new Date());
    const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState(true);
    const [nextLiveRefreshIn, setNextLiveRefreshIn] = useState(30);

    const months = useMemo(() => {
        const values = new Set<string>();
        attendanceRecords.forEach((record) => {
            values.add(record.tanggal.slice(0, 7));
        });
        return [...values].sort((a, b) => b.localeCompare(a));
    }, [attendanceRecords]);

    const filteredRecords = useMemo(() => {
        return [...attendanceRecords]
            .filter((record) => monthFilter === 'all' || record.tanggal.startsWith(monthFilter))
            .filter((record) => {
                if (dateFilter.start && record.tanggal < dateFilter.start) return false;
                if (dateFilter.end && record.tanggal > dateFilter.end) return false;
                return true;
            })
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, dateFilter.end, dateFilter.start, monthFilter]);

    const formatTimeFromMinutes = (minutes: number) => {
        const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
        const hours = Math.floor(normalized / 60).toString().padStart(2, '0');
        const mins = Math.floor(normalized % 60).toString().padStart(2, '0');
        return `${hours}:${mins}`;
    };

    const stats = useMemo(() => {
        const total = filteredRecords.length;
        const late = filteredRecords.filter((record) => record.isLate).length;
        const overtime = Number(filteredRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(2));
        const presentDays = filteredRecords.filter((record) => !['Absen', 'Cuti', 'Sakit'].includes(record.status || '')).length;
        const firstDate = filteredRecords[filteredRecords.length - 1]?.tanggal || null;
        const lastDate = filteredRecords[0]?.tanggal || null;
        const lateRate = total ? Number(((late / total) * 100).toFixed(0)) : 0;
        const completionRate = total ? Number((filteredRecords.filter((record) => record.clockIn && record.clockOut).length / total * 100).toFixed(0)) : 0;

        return { total, late, overtime, presentDays, firstDate, lastDate, lateRate, completionRate };
    }, [filteredRecords]);

    const performanceMetrics = useMemo(() => {
        const totalRecords = filteredRecords.length;
        const onTimeRecords = filteredRecords.filter((record) => !record.isLate).length;
        const uniqueDays = new Set(filteredRecords.map((record) => record.tanggal)).size;
        const presentRecords = filteredRecords.filter((record) => record.clockIn && record.clockOut);
        const totalWorkHours = presentRecords.reduce((sum, record) => {
            const start = new Date(`${record.tanggal}T${record.clockIn}`);
            const end = new Date(`${record.tanggal}T${record.clockOut}`);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return sum;
            const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return sum + Math.max(diff, 0);
        }, 0);

        const parseTimeToMinutes = (clock?: string) => {
            if (!clock) return NaN;
            const [hours, minutes] = clock.split(':').map(Number);
            return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : NaN;
        };

        const validClockInMinutes = presentRecords
            .map((record) => parseTimeToMinutes(record.clockIn))
            .filter((value) => !Number.isNaN(value));
        const validClockOutMinutes = presentRecords
            .map((record) => parseTimeToMinutes(record.clockOut))
            .filter((value) => !Number.isNaN(value));

        const averageClockInTime = validClockInMinutes.length
            ? formatTimeFromMinutes(validClockInMinutes.reduce((sum, value) => sum + value, 0) / validClockInMinutes.length)
            : '-';
        const averageClockOutTime = validClockOutMinutes.length
            ? formatTimeFromMinutes(validClockOutMinutes.reduce((sum, value) => sum + value, 0) / validClockOutMinutes.length)
            : '-';

        const averageWorkHours = presentRecords.length ? Number((totalWorkHours / presentRecords.length).toFixed(2)) : 0;
        const onTimeRate = totalRecords ? Number(((onTimeRecords / totalRecords) * 100).toFixed(0)) : 0;
        const workdayCompletionRate = totalRecords ? Number(((presentRecords.length / totalRecords) * 100).toFixed(0)) : 0;

        return {
            totalRecords,
            uniqueDays,
            onTimeRecords,
            onTimeRate,
            totalWorkHours: Number(totalWorkHours.toFixed(2)),
            averageWorkHours,
            averageClockInTime,
            averageClockOutTime,
            workdayCompletionRate,
        };
    }, [filteredRecords]);

    const attendanceStatusCounts = useMemo(() => {
        return filteredRecords.reduce((counts, record) => {
            const status = record.status || (record.isLate ? 'Terlambat' : 'Hadir');
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    }, [filteredRecords]);

    const trendMetrics = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const weekStart = new Date(today);
        const dayOfWeek = (today.getDay() + 6) % 7;
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);

        const monthRecords = filteredRecords.filter((record) => {
            const date = new Date(record.tanggal);
            return !Number.isNaN(date.getTime()) && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const weekRecords = filteredRecords.filter((record) => {
            const date = new Date(record.tanggal);
            return !Number.isNaN(date.getTime()) && date >= weekStart && date <= today;
        });

        return {
            currentWeekCount: weekRecords.length,
            currentMonthCount: monthRecords.length,
            weekLateCount: weekRecords.filter((record) => record.isLate).length,
            monthLateCount: monthRecords.filter((record) => record.isLate).length,
            weekOvertimeCount: weekRecords.filter((record) => (record.overtimeHours || 0) > 0).length,
            monthOvertimeCount: monthRecords.filter((record) => (record.overtimeHours || 0) > 0).length,
        };
    }, [filteredRecords]);

    const liveHistoryRecords = useMemo(() => {
        return filteredRecords
            .filter((record) => {
                if (liveHistoryMode === 'LATE') return record.isLate;
                if (liveHistoryMode === 'OVERTIME') return (record.overtimeHours || 0) > 0;
                return true;
            })
            .slice(0, liveHistoryLimit);
    }, [filteredRecords, liveHistoryLimit, liveHistoryMode]);

    const personalRevisionHistory = useMemo(() => {
        return revisionHistory
            .filter((item) => item.employee_id === employee.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [employee.id, revisionHistory]);

    const revisionReasonOptions = useMemo(() => {
        const reasonSet = new Set<string>();
        personalRevisionHistory.forEach((item) => {
            if (item.reason_code) reasonSet.add(item.reason_code);
        });
        return [...reasonSet].sort((a, b) => a.localeCompare(b));
    }, [personalRevisionHistory]);

    const filteredRevisionHistory = useMemo(() => {
        const normalizedSearch = revisionSearchTerm.trim().toLowerCase();

        return personalRevisionHistory
            .filter((item) => revisionActionFilter === 'ALL' || item.action === revisionActionFilter)
            .filter((item) => revisionReasonFilter === 'ALL' || (item.reason_code || '') === revisionReasonFilter)
            .filter((item) => {
                if (!normalizedSearch) return true;

                return [
                    employee.nama,
                    item.reason_code,
                    item.reason_detail,
                    item.attendance_date,
                    item.action,
                    item.changed_by,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
            });
    }, [employee.nama, personalRevisionHistory, revisionActionFilter, revisionReasonFilter, revisionSearchTerm]);

    const totalRevisionPages = useMemo(
        () => Math.max(1, Math.ceil(filteredRevisionHistory.length / revisionPageSize)),
        [filteredRevisionHistory.length, revisionPageSize]
    );

    const pagedRevisionHistory = useMemo(() => {
        const start = (revisionPage - 1) * revisionPageSize;
        return filteredRevisionHistory.slice(start, start + revisionPageSize);
    }, [filteredRevisionHistory, revisionPage, revisionPageSize]);

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
        exportCsv(`attendance-personal-${String(employee?.nama || 'export').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`, filteredRecords.map((record) => ({
            employee_name: employee.nama,
            employee_id: employee.id,
            tanggal: record.tanggal,
            clock_in: record.clockIn,
            clock_out: record.clockOut,
            is_late: record.isLate,
            overtime_hours: record.overtimeHours,
            location: record.location,
        })));
    };

    const exportRevisionHistory = () => {
        exportCsv(`attendance-revision-personal-${String(employee?.nama || 'export').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`, filteredRevisionHistory.map((item) => ({
            id: item.id,
            employee_name: employee.nama,
            employee_id: item.employee_id,
            attendance_date: item.attendance_date,
            action: item.action,
            reason_code: item.reason_code || '',
            reason_detail: item.reason_detail || '',
            changed_by: item.changed_by || '',
            created_at: item.created_at,
        })));
    };

    useEffect(() => {
        if (!onLoadRevisionHistory) return;

        let mounted = true;
        setLoadingRevision(true);
        void onLoadRevisionHistory()
            .then((data) => {
                if (mounted) setRevisionHistory(data || []);
            })
            .finally(() => {
                if (mounted) setLoadingRevision(false);
            });

        return () => {
            mounted = false;
        };
    }, [onLoadRevisionHistory, employee.id]);

    useEffect(() => {
        setRevisionPage(1);
    }, [revisionActionFilter, revisionReasonFilter, revisionSearchTerm, revisionPageSize]);

    useEffect(() => {
        if (revisionPage > totalRevisionPages) {
            setRevisionPage(totalRevisionPages);
        }
    }, [revisionPage, totalRevisionPages]);

    useEffect(() => {
        setLiveHistorySyncedAt(new Date());
    }, [attendanceRecords]);

    useEffect(() => {
        if (!isLiveAutoRefresh) return;

        const timer = window.setInterval(() => {
            setNextLiveRefreshIn((prev) => {
                if (prev <= 1) {
                    void refreshAttendanceData();
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [isLiveAutoRefresh, refreshAttendanceData]);

    const refreshLiveHistory = () => {
        void refreshAttendanceData();
    };

    const printReport = () => window.print();

    return (
        <div className="space-y-6 print:space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:shadow-none">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                        <img
                            src={employee.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nama)}&background=random`}
                            alt={employee.nama}
                            className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#e6f3f2]"
                        />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#06736a]">Detail Absensi Karyawan</p>
                            <h2 className="mt-1 text-2xl font-bold text-gray-900">{employee.nama}</h2>
                            <p className="text-sm text-gray-600">{employee.jabatan} - {employee.departemen}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="rounded-full bg-gray-100 px-3 py-1">NIK: {employee.nik || '-'}</span>
                                <span className="rounded-full bg-gray-100 px-3 py-1">Unit: {workUnit?.nama || '-'}</span>
                                <span className="rounded-full bg-gray-100 px-3 py-1">Shift: {employee.shift}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <button
                            type="button"
                            onClick={printReport}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Cetak
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055f57]"
                        >
                            Kembali
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Bulan</label>
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Filter bulan absensi"
                        >
                            <option value="all">Semua bulan</option>
                            {months.map((month) => (
                                <option key={month} value={month}>
                                    {new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal mulai absensi"
                            placeholder="Pilih tanggal mulai"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Akhir</label>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal akhir absensi"
                            placeholder="Pilih tanggal akhir"
                        />
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-6">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total Absensi</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Hari Terdata</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.presentDays}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Terlambat</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.late}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Total Lembur</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.overtime} jam</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Late Rate</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.lateRate}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Kelengkapan Kehadiran</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <ClockIcon className="h-5 w-5 text-[#06736a]" />
                            <h3 className="text-lg font-bold text-[#06736a]">Live History Absensi Personal</h3>
                        </div>
                        <p className="text-xs text-gray-500">Pantau histori kehadiran {employee.nama} secara realtime dan filter berdasarkan status kehadiran.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">Total baris: {liveHistoryRecords.length}</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">Sinkron: {liveHistorySyncedAt.toLocaleTimeString('id-ID')}</span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">Refresh berikutnya: {isLiveAutoRefresh ? `${nextLiveRefreshIn} dtk` : 'manual'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-6 mb-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Hari Terdata</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.uniqueDays}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Jam Kerja Rata-rata</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.averageWorkHours} jam</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">On Time Rate</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.onTimeRate}%</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Total Jam Kerja</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.totalWorkHours} jam</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Rata-rata Masuk</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.averageClockInTime}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Rata-rata Pulang</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{performanceMetrics.averageClockOutTime}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-4 mb-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Minggu Ini</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{trendMetrics.currentWeekCount}</p>
                        <p className="mt-1 text-xs text-gray-500">{trendMetrics.weekLateCount} terlambat · {trendMetrics.weekOvertimeCount} lembur</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Bulan Ini</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{trendMetrics.currentMonthCount}</p>
                        <p className="mt-1 text-xs text-gray-500">{trendMetrics.monthLateCount} terlambat · {trendMetrics.monthOvertimeCount} lembur</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Status Kehadiran</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{(attendanceStatusCounts['Hadir'] || 0) + (attendanceStatusCounts['Terlambat'] || 0)}</p>
                        <p className="mt-1 text-xs text-gray-500">Total Hadir + Terlambat</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Jenis Status</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{Object.keys(attendanceStatusCounts).length}</p>
                        <p className="mt-1 text-xs text-gray-500">Status unik dalam periode filter</p>
                    </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <select
                        value={liveHistoryMode}
                        onChange={(e) => setLiveHistoryMode(e.target.value as 'ALL' | 'LATE' | 'OVERTIME')}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Filter status live history"
                    >
                        <option value="ALL">Semua Histori</option>
                        <option value="LATE">Hanya Terlambat</option>
                        <option value="OVERTIME">Hanya Lembur</option>
                    </select>
                    <select
                        value={liveHistoryLimit}
                        onChange={(e) => setLiveHistoryLimit(Number(e.target.value))}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Jumlah baris live history"
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
                            if (nextValue) setNextLiveRefreshIn(30);
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Masuk</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pulang</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Durasi</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lembur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {liveHistoryRecords.map((record) => {
                                    const start = new Date(`${record.tanggal}T${record.clockIn}`);
                                    const end = new Date(`${record.tanggal}T${record.clockOut}`);
                                    const duration = record.clockIn && record.clockOut && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                                        ? `${Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0).toFixed(2)} jam`
                                        : '-';
                                    const statusLabel = record.status || (record.isLate ? 'Terlambat' : 'Hadir');
                                    const statusClass = record.isLate ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{new Date(record.tanggal).toLocaleDateString('id-ID')}</td>
                                            <td className={`whitespace-nowrap px-4 py-3 text-sm ${record.isLate ? 'font-semibold text-red-600' : 'text-gray-700'}`}>{record.clockIn}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{record.clockOut}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{duration}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{record.overtimeHours > 0 ? `${record.overtimeHours} jam` : '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                                                    {record.location || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{record.notes || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">Tidak ada data live history pada filter yang dipilih.</div>
                )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <ClockIcon className="h-5 w-5 text-[#06736a]" />
                            <h3 className="text-lg font-bold text-[#06736a]">Riwayat Revisi Personal Karyawan</h3>
                        </div>
                        <p className="text-xs text-gray-500">Log revisi absensi personal untuk {employee.nama}.</p>
                    </div>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">Total baris: {filteredRevisionHistory.length}</span>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={revisionSearchTerm}
                        onChange={(e) => setRevisionSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 md:w-56"
                        placeholder="Cari reason/catatan"
                    />
                    <select
                        value={revisionActionFilter}
                        onChange={(e) => setRevisionActionFilter(e.target.value as 'ALL' | 'APPROVE' | 'REJECT' | 'SYSTEM')}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Filter aksi revisi"
                    >
                        <option value="ALL">Semua Aksi</option>
                        <option value="APPROVE">APPROVE</option>
                        <option value="REJECT">REJECT</option>
                        <option value="SYSTEM">SYSTEM</option>
                    </select>
                    <select
                        value={revisionReasonFilter}
                        onChange={(e) => setRevisionReasonFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Filter reason code"
                    >
                        <option value="ALL">Semua Reason</option>
                        {revisionReasonOptions.map((reason) => (
                            <option key={reason} value={reason}>{reason}</option>
                        ))}
                    </select>
                    <select
                        value={revisionPageSize}
                        onChange={(e) => setRevisionPageSize(Number(e.target.value))}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700"
                        title="Jumlah baris per halaman"
                    >
                        <option value={10}>10/baris</option>
                        <option value={20}>20/baris</option>
                        <option value={50}>50/baris</option>
                        <option value={100}>100/baris</option>
                    </select>
                </div>

                {loadingRevision ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">Memuat riwayat revisi...</p>
                    </div>
                ) : filteredRevisionHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                        <p className="text-sm font-medium text-gray-700">Belum ada data riwayat revisi.</p>
                        <p className="mt-1 text-xs text-gray-500">Coba ubah filter aksi, reason code, atau kata kunci pencarian.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl border border-gray-200">
                            <div className="max-h-[560px] overflow-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="sticky top-0 z-10 bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Waktu</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Aksi</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {pagedRevisionHistory.map((item) => (
                                            <tr key={item.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-[#f2faf9]">
                                                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">{item.attendance_date}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-xs">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${item.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : item.action === 'REJECT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {item.action}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">{item.reason_code || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-gray-600">{item.reason_detail || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                            <p>
                                Halaman {revisionPage} dari {totalRevisionPages} · Total {filteredRevisionHistory.length} data
                            </p>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={revisionPage <= 1} onClick={() => setRevisionPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400">
                                    Prev
                                </button>
                                <button type="button" disabled={revisionPage >= totalRevisionPages} onClick={() => setRevisionPage((prev) => Math.min(totalRevisionPages, prev + 1))} className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400">
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:hidden">
                {/* Header */}
                <div className="flex items-start gap-3 mb-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#06736a]/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#06736a]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Export Laporan Karyawan</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Unduh data <span className="font-semibold text-gray-700">{employee.nama}</span> sesuai filter aktif saat ini.
                        </p>
                    </div>
                </div>

                {/* Filter aktif info */}
                <div className="mb-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800">
                    <span className="font-semibold">⚠ Data yang diekspor mengikuti filter aktif:</span>
                    <span>Bulan: <strong>{monthFilter === 'all' ? 'Semua' : new Date(`${monthFilter}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong></span>
                    {dateFilter.start && <span>Dari: <strong>{dateFilter.start}</strong></span>}
                    {dateFilter.end && <span>Sampai: <strong>{dateFilter.end}</strong></span>}
                </div>

                {/* Export cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export Absensi */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📅</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">Data Absensi Personal</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Rekap kehadiran harian karyawan</p>
                                </div>
                            </div>
                            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${filteredRecords.length > 0 ? 'bg-[#06736a]/10 text-[#06736a]' : 'bg-gray-200 text-gray-500'}`}>
                                {filteredRecords.length} baris
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p className="font-medium text-gray-600">Kolom yang diekspor:</p>
                            <p className="font-mono bg-white border border-gray-200 rounded px-2 py-1 leading-relaxed">
                                tanggal · masuk · pulang · terlambat · lembur · lokasi
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={exportAttendance}
                            disabled={filteredRecords.length === 0}
                            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#06736a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#055f57] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {filteredRecords.length === 0 ? 'Tidak Ada Data' : 'Unduh CSV Absensi'}
                        </button>
                    </div>

                    {/* Export Riwayat Revisi */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📋</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">Riwayat Revisi Absensi</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Log persetujuan & penolakan perubahan</p>
                                </div>
                            </div>
                            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${filteredRevisionHistory.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                {filteredRevisionHistory.length} baris
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p className="font-medium text-gray-600">Kolom yang diekspor:</p>
                            <p className="font-mono bg-white border border-gray-200 rounded px-2 py-1 leading-relaxed">
                                waktu · tanggal · aksi · reason · catatan
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={exportRevisionHistory}
                            disabled={filteredRevisionHistory.length === 0}
                            className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {filteredRevisionHistory.length === 0 ? 'Tidak Ada Data' : 'Unduh CSV Revisi'}
                        </button>
                    </div>
                </div>

                {/* Footer note */}
                <p className="mt-4 text-xs text-gray-400 text-center">
                    Format file: <strong>CSV</strong> · Encoding: <strong>UTF-8</strong> · Nama file menyertakan nama karyawan & timestamp
                </p>
            </section>
        </div>
    );
};

export default EmployeeAttendanceDetail;
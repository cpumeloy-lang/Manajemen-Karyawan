import { useCallback, useEffect, useMemo, useState } from 'react';
import { AttendanceRecord, AttendanceRevisionHistory, Employee } from '../types.ts';
import { dataService } from '../services/DataService';
import { useAppDataActions } from '../stores/appStore';
import { mapAttendanceRecordToUI, sortAttendanceByDateDesc } from '../utils/dataMapping';

interface UseAttendanceStatsParams {
    employee: Employee;
    attendanceRecords: AttendanceRecord[];
    onLoadRevisionHistory?: () => Promise<AttendanceRevisionHistory[]>;
}

export function useAttendanceStats({ employee, attendanceRecords, onLoadRevisionHistory }: UseAttendanceStatsParams) {
    const { setAttendanceRecords } = useAppDataActions();

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

    const refreshAttendanceData = useCallback(async () => {
        const result = await dataService.getAttendance();
        if (result.success && result.data) {
            setAttendanceRecords(sortAttendanceByDateDesc((result.data as any[]).map(mapAttendanceRecordToUI)));
        }
        setLiveHistorySyncedAt(new Date());
        setNextLiveRefreshIn(30);
    }, [setAttendanceRecords]);

    const months = useMemo(() => {
        const values = new Set<string>();
        attendanceRecords.forEach((record) => values.add(record.tanggal.slice(0, 7)));
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
        const late = filteredRecords.filter((r) => r.isLate).length;
        const overtime = Number(filteredRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(2));
        const presentDays = filteredRecords.filter((r) => !['Absen', 'Cuti', 'Sakit'].includes(r.status || '')).length;
        const lateRate = total ? Number(((late / total) * 100).toFixed(0)) : 0;
        const completionRate = total ? Number((filteredRecords.filter((r) => r.clockIn && r.clockOut).length / total * 100).toFixed(0)) : 0;
        return { total, late, overtime, presentDays, lateRate, completionRate };
    }, [filteredRecords]);

    const performanceMetrics = useMemo(() => {
        const totalRecords = filteredRecords.length;
        const onTimeRecords = filteredRecords.filter((r) => !r.isLate).length;
        const uniqueDays = new Set(filteredRecords.map((r) => r.tanggal)).size;
        const presentRecords = filteredRecords.filter((r) => r.clockIn && r.clockOut);
        const totalWorkHours = presentRecords.reduce((sum, r) => {
            const start = new Date(`${r.tanggal}T${r.clockIn}`);
            const end = new Date(`${r.tanggal}T${r.clockOut}`);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return sum;
            return sum + Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0);
        }, 0);

        const parseTimeToMinutes = (clock?: string) => {
            if (!clock) return NaN;
            const [hours, minutes] = clock.split(':').map(Number);
            return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : NaN;
        };

        const validClockInMinutes = presentRecords.map((r) => parseTimeToMinutes(r.clockIn)).filter((v) => !Number.isNaN(v));
        const validClockOutMinutes = presentRecords.map((r) => parseTimeToMinutes(r.clockOut)).filter((v) => !Number.isNaN(v));

        const averageClockInTime = validClockInMinutes.length
            ? formatTimeFromMinutes(validClockInMinutes.reduce((s, v) => s + v, 0) / validClockInMinutes.length)
            : '-';
        const averageClockOutTime = validClockOutMinutes.length
            ? formatTimeFromMinutes(validClockOutMinutes.reduce((s, v) => s + v, 0) / validClockOutMinutes.length)
            : '-';

        return {
            totalRecords, uniqueDays, onTimeRecords,
            onTimeRate: totalRecords ? Number(((onTimeRecords / totalRecords) * 100).toFixed(0)) : 0,
            totalWorkHours: Number(totalWorkHours.toFixed(2)),
            averageWorkHours: presentRecords.length ? Number((totalWorkHours / presentRecords.length).toFixed(2)) : 0,
            averageClockInTime, averageClockOutTime,
            workdayCompletionRate: totalRecords ? Number(((presentRecords.length / totalRecords) * 100).toFixed(0)) : 0,
        };
    }, [filteredRecords]);

    const attendanceStatusCounts = useMemo(() => {
        return filteredRecords.reduce((counts, r) => {
            const status = r.status || (r.isLate ? 'Terlambat' : 'Hadir');
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

        const monthRecords = filteredRecords.filter((r) => {
            const date = new Date(r.tanggal);
            return !Number.isNaN(date.getTime()) && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const weekRecords = filteredRecords.filter((r) => {
            const date = new Date(r.tanggal);
            return !Number.isNaN(date.getTime()) && date >= weekStart && date <= today;
        });

        return {
            currentWeekCount: weekRecords.length,
            currentMonthCount: monthRecords.length,
            weekLateCount: weekRecords.filter((r) => r.isLate).length,
            monthLateCount: monthRecords.filter((r) => r.isLate).length,
            weekOvertimeCount: weekRecords.filter((r) => (r.overtimeHours || 0) > 0).length,
            monthOvertimeCount: monthRecords.filter((r) => (r.overtimeHours || 0) > 0).length,
        };
    }, [filteredRecords]);

    const liveHistoryRecords = useMemo(() => {
        return filteredRecords
            .filter((r) => {
                if (liveHistoryMode === 'LATE') return r.isLate;
                if (liveHistoryMode === 'OVERTIME') return (r.overtimeHours || 0) > 0;
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
        personalRevisionHistory.forEach((item) => { if (item.reason_code) reasonSet.add(item.reason_code); });
        return [...reasonSet].sort((a, b) => a.localeCompare(b));
    }, [personalRevisionHistory]);

    const filteredRevisionHistory = useMemo(() => {
        const normalizedSearch = revisionSearchTerm.trim().toLowerCase();
        return personalRevisionHistory
            .filter((item) => revisionActionFilter === 'ALL' || item.action === revisionActionFilter)
            .filter((item) => revisionReasonFilter === 'ALL' || (item.reason_code || '') === revisionReasonFilter)
            .filter((item) => {
                if (!normalizedSearch) return true;
                return [employee.nama, item.reason_code, item.reason_detail, item.attendance_date, item.action, item.changed_by]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(normalizedSearch));
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

    // CSV export utilities
    const exportCsv = (fileName: string, rows: Array<Record<string, string | number | boolean | null>>) => {
        if (!rows.length) { alert('Tidak ada data untuk diekspor.'); return; }
        const headers = Object.keys(rows[0]);
        const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csvContent = [headers.join(','), ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(','))].join('\n');
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
        exportCsv(`attendance-personal-${String(employee?.nama || 'export').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`, filteredRecords.map((r) => ({
            employee_name: employee.nama, employee_id: employee.id,
            tanggal: r.tanggal, clock_in: r.clockIn, clock_out: r.clockOut,
            is_late: r.isLate, overtime_hours: r.overtimeHours, location: r.location,
        })));
    };

    const exportRevisionHistory = () => {
        exportCsv(`attendance-revision-personal-${String(employee?.nama || 'export').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`, filteredRevisionHistory.map((item) => ({
            id: item.id, employee_name: employee.nama, employee_id: item.employee_id,
            attendance_date: item.attendance_date, action: item.action,
            reason_code: item.reason_code || '', reason_detail: item.reason_detail || '',
            changed_by: item.changed_by || '', created_at: item.created_at,
        })));
    };

    // Effects
    useEffect(() => {
        if (!onLoadRevisionHistory) return;
        let mounted = true;
        setLoadingRevision(true);
        void onLoadRevisionHistory()
            .then((data) => { if (mounted) setRevisionHistory(data || []); })
            .finally(() => { if (mounted) setLoadingRevision(false); });
        return () => { mounted = false; };
    }, [onLoadRevisionHistory, employee.id]);

    useEffect(() => { setRevisionPage(1); }, [revisionActionFilter, revisionReasonFilter, revisionSearchTerm, revisionPageSize]);
    useEffect(() => { if (revisionPage > totalRevisionPages) setRevisionPage(totalRevisionPages); }, [revisionPage, totalRevisionPages]);
    useEffect(() => { setLiveHistorySyncedAt(new Date()); }, [attendanceRecords]);

    useEffect(() => {
        if (!isLiveAutoRefresh) return;
        const timer = window.setInterval(() => {
            setNextLiveRefreshIn((prev) => {
                if (prev <= 1) { void refreshAttendanceData(); return 30; }
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [isLiveAutoRefresh, refreshAttendanceData]);

    return {
        // Filters
        monthFilter, setMonthFilter, dateFilter, setDateFilter, months,
        // Stats
        filteredRecords, stats, performanceMetrics, attendanceStatusCounts, trendMetrics,
        // Live History
        liveHistoryRecords, liveHistoryMode, setLiveHistoryMode,
        liveHistoryLimit, setLiveHistoryLimit, liveHistorySyncedAt,
        isLiveAutoRefresh, setIsLiveAutoRefresh, nextLiveRefreshIn, setNextLiveRefreshIn,
        refreshLiveHistory: refreshAttendanceData,
        // Revision
        loadingRevision, revisionActionFilter, setRevisionActionFilter,
        revisionReasonFilter, setRevisionReasonFilter, revisionSearchTerm, setRevisionSearchTerm,
        revisionPage, setRevisionPage, revisionPageSize, setRevisionPageSize,
        totalRevisionPages, filteredRevisionHistory, pagedRevisionHistory, revisionReasonOptions,
        // Export
        exportAttendance, exportRevisionHistory,
    };
}

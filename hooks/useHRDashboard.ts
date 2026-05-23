import { useMemo, useState, useEffect, useRef } from 'react';
import { AttendanceRecord, Employee, AllRequest, RequestStatus, RequestType } from '../types.ts';

const RANGE_OPTIONS = [7, 14, 30] as const;

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
const getRecordDate = (record: any): string => String(record.tanggal || record.date || '');
const getRecordEmployeeId = (record: any): string => String(record.employeeId || record.employee_id || '');
const getRequestTimestamp = (req: any): string => String(req.requestedAt || req.created_at || '');

const isPresentRecord = (record: any): boolean => {
    const status = String(record.status || '').toLowerCase();
    if (status === 'hadir' || status === 'terlambat') return true;
    return Boolean(record.clockIn);
};

const isLateRecord = (record: any): boolean => {
    if (Boolean(record.isLate)) return true;
    return String(record.status || '').toLowerCase() === 'terlambat';
};

const parseDateSafe = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
};

interface UseHRDashboardProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    allRequests: AllRequest[];
}

export type RangeOption = (typeof RANGE_OPTIONS)[number];
export { RANGE_OPTIONS };

export function useHRDashboard({ employees, attendanceRecords, allRequests }: UseHRDashboardProps) {
    const [selectedRange, setSelectedRange] = useState<RangeOption>(14);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    // [MINOR-13] Memoize today string — new Date() on every render creates instability in useMemo deps
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    // [HK-M6] Track refresh timer to clear before creating a new one
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []);

    useEffect(() => {
        setLastRefreshed(new Date());
    }, [employees, attendanceRecords]);

    const handleManualRefresh = () => {
        setIsManualRefreshing(true);
        window.dispatchEvent(new CustomEvent('hrms:refresh-data'));
        // [HK-M6] Clear previous timer before scheduling a new one
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            refreshTimerRef.current = null;
            setIsManualRefreshing(false);
        }, 2000);
    };

    const getLastRefreshedLabel = () => {
        const diffMs = Date.now() - lastRefreshed.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin === 1) return '1 menit lalu';
        return `${diffMin} menit lalu`;
    };

    const activeEmployees = useMemo(
        () => employees.filter((emp) => emp.status !== 'Non-Aktif'),
        [employees]
    );

    const employeeNameMap = useMemo(
        () => new Map(employees.map((emp) => [emp.id, emp.nama])),
        [employees]
    );

    const dateSeries = useMemo(() => {
        const now = new Date();
        const days: Array<{ dateKey: string; label: string; labelFull: string }> = [];
        for (let i = selectedRange - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateKey = formatDateKey(date);
            days.push({
                dateKey,
                label: date.toLocaleDateString('id-ID', { weekday: 'short' }),
                labelFull: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
            });
        }
        return days;
    }, [selectedRange]);

    const rangeDateSet = useMemo(() => new Set(dateSeries.map((d) => d.dateKey)), [dateSeries]);

    const leaveCountByDate = useMemo(() => {
        const map = new Map<string, number>();
        allRequests.forEach((req: any) => {
            if (req.type !== RequestType.Cuti || req.status !== RequestStatus.Approved) return;
            const start = parseDateSafe(req.startDate);
            const end = parseDateSafe(req.endDate);
            if (!start || !end) return;
            const cursor = new Date(start);
            while (cursor <= end) {
                const dateKey = formatDateKey(cursor);
                if (rangeDateSet.has(dateKey)) {
                    map.set(dateKey, (map.get(dateKey) || 0) + 1);
                }
                cursor.setDate(cursor.getDate() + 1);
            }
        });
        return map;
    }, [allRequests, rangeDateSet]);

    const trendData = useMemo(() => {
        return dateSeries.map(({ dateKey, label, labelFull }) => {
            const dayRecords = attendanceRecords.filter((record: any) => getRecordDate(record) === dateKey);
            const hadir = dayRecords.filter(isPresentRecord).length;
            const terlambat = dayRecords.filter(isLateRecord).length;
            const lemburJam = dayRecords.reduce((sum: number, record: any) => sum + (Number(record.overtimeHours) || 0), 0);
            const cutiAktif = leaveCountByDate.get(dateKey) || 0;
            const tidakHadirEstimasi = Math.max(activeEmployees.length - hadir - cutiAktif, 0);
            return { hari: label, tanggal: labelFull, hadir, terlambat, cutiAktif, tidakHadirEstimasi, lemburJam: Number(lemburJam.toFixed(2)) };
        });
    }, [dateSeries, attendanceRecords, leaveCountByDate, activeEmployees.length]);

    const metrics = useMemo(() => {
        const inactiveEmployees = employees.length - activeEmployees.length;
        const todayRecords = attendanceRecords.filter((record: any) => getRecordDate(record) === today);
        const presentToday = todayRecords.filter(isPresentRecord).length;
        const lateToday = todayRecords.filter(isLateRecord).length;
        const overtimeToday = todayRecords.reduce((sum: number, record: any) => sum + (Number(record.overtimeHours) || 0), 0);
        const pendingRequests = allRequests.filter((req) => req.status === RequestStatus.Pending);
        const pendingLeave = pendingRequests.filter((req) => req.type === RequestType.Cuti).length;
        const pendingReimburse = pendingRequests.filter((req) => req.type === RequestType.Reimbursement).length;
        const approvedLeaveToday = leaveCountByDate.get(today) || 0;
        const absenceEstimateToday = Math.max(activeEmployees.length - presentToday - approvedLeaveToday, 0);
        const attendanceRateToday = activeEmployees.length > 0 ? (presentToday / activeEmployees.length) * 100 : 0;
        const lateRateToday = presentToday > 0 ? (lateToday / presentToday) * 100 : 0;
        const totalPresentRange = trendData.reduce((sum, day) => sum + day.hadir, 0);
        const totalLateRange = trendData.reduce((sum, day) => sum + day.terlambat, 0);
        const totalOvertimeRange = trendData.reduce((sum, day) => sum + day.lemburJam, 0);
        const avgPresentPerDay = trendData.length > 0 ? totalPresentRange / trendData.length : 0;
        const avgLateRateRange = totalPresentRange > 0 ? (totalLateRange / totalPresentRange) * 100 : 0;
        const punctualityScore = Math.max(0, Math.min(100, 100 - avgLateRateRange));
        const uniqueDepartments = new Set(activeEmployees.map((emp) => emp.departemen).filter(Boolean).map((dept) => String(dept).trim().toLowerCase())).size;

        return {
            activeEmployees: activeEmployees.length, inactiveEmployees, presentToday, lateToday,
            overtimeToday: Number(overtimeToday.toFixed(2)), approvedLeaveToday, absenceEstimateToday,
            attendanceRateToday: Number(attendanceRateToday.toFixed(1)), lateRateToday: Number(lateRateToday.toFixed(1)),
            pendingRequests: pendingRequests.length, pendingLeave, pendingReimburse, uniqueDepartments,
            totalPresentRange, totalLateRange, totalOvertimeRange: Number(totalOvertimeRange.toFixed(2)),
            avgPresentPerDay: Number(avgPresentPerDay.toFixed(1)), avgLateRateRange: Number(avgLateRateRange.toFixed(1)),
            punctualityScore: Number(punctualityScore.toFixed(1)),
        };
    }, [employees.length, activeEmployees, attendanceRecords, allRequests, today, trendData, leaveCountByDate]);

    const recentRequests = useMemo(() => {
        const getRequestTime = (req: any) => {
            const raw = getRequestTimestamp(req);
            const time = new Date(raw).getTime();
            return Number.isNaN(time) ? 0 : time;
        };
        return [...allRequests].sort((a: any, b: any) => getRequestTime(b) - getRequestTime(a)).slice(0, 5);
    }, [allRequests]);

    const frequentLateEmployees = useMemo(() => {
        const counter = new Map<string, { name: string; lateCount: number; overtimeHours: number }>();
        attendanceRecords.forEach((record: any) => {
            const dateKey = getRecordDate(record);
            if (!rangeDateSet.has(dateKey)) return;
            if (!isLateRecord(record)) return;
            const employeeId = getRecordEmployeeId(record);
            if (!employeeId) return;
            const name = employeeNameMap.get(employeeId) || `Karyawan ${employeeId}`;
            const existing = counter.get(employeeId);
            const overtime = Number(record.overtimeHours) || 0;
            if (existing) { existing.lateCount += 1; existing.overtimeHours += overtime; }
            else { counter.set(employeeId, { name, lateCount: 1, overtimeHours: overtime }); }
        });
        return [...counter.values()]
            .sort((a, b) => b.lateCount - a.lateCount)
            .slice(0, 5)
            .map((item) => ({ ...item, overtimeHours: Number(item.overtimeHours.toFixed(2)) }));
    }, [attendanceRecords, rangeDateSet, employeeNameMap]);

    return {
        selectedRange, setSelectedRange,
        isManualRefreshing, handleManualRefresh, getLastRefreshedLabel,
        metrics, trendData, recentRequests, frequentLateEmployees,
    };
}

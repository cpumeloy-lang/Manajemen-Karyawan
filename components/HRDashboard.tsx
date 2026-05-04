import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AttendanceRecord, Employee, AllRequest, RequestStatus, RequestType } from '../types.ts';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

const RANGE_OPTIONS = [7, 14, 30] as const;

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const getRecordDate = (record: any): string => String(record.tanggal || record.date || '');
const getRecordEmployeeId = (record: any): string => String(record.employeeId || record.employee_id || '');

const getRequestEmployeeId = (req: any): string => String(req.employeeId || req.employee_id || '-');
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

interface HRDashboardProps {
    currentUser: Employee;
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    allRequests: AllRequest[];
    onNavigate?: (view: 'employees' | 'attendance' | 'requests' | 'payroll') => void;
}

const HRDashboard: React.FC<HRDashboardProps> = ({
    currentUser,
    employees,
    attendanceRecords,
    allRequests,
    onNavigate,
}) => {
    const [selectedRange, setSelectedRange] = useState<(typeof RANGE_OPTIONS)[number]>(14);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [canRenderChart, setCanRenderChart] = useState(false);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        setLastRefreshed(new Date());
    }, [employees, attendanceRecords]);

    const handleManualRefresh = () => {
        setIsManualRefreshing(true);
        window.dispatchEvent(new CustomEvent('hrms:refresh-data'));
        setTimeout(() => setIsManualRefreshing(false), 2000);
    };

    const getLastRefreshedLabel = () => {
        const diffMs = Date.now() - lastRefreshed.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin === 1) return '1 menit lalu';
        return `${diffMin} menit lalu`;
    };

    useEffect(() => {
        const el = chartContainerRef.current;
        if (!el) return;

        const update = () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                setCanRenderChart(false);
                return;
            }

            const { width, height } = el.getBoundingClientRect();
            const safeWidth = Math.max(280, Math.floor(width));
            const safeHeight = Math.max(240, Math.floor(height));
            setCanRenderChart(width > 0 && height > 0);
            setChartSize({ width: safeWidth, height: safeHeight });
        };

        update();

        const observer = new ResizeObserver(() => update());
        observer.observe(el);

        const onVisibilityChange = () => update();
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

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

            return {
                hari: label,
                tanggal: labelFull,
                hadir,
                terlambat,
                cutiAktif,
                tidakHadirEstimasi,
                lemburJam: Number(lemburJam.toFixed(2)),
            };
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
        const attendanceRateToday = activeEmployees.length > 0
            ? (presentToday / activeEmployees.length) * 100
            : 0;
        const lateRateToday = presentToday > 0
            ? (lateToday / presentToday) * 100
            : 0;

        const totalPresentRange = trendData.reduce((sum, day) => sum + day.hadir, 0);
        const totalLateRange = trendData.reduce((sum, day) => sum + day.terlambat, 0);
        const totalOvertimeRange = trendData.reduce((sum, day) => sum + day.lemburJam, 0);
        const avgPresentPerDay = trendData.length > 0 ? totalPresentRange / trendData.length : 0;
        const avgLateRateRange = totalPresentRange > 0 ? (totalLateRange / totalPresentRange) * 100 : 0;

        const punctualityScore = Math.max(0, Math.min(100, 100 - avgLateRateRange));

        const uniqueDepartments = new Set(
            activeEmployees
                .map((emp) => emp.departemen)
                .filter(Boolean)
                .map((dept) => String(dept).trim().toLowerCase())
        ).size;

        return {
            activeEmployees: activeEmployees.length,
            inactiveEmployees,
            presentToday,
            lateToday,
            overtimeToday: Number(overtimeToday.toFixed(2)),
            approvedLeaveToday,
            absenceEstimateToday,
            attendanceRateToday: Number(attendanceRateToday.toFixed(1)),
            lateRateToday: Number(lateRateToday.toFixed(1)),
            pendingRequests: pendingRequests.length,
            pendingLeave,
            pendingReimburse,
            uniqueDepartments,
            totalPresentRange,
            totalLateRange,
            totalOvertimeRange: Number(totalOvertimeRange.toFixed(2)),
            avgPresentPerDay: Number(avgPresentPerDay.toFixed(1)),
            avgLateRateRange: Number(avgLateRateRange.toFixed(1)),
            punctualityScore: Number(punctualityScore.toFixed(1)),
        };
    }, [employees.length, activeEmployees, attendanceRecords, allRequests, today, trendData, leaveCountByDate]);

    const recentRequests = useMemo(() => {
        const getRequestTime = (req: any) => {
            const raw = getRequestTimestamp(req);
            const time = new Date(raw).getTime();
            return Number.isNaN(time) ? 0 : time;
        };

        return [...allRequests]
            .sort((a: any, b: any) => getRequestTime(b) - getRequestTime(a))
            .slice(0, 5);
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

            if (existing) {
                existing.lateCount += 1;
                existing.overtimeHours += overtime;
            } else {
                counter.set(employeeId, { name, lateCount: 1, overtimeHours: overtime });
            }
        });

        return [...counter.values()]
            .sort((a, b) => b.lateCount - a.lateCount)
            .slice(0, 5)
            .map((item) => ({
                ...item,
                overtimeHours: Number(item.overtimeHours.toFixed(2)),
            }));
    }, [attendanceRecords, rangeDateSet, employeeNameMap]);

    const InfoCard: React.FC<{
        title: string;
        value: string | number;
        subtitle?: string;
        color?: string;
    }> = ({ title, value, subtitle, color = 'text-[#06736a]' }) => (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );

    const ActionCard: React.FC<{
        title: string;
        description: string;
        onClick?: () => void;
    }> = ({ title, description, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow text-left w-full"
        >
            <h3 className="text-lg font-semibold text-[#06736a] mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#06736a] to-[#089c8e] p-6 sm:p-8 rounded-xl shadow-md text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Dashboard HR Manager</h1>
                        <p className="text-white/90">Monitoring kehadiran harian dan analitik SDM berbasis data aktual</p>
                        <p className="text-white/80 text-sm mt-1">{currentUser.nama} - {currentUser.jabatan}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <button
                            onClick={handleManualRefresh}
                            disabled={isManualRefreshing}
                            className="flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-60 px-3 py-2 text-sm font-medium text-white transition-colors"
                        >
                            <svg className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isManualRefreshing ? 'Memperbarui...' : 'Refresh'}
                        </button>
                        <span className="text-xs text-white/70">Diperbarui: {getLastRefreshedLabel()} · Auto 60 dtk</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard title="Karyawan Aktif" value={metrics.activeEmployees} subtitle={`Non-Aktif: ${metrics.inactiveEmployees}`} />
                <InfoCard title="Hadir Hari Ini" value={metrics.presentToday} subtitle={`Tingkat hadir: ${metrics.attendanceRateToday}%`} color="text-green-600" />
                <InfoCard title="Terlambat Hari Ini" value={metrics.lateToday} subtitle={`Late rate: ${metrics.lateRateToday}%`} color="text-amber-600" />
                <InfoCard title="Estimasi Tidak Hadir" value={metrics.absenceEstimateToday} subtitle={`Cuti aktif: ${metrics.approvedLeaveToday}`} color="text-red-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard title={`Rata-rata Hadir (${selectedRange} hari)`} value={metrics.avgPresentPerDay} subtitle={`Total hadir: ${metrics.totalPresentRange}`} color="text-emerald-700" />
                <InfoCard title={`Total Lembur (${selectedRange} hari)`} value={`${metrics.totalOvertimeRange} jam`} subtitle={`Hari ini: ${metrics.overtimeToday} jam`} color="text-sky-700" />
                <InfoCard title="Permohonan Pending" value={metrics.pendingRequests} subtitle={`Cuti: ${metrics.pendingLeave} | Reimburse: ${metrics.pendingReimburse}`} color="text-yellow-600" />
                <InfoCard title="Skor Ketepatan" value={`${metrics.punctualityScore}%`} subtitle={`Rata-rata keterlambatan: ${metrics.avgLateRateRange}%`} color="text-[#06736a]" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[#06736a]">Analitik Kehadiran</h2>
                        <p className="text-sm text-gray-500">Tren hadir, terlambat, cuti aktif, dan estimasi tidak hadir</p>
                    </div>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        {RANGE_OPTIONS.map((day) => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedRange(day)}
                                className={`rounded-lg px-3 py-1 text-sm font-semibold transition ${
                                    selectedRange === day
                                        ? 'bg-[#06736a] text-white'
                                        : 'text-gray-600 hover:bg-white'
                                }`}
                            >
                                {day} Hari
                            </button>
                        ))}
                    </div>
                </div>
                <div ref={chartContainerRef} className="h-80 min-h-[240px]">
                    {canRenderChart ? (
                        <LineChart width={chartSize.width} height={chartSize.height} data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="hari" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip
                                formatter={(value: number | string, name: string) => [value, name]}
                                labelFormatter={(_, payload) => {
                                    const first = payload?.[0]?.payload;
                                    return first?.tanggal ? `${first.hari}, ${first.tanggal}` : '';
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="hadir" name="Hadir" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="terlambat" name="Terlambat" stroke="#d97706" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="cutiAktif" name="Cuti Aktif" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="tidakHadirEstimasi" name="Estimasi Tidak Hadir" stroke="#dc2626" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                            <Line type="monotone" dataKey="lemburJam" name="Lembur (Jam)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        </LineChart>
                    ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Karyawan dengan Keterlambatan Tertinggi</h2>
                {frequentLateEmployees.length === 0 ? (
                    <p className="text-sm text-gray-500">Tidak ada catatan keterlambatan pada periode yang dipilih.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Terlambat</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Akumulasi Lembur</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {frequentLateEmployees.map((item) => (
                                    <tr key={item.name}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                                        <td className="px-4 py-3 text-sm text-amber-700 font-semibold">{item.lateCount} kali</td>
                                        <td className="px-4 py-3 text-sm text-sky-700">{item.overtimeHours} jam</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Permohonan Terbaru</h2>
                {recentRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">Belum ada data permohonan.</p>
                ) : (
                    <div className="space-y-3">
                        {recentRequests.map((req: any) => (
                            <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-none last:pb-0">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{req.type}</p>
                                    <p className="text-xs text-gray-500">ID Karyawan: {getRequestEmployeeId(req)}</p>
                                </div>
                                <span
                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        req.status === RequestStatus.Pending
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : req.status === RequestStatus.Approved
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {req.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-[#e6f3f2] p-6 rounded-xl">
                <h2 className="text-xl font-bold text-[#06736a] mb-4">Aksi Cepat HR</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ActionCard title="Data Karyawan" description="Kelola data dan profil karyawan" onClick={() => onNavigate?.('employees')} />
                    <ActionCard title="Kehadiran" description="Audit absensi, keterlambatan, dan lembur" onClick={() => onNavigate?.('attendance')} />
                    <ActionCard title="Permohonan" description="Review cuti dan reimbursement" onClick={() => onNavigate?.('requests')} />
                    <ActionCard title="Payroll" description="Lihat ringkasan penggajian" onClick={() => onNavigate?.('payroll')} />
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;

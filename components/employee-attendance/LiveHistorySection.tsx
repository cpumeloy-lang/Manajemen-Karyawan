import React from 'react';
import { AttendanceRecord, Employee } from '../../types.ts';
import { ClockIcon, MapPinIcon } from '../icons.tsx';

interface LiveHistorySectionProps {
    employee: Employee;
    liveHistoryRecords: AttendanceRecord[];
    performanceMetrics: {
        uniqueDays: number;
        averageWorkHours: number;
        onTimeRate: number;
        totalWorkHours: number;
        averageClockInTime: string;
        averageClockOutTime: string;
    };
    trendMetrics: {
        currentWeekCount: number;
        currentMonthCount: number;
        weekLateCount: number;
        monthLateCount: number;
        weekOvertimeCount: number;
        monthOvertimeCount: number;
    };
    attendanceStatusCounts: Record<string, number>;
    liveHistoryMode: 'ALL' | 'LATE' | 'OVERTIME';
    setLiveHistoryMode: (v: 'ALL' | 'LATE' | 'OVERTIME') => void;
    liveHistoryLimit: number;
    setLiveHistoryLimit: (v: number) => void;
    liveHistorySyncedAt: Date;
    isLiveAutoRefresh: boolean;
    setIsLiveAutoRefresh: (v: boolean) => void;
    nextLiveRefreshIn: number;
    setNextLiveRefreshIn: (v: number) => void;
    onRefresh: () => void;
}

const LiveHistorySection: React.FC<LiveHistorySectionProps> = ({
    employee, liveHistoryRecords, performanceMetrics, trendMetrics,
    attendanceStatusCounts, liveHistoryMode, setLiveHistoryMode,
    liveHistoryLimit, setLiveHistoryLimit, liveHistorySyncedAt,
    isLiveAutoRefresh, setIsLiveAutoRefresh, nextLiveRefreshIn, setNextLiveRefreshIn,
    onRefresh,
}) => {
    const perfCards = [
        { label: 'Hari Terdata', value: performanceMetrics.uniqueDays },
        { label: 'Jam Kerja Rata-rata', value: `${performanceMetrics.averageWorkHours} jam` },
        { label: 'On Time Rate', value: `${performanceMetrics.onTimeRate}%` },
        { label: 'Total Jam Kerja', value: `${performanceMetrics.totalWorkHours} jam` },
        { label: 'Rata-rata Masuk', value: performanceMetrics.averageClockInTime },
        { label: 'Rata-rata Pulang', value: performanceMetrics.averageClockOutTime },
    ];

    return (
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

            {/* Performance metrics */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-6 mb-4">
                {perfCards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Trend metrics */}
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

            {/* Filters */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <select value={liveHistoryMode} onChange={(e) => setLiveHistoryMode(e.target.value as 'ALL' | 'LATE' | 'OVERTIME')}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700" title="Filter status live history">
                    <option value="ALL">Semua Histori</option>
                    <option value="LATE">Hanya Terlambat</option>
                    <option value="OVERTIME">Hanya Lembur</option>
                </select>
                <select value={liveHistoryLimit} onChange={(e) => setLiveHistoryLimit(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700" title="Jumlah baris live history">
                    <option value={25}>25 data terbaru</option>
                    <option value={50}>50 data terbaru</option>
                    <option value={100}>100 data terbaru</option>
                    <option value={200}>200 data terbaru</option>
                </select>
                <button type="button" onClick={onRefresh} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Refresh Live</button>
                <button type="button"
                    onClick={() => {
                        const nextValue = !isLiveAutoRefresh;
                        setIsLiveAutoRefresh(nextValue);
                        if (nextValue) setNextLiveRefreshIn(30);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${isLiveAutoRefresh ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                    Auto Refresh: {isLiveAutoRefresh ? 'ON' : 'OFF'}
                </button>
            </div>

            {/* Table */}
            {liveHistoryRecords.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Tanggal', 'Masuk', 'Pulang', 'Durasi', 'Status', 'Lembur', 'Lokasi', 'Catatan'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {liveHistoryRecords.map((record) => {
                                const start = new Date(`${record.tanggal}T${record.clockIn}`);
                                const end = new Date(`${record.tanggal}T${record.clockOut}`);
                                const duration = record.clockIn && record.clockOut && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
                                    ? `${Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60), 0).toFixed(2)} jam` : '-';
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
                                            <span className="inline-flex items-center gap-1"><MapPinIcon className="h-4 w-4 text-gray-400" />{record.location || '-'}</span>
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
    );
};

export default LiveHistorySection;

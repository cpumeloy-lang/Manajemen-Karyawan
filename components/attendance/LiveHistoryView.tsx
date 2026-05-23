import React from 'react';
import { Employee } from '../../types';
import { ClockIcon, MapPinIcon } from '../icons';

interface LiveHistoryViewProps {
    selectedEmployee: Employee | null;
    liveHistoryRecords: any[];
    liveHistorySyncedAt: Date;
    isLiveAutoRefresh: boolean;
    nextLiveRefreshIn: number;
    liveHistoryMode: 'ALL' | 'LATE' | 'OVERTIME';
    setLiveHistoryMode: (mode: 'ALL' | 'LATE' | 'OVERTIME') => void;
    liveHistoryLimit: number;
    setLiveHistoryLimit: (limit: number) => void;
    refreshLiveHistory: () => void;
    setIsLiveAutoRefresh: (val: boolean) => void;
    setNextLiveRefreshIn: (val: number) => void;
    employeeMap: Map<string, Employee>;
}

const LIVE_REFRESH_INTERVAL_SECONDS = 30;

const LiveHistoryView: React.FC<LiveHistoryViewProps> = ({
    selectedEmployee,
    liveHistoryRecords,
    liveHistorySyncedAt,
    isLiveAutoRefresh,
    nextLiveRefreshIn,
    liveHistoryMode,
    setLiveHistoryMode,
    liveHistoryLimit,
    setLiveHistoryLimit,
    refreshLiveHistory,
    setIsLiveAutoRefresh,
    setNextLiveRefreshIn,
    employeeMap,
}) => {
    return (
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
    );
};

export default LiveHistoryView;

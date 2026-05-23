import React, { useMemo, useState } from 'react';
import { AttendanceRecord } from '../../types.ts';

const ATTENDANCE_PAGE_SIZE = 20;

interface AttendanceTabProps {
    attendanceRecords: AttendanceRecord[];
    onOpenAttendanceDetail?: () => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceRecords, onOpenAttendanceDetail }) => {
    const [attendancePage, setAttendancePage] = useState(1);

    const sortedAttendance = useMemo(
        () => [...attendanceRecords].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()),
        [attendanceRecords]
    );
    const attendanceTotalPages = Math.max(1, Math.ceil(sortedAttendance.length / ATTENDANCE_PAGE_SIZE));
    const pagedAttendance = useMemo(() => {
        const start = (attendancePage - 1) * ATTENDANCE_PAGE_SIZE;
        return sortedAttendance.slice(start, start + ATTENDANCE_PAGE_SIZE);
    }, [sortedAttendance, attendancePage]);

    const attendanceSummary = useMemo(() => ({
        total: sortedAttendance.length,
        late: sortedAttendance.filter((rec) => rec.isLate).length,
        overtime: Number(sortedAttendance.reduce((sum, rec) => sum + (rec.overtimeHours || 0), 0).toFixed(2)),
        latestDate: sortedAttendance[0]?.tanggal || null,
    }), [sortedAttendance]);

    return (
        <div>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Riwayat</p>
                    <p className="mt-1 text-xl font-bold text-emerald-900">{attendanceSummary.total}</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Terlambat</p>
                    <p className="mt-1 text-xl font-bold text-amber-900">{attendanceSummary.late}</p>
                </div>
                <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Total Lembur</p>
                    <p className="mt-1 text-xl font-bold text-sky-900">{attendanceSummary.overtime} jam</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-primary text-lg">Riwayat Kehadiran Seluruh Periode</h4>
                <div className="flex items-center gap-3">
                    {attendanceSummary.latestDate && (
                        <p className="text-xs text-gray-500">Update terakhir: {new Date(attendanceSummary.latestDate).toLocaleDateString('id-ID')}</p>
                    )}
                    {onOpenAttendanceDetail && (
                        <button
                            type="button"
                            onClick={onOpenAttendanceDetail}
                            className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2]"
                        >
                            Buka Detail Absensi Lengkap
                        </button>
                    )}
                </div>
            </div>

            {sortedAttendance.length > 0 ? (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Masuk</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pulang</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lembur</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pagedAttendance.map(rec => (
                                    <tr key={rec.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(rec.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td className={`px-4 py-2 whitespace-nowrap text-sm ${rec.isLate ? 'text-red-600 font-semibold' : ''}`}>{rec.clockIn}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{rec.clockOut}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{rec.overtimeHours > 0 ? `${rec.overtimeHours} jam` : '-'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {rec.isLate ? (
                                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Terlambat</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Tepat Waktu</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {attendanceTotalPages > 1 && (
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                            <span>Halaman {attendancePage} dari {attendanceTotalPages} · {sortedAttendance.length} data</span>
                            <div className="flex gap-2">
                                <button type="button" disabled={attendancePage <= 1} onClick={() => setAttendancePage(p => p - 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-50">Prev</button>
                                <button type="button" disabled={attendancePage >= attendanceTotalPages} onClick={() => setAttendancePage(p => p + 1)} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-50">Next</button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                 <p className="text-sm text-gray-500 mt-4">Tidak ada riwayat kehadiran.</p>
            )}
        </div>
    );
};

export default AttendanceTab;

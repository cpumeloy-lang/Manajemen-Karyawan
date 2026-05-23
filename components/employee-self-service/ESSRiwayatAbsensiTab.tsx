import React from 'react';
import { AttendanceRecord } from '../../types';

interface ESSRiwayatAbsensiTabProps {
    attendanceMonthFilter: string;
    setAttendanceMonthFilter: (value: string) => void;
    attendanceMonths: string[];
    attendanceDateFilter: { start: string; end: string };
    setAttendanceDateFilter: (value: React.SetStateAction<{ start: string; end: string }>) => void;
    attendanceSummary: { total: number; lateCount: number; onTimeCount: number; totalOvertime: number; lateRate: number; onTimeRate: number };
    todaysRecord: AttendanceRecord | null;
    pendingCheckIn: { tanggal: string; clockIn: string; location: string; latitude?: number; longitude?: number } | null;
    isLanMode: boolean;
    isGeofenceConfigured: boolean;
    officeRadiusMeters: number;
    handleCheckOutClick: () => void;
    isAttendanceSubmitting: boolean;
    handleCheckInClick: () => void;
    attendanceActionError: string | null;
    filteredAttendanceRecords: AttendanceRecord[];
    formatDate: (dateStr: string, options?: Intl.DateTimeFormatOptions) => string;
}

const ESSRiwayatAbsensiTab: React.FC<ESSRiwayatAbsensiTabProps> = ({
    attendanceMonthFilter,
    setAttendanceMonthFilter,
    attendanceMonths,
    attendanceDateFilter,
    setAttendanceDateFilter,
    attendanceSummary,
    todaysRecord,
    pendingCheckIn,
    isLanMode,
    isGeofenceConfigured,
    officeRadiusMeters,
    handleCheckOutClick,
    isAttendanceSubmitting,
    handleCheckInClick,
    attendanceActionError,
    filteredAttendanceRecords,
    formatDate
}) => {
    const getTodayDate = () => new Date().toISOString().split('T')[0];

    return (
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
    );
};

export default ESSRiwayatAbsensiTab;

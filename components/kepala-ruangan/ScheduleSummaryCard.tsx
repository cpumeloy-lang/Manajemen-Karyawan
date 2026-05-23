import React from 'react';

interface ScheduleInfo {
    totalSchedules: number;
    draftCount: number;
    publishedCount: number;
    offDayCount: number;
    coveragePercent: number;
    monthLabel: string;
}

interface ScheduleSummaryCardProps {
    scheduleInfo: ScheduleInfo;
    onNavigate?: (view: string) => void;
}

const ScheduleSummaryCard: React.FC<ScheduleSummaryCardProps> = ({ scheduleInfo, onNavigate }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#06736a]">📋 Jadwal Shift — {scheduleInfo.monthLabel}</h2>
                <button
                    onClick={() => onNavigate?.('unit-schedule')}
                    className="text-sm text-primary font-medium hover:underline"
                >
                    Buka Manajemen Jadwal →
                </button>
            </div>

            {scheduleInfo.totalSchedules === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                    <p className="text-amber-800 font-semibold mb-2">⚠️ Jadwal bulan ini belum di-generate</p>
                    <p className="text-sm text-amber-700 mb-3">
                        Belum ada jadwal harian yang dibuat untuk karyawan di unit ini.
                        Gunakan fitur <strong>Manajemen Jadwal Shift</strong> untuk membuat jadwal otomatis.
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-amber-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">📌 Langkah Membuat Jadwal:</p>
                        <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                            <li><strong>Konfigurasi Shift</strong> — Definisikan jenis shift (Pagi, Siang, Malam, dll) beserta jam kerja</li>
                            <li><strong>Buat Pola Rotasi</strong> — Buat template siklus seperti P-P-S-S-M-M-L-L</li>
                            <li><strong>Generate Jadwal</strong> — Pilih pola rotasi dan klik "Generate Jadwal" untuk mengisi otomatis</li>
                            <li><strong>Sesuaikan</strong> — Edit jadwal per karyawan per tanggal jika perlu</li>
                            <li><strong>Publish</strong> — Publikasi jadwal agar aktif untuk validasi absensi</li>
                        </ol>
                    </div>
                    <button
                        onClick={() => onNavigate?.('unit-schedule')}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                    >
                        📅 Buka Manajemen Jadwal
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-blue-700">{scheduleInfo.totalSchedules}</div>
                            <div className="text-xs text-blue-600 font-medium">Total Jadwal</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-amber-700">{scheduleInfo.draftCount}</div>
                            <div className="text-xs text-amber-600 font-medium">Draft</div>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-green-700">{scheduleInfo.publishedCount}</div>
                            <div className="text-xs text-green-600 font-medium">Published</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-600">{scheduleInfo.offDayCount}</div>
                            <div className="text-xs text-gray-500 font-medium">Hari Libur</div>
                        </div>
                    </div>

                    {/* Coverage bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Coverage Jadwal</span>
                            <span className="font-semibold">{scheduleInfo.coveragePercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    scheduleInfo.coveragePercent >= 90 ? 'bg-green-500' :
                                    scheduleInfo.coveragePercent >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(scheduleInfo.coveragePercent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Alerts */}
                    {scheduleInfo.draftCount > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                            <span className="text-amber-500 text-base">⏳</span>
                            <div>
                                <p className="text-amber-800 font-semibold">{scheduleInfo.draftCount} jadwal masih berstatus Draft</p>
                                <p className="text-amber-700 mt-0.5">Publish jadwal agar aktif untuk validasi absensi karyawan.</p>
                            </div>
                        </div>
                    )}
                    {scheduleInfo.coveragePercent < 100 && scheduleInfo.coveragePercent > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs mt-2">
                            <span className="text-blue-500 text-base">💡</span>
                            <div>
                                <p className="text-blue-800 font-semibold">Jadwal belum lengkap ({scheduleInfo.coveragePercent}%)</p>
                                <p className="text-blue-700 mt-0.5">Beberapa karyawan belum memiliki jadwal di seluruh hari kerja bulan ini.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ScheduleSummaryCard;

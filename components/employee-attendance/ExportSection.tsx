import React from 'react';
import { Employee, AttendanceRecord, AttendanceRevisionHistory } from '../../types.ts';

interface ExportSectionProps {
    employee: Employee;
    monthFilter: string;
    dateFilter: { start: string; end: string };
    filteredRecords: AttendanceRecord[];
    filteredRevisionHistory: AttendanceRevisionHistory[];
    exportAttendance: () => void;
    exportRevisionHistory: () => void;
}

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ExportSection: React.FC<ExportSectionProps> = ({
    employee, monthFilter, dateFilter, filteredRecords, filteredRevisionHistory,
    exportAttendance, exportRevisionHistory,
}) => {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:hidden">
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#06736a]/10 flex items-center justify-center">
                    <DownloadIcon className="w-5 h-5 text-[#06736a]" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900">Export Laporan Karyawan</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Unduh data <span className="font-semibold text-gray-700">{employee.nama}</span> sesuai filter aktif saat ini.
                    </p>
                </div>
            </div>

            {/* Active filter info */}
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
                    <button type="button" onClick={exportAttendance} disabled={filteredRecords.length === 0}
                        className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#06736a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#055f57] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors">
                        <DownloadIcon className="w-4 h-4" />
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
                    <button type="button" onClick={exportRevisionHistory} disabled={filteredRevisionHistory.length === 0}
                        className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 transition-colors">
                        <DownloadIcon className="w-4 h-4" />
                        {filteredRevisionHistory.length === 0 ? 'Tidak Ada Data' : 'Unduh CSV Revisi'}
                    </button>
                </div>
            </div>

            {/* Footer note */}
            <p className="mt-4 text-xs text-gray-400 text-center">
                Format file: <strong>CSV</strong> · Encoding: <strong>UTF-8</strong> · Nama file menyertakan nama karyawan & timestamp
            </p>
        </section>
    );
};

export default ExportSection;

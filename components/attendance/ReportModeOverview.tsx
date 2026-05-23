import React from 'react';
import { Employee } from '../../types';
import { EyeIcon, ClipboardDocumentListIcon } from '../icons';

interface ReportModeOverviewProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    selectedEmployeeId: string | null;
    setSelectedEmployeeId: (id: string | null) => void;
    isSearchDropdownOpen: boolean;
    setIsSearchDropdownOpen: (val: boolean) => void;
    matchingEmployees: Employee[];
    selectedEmployee: Employee | null;
    attendanceSummaryByEmployee: Map<string, { total: number; late: number; latestDate: string | null }>;
    onOpenEmployeeHistory?: (employee: Employee) => void;
    detailSectionRef: React.RefObject<HTMLElement>;
    normalizedSearchTerm: string;
}

const ReportModeOverview: React.FC<ReportModeOverviewProps> = ({
    searchTerm,
    setSearchTerm,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    matchingEmployees,
    selectedEmployee,
    attendanceSummaryByEmployee,
    onOpenEmployeeHistory,
    detailSectionRef,
    normalizedSearchTerm,
}) => {
    return (
        <>
            <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
                    <div className="lg:col-span-3">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Cari Karyawan</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Masukkan nama karyawan"
                                value={searchTerm}
                                onFocus={() => setIsSearchDropdownOpen(true)}
                                onBlur={() => {
                                    window.setTimeout(() => setIsSearchDropdownOpen(false), 120);
                                }}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedEmployeeId(null);
                                    setIsSearchDropdownOpen(true);
                                }}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            />

                            {isSearchDropdownOpen && normalizedSearchTerm && (
                                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {matchingEmployees.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-gray-500">Tidak ada karyawan yang cocok.</p>
                                    ) : (
                                        matchingEmployees.map((employee) => (
                                            <button
                                                key={employee.id}
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm(employee.nama);
                                                    setSelectedEmployeeId(employee.id);
                                                    setIsSearchDropdownOpen(false);
                                                }}
                                                className="flex w-full items-start justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-[#f2faf9]"
                                            >
                                                <span className="truncate text-xs font-medium text-gray-900">{employee.nama}</span>
                                                <span className="shrink-0 text-[11px] text-gray-500">{employee.nik || '-'}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedEmployeeId && (
                            <div className="mt-1 flex items-center justify-between">
                                <p className="text-[11px] text-emerald-700">Karyawan dipilih: {searchTerm}</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedEmployeeId(null);
                                        setSearchTerm('');
                                    }}
                                    className="text-[11px] font-semibold text-[#06736a] hover:underline"
                                >
                                    Tampilkan semua
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-1">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Menu Cepat</label>
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedEmployee) {
                                    onOpenEmployeeHistory?.(selectedEmployee);
                                    return;
                                }
                                detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-full rounded-lg bg-[#06736a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#055f57]"
                        >
                            Detail Laporan
                        </button>
                    </div>
                </div>
            </section>

            <section ref={detailSectionRef as React.RefObject<HTMLDivElement>} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-[#06736a]" />
                    <div>
                        <h3 className="text-sm font-bold text-[#06736a]">Cari Karyawan untuk Detail Laporan</h3>
                        <p className="text-xs text-gray-500">Pilih karyawan untuk membuka detail laporan absensi personal.</p>
                    </div>
                </div>
                {matchingEmployees.length === 0 ? (
                    <p className="text-sm text-gray-500">Tidak ada karyawan yang cocok dengan kata kunci pencarian.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {matchingEmployees.map((employee) => {
                            const summary = attendanceSummaryByEmployee.get(employee.id);
                            return (
                                <div key={employee.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 hover:border-[#06736a]/30 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <img
                                            src={employee.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nama)}&background=random`}
                                            alt={employee.nama}
                                            className="h-12 w-12 rounded-lg object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-900">{employee.nama}</p>
                                            <p className="truncate text-xs text-gray-500">{employee.jabatan} · {employee.departemen}</p>
                                            <p className="mt-1 text-xs text-gray-500">NIK: {employee.nik || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Riwayat: {summary?.total || 0}</span>
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Terlambat: {summary?.late || 0}</span>
                                        <span className="rounded-full bg-white px-2 py-1 text-gray-600 border border-gray-200">Terakhir: {summary?.latestDate || '-'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onOpenEmployeeHistory?.(employee)}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#06736a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#055f57]"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Lihat Detail Laporan
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
};

export default ReportModeOverview;

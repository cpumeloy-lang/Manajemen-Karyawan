import React from 'react';
import { AttendanceRevisionHistory, Employee } from '../../types.ts';
import { ClockIcon } from '../icons.tsx';

interface RevisionHistorySectionProps {
    employee: Employee;
    loadingRevision: boolean;
    filteredRevisionHistory: AttendanceRevisionHistory[];
    pagedRevisionHistory: AttendanceRevisionHistory[];
    revisionActionFilter: 'ALL' | 'APPROVE' | 'REJECT' | 'SYSTEM';
    setRevisionActionFilter: (v: 'ALL' | 'APPROVE' | 'REJECT' | 'SYSTEM') => void;
    revisionReasonFilter: string;
    setRevisionReasonFilter: (v: string) => void;
    revisionSearchTerm: string;
    setRevisionSearchTerm: (v: string) => void;
    revisionPage: number;
    setRevisionPage: (v: number | ((p: number) => number)) => void;
    revisionPageSize: number;
    setRevisionPageSize: (v: number) => void;
    totalRevisionPages: number;
    revisionReasonOptions: string[];
}

const RevisionHistorySection: React.FC<RevisionHistorySectionProps> = ({
    employee, loadingRevision, filteredRevisionHistory, pagedRevisionHistory,
    revisionActionFilter, setRevisionActionFilter, revisionReasonFilter, setRevisionReasonFilter,
    revisionSearchTerm, setRevisionSearchTerm, revisionPage, setRevisionPage,
    revisionPageSize, setRevisionPageSize, totalRevisionPages, revisionReasonOptions,
}) => {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-[#06736a]" />
                        <h3 className="text-lg font-bold text-[#06736a]">Riwayat Revisi Personal Karyawan</h3>
                    </div>
                    <p className="text-xs text-gray-500">Log revisi absensi personal untuk {employee.nama}.</p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">Total baris: {filteredRevisionHistory.length}</span>
            </div>

            {/* Filters */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <input type="text" value={revisionSearchTerm} onChange={(e) => setRevisionSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 md:w-56" placeholder="Cari reason/catatan" />
                <select value={revisionActionFilter} onChange={(e) => setRevisionActionFilter(e.target.value as any)}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700" title="Filter aksi revisi">
                    <option value="ALL">Semua Aksi</option>
                    <option value="APPROVE">APPROVE</option>
                    <option value="REJECT">REJECT</option>
                    <option value="SYSTEM">SYSTEM</option>
                </select>
                <select value={revisionReasonFilter} onChange={(e) => setRevisionReasonFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700" title="Filter reason code">
                    <option value="ALL">Semua Reason</option>
                    {revisionReasonOptions.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                    ))}
                </select>
                <select value={revisionPageSize} onChange={(e) => setRevisionPageSize(Number(e.target.value))}
                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700" title="Jumlah baris per halaman">
                    <option value={10}>10/baris</option>
                    <option value={20}>20/baris</option>
                    <option value={50}>50/baris</option>
                    <option value={100}>100/baris</option>
                </select>
            </div>

            {/* Content */}
            {loadingRevision ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-gray-700">Memuat riwayat revisi...</p>
                </div>
            ) : filteredRevisionHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                    <p className="text-sm font-medium text-gray-700">Belum ada data riwayat revisi.</p>
                    <p className="mt-1 text-xs text-gray-500">Coba ubah filter aksi, reason code, atau kata kunci pencarian.</p>
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <div className="max-h-[560px] overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                        {['Waktu', 'Tanggal', 'Aksi', 'Reason', 'Catatan'].map((h) => (
                                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {pagedRevisionHistory.map((item) => (
                                        <tr key={item.id} className="odd:bg-white even:bg-gray-50/40 hover:bg-[#f2faf9]">
                                            <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">{item.attendance_date}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-xs">
                                                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${item.action === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : item.action === 'REJECT' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {item.action}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">{item.reason_code || '-'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{item.reason_detail || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                        <p>Halaman {revisionPage} dari {totalRevisionPages} · Total {filteredRevisionHistory.length} data</p>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={revisionPage <= 1} onClick={() => setRevisionPage((prev: number) => Math.max(1, prev - 1))}
                                className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400">Prev</button>
                            <button type="button" disabled={revisionPage >= totalRevisionPages} onClick={() => setRevisionPage((prev: number) => Math.min(totalRevisionPages, prev + 1))}
                                className="rounded-lg border border-[#06736a]/30 px-3 py-1.5 font-semibold text-[#06736a] hover:bg-[#e6f3f2] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400">Next</button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
};

export default RevisionHistorySection;

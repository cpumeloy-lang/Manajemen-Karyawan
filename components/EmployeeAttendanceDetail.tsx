import React, { useMemo, useState } from 'react';
import { Employee, AttendanceRecord, WorkUnit } from '../types.ts';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, PrinterIcon, UserCircleIcon } from './icons.tsx';

interface EmployeeAttendanceDetailProps {
    employee: Employee;
    attendanceRecords: AttendanceRecord[];
    workUnit?: WorkUnit;
    onBack: () => void;
}

const EmployeeAttendanceDetail: React.FC<EmployeeAttendanceDetailProps> = ({ employee, attendanceRecords, workUnit, onBack }) => {
    const [monthFilter, setMonthFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

    const months = useMemo(() => {
        const values = new Set<string>();
        attendanceRecords.forEach((record) => {
            values.add(record.tanggal.slice(0, 7));
        });
        return [...values].sort((a, b) => b.localeCompare(a));
    }, [attendanceRecords]);

    const filteredRecords = useMemo(() => {
        return [...attendanceRecords]
            .filter((record) => monthFilter === 'all' || record.tanggal.startsWith(monthFilter))
            .filter((record) => {
                if (dateFilter.start && record.tanggal < dateFilter.start) return false;
                if (dateFilter.end && record.tanggal > dateFilter.end) return false;
                return true;
            })
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, dateFilter.end, dateFilter.start, monthFilter]);

    const stats = useMemo(() => {
        const total = filteredRecords.length;
        const late = filteredRecords.filter((record) => record.isLate).length;
        const overtime = Number(filteredRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0).toFixed(2));
        const firstDate = filteredRecords[filteredRecords.length - 1]?.tanggal || null;
        const lastDate = filteredRecords[0]?.tanggal || null;

        return { total, late, overtime, firstDate, lastDate };
    }, [filteredRecords]);

    const printReport = () => window.print();

    return (
        <div className="space-y-6 print:space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:shadow-none">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                        <img
                            src={employee.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.nama)}&background=random`}
                            alt={employee.nama}
                            className="h-20 w-20 rounded-2xl object-cover ring-4 ring-[#e6f3f2]"
                        />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#06736a]">Detail Absensi Karyawan</p>
                            <h2 className="mt-1 text-2xl font-bold text-gray-900">{employee.nama}</h2>
                            <p className="text-sm text-gray-600">{employee.jabatan} - {employee.departemen}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="rounded-full bg-gray-100 px-3 py-1">NIK: {employee.nik || '-'}</span>
                                <span className="rounded-full bg-gray-100 px-3 py-1">Unit: {workUnit?.nama || '-'}</span>
                                <span className="rounded-full bg-gray-100 px-3 py-1">Shift: {employee.shift}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <button
                            type="button"
                            onClick={printReport}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Cetak
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#06736a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#055f57]"
                        >
                            Kembali
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                    <div className="xl:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Filter Bulan</label>
                        <select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Filter bulan absensi"
                        >
                            <option value="all">Semua bulan</option>
                            {months.map((month) => (
                                <option key={month} value={month}>
                                    {new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal mulai absensi"
                            placeholder="Pilih tanggal mulai"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Akhir</label>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal akhir absensi"
                            placeholder="Pilih tanggal akhir"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:shadow-none">
                <div className="mb-3 flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-[#06736a]" />
                    <h3 className="text-lg font-bold text-[#06736a]">Riwayat Absensi Lengkap</h3>
                </div>
                {filteredRecords.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Masuk</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pulang</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lembur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{new Date(record.tanggal).toLocaleDateString('id-ID')}</td>
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
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                        Tidak ada data absensi pada filter yang dipilih.
                    </div>
                )}
            </section>
        </div>
    );
};

export default EmployeeAttendanceDetail;
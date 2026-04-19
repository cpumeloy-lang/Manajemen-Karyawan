import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, Shift } from '../types.ts';
import { ClockIcon, MapPinIcon } from './icons.tsx';

interface AttendanceManagementProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    onSave: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ employees, attendanceRecords, onSave }) => {
    const today = new Date().toISOString().split('T')[0];
    const generatedAt = new Date();
    const [newRecord, setNewRecord] = useState({
        employeeId: '',
        tanggal: today,
        clockIn: '',
        clockOut: '',
        location: 'RS Utama (Manual)',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [showManualForm, setShowManualForm] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const employeeMap = useMemo(() => 
        new Map(employees.map(emp => [emp.id, emp])), 
    [employees]);

    const calculateAttendanceDetails = (employeeId: string, clockIn: string, clockOut: string) => {
        const employee = employeeMap.get(employeeId);
        if (!employee) return { isLate: false, overtimeHours: 0 };

        const shiftStartTimes: Record<Shift, number> = { 'Pagi': 8, 'Siang': 14, 'Malam': 21 };
        const shiftDuration = 8; // hours

        const startTime = shiftStartTimes[employee.shift];
        const [clockInHour, clockInMinute] = clockIn.split(':').map(Number);
        
        const isLate = clockInHour > startTime || (clockInHour === startTime && clockInMinute > 0);
        
        const [clockOutHour, clockOutMinute] = clockOut.split(':').map(Number);

        const clockInTime = clockInHour + clockInMinute / 60;
        let clockOutTime = clockOutHour + clockOutMinute / 60;

        // Handle overnight shifts
        if (clockOutTime < clockInTime) {
            clockOutTime += 24;
        }

        const workDuration = clockOutTime - clockInTime;
        const overtimeHours = Math.max(0, parseFloat((workDuration - shiftDuration).toFixed(2)));

        return { isLate, overtimeHours };
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecord.employeeId || !newRecord.clockIn || !newRecord.clockOut) {
            alert("Harap lengkapi semua field.");
            return;
        }
        
        const { isLate, overtimeHours } = calculateAttendanceDetails(newRecord.employeeId, newRecord.clockIn, newRecord.clockOut);

        setIsSaving(true);
        try {
            const saved = await onSave({ ...newRecord, isLate, overtimeHours });
            if (!saved) return;

            setNewRecord({
                employeeId: '',
                tanggal: today,
                clockIn: '',
                clockOut: '',
                location: 'RS Utama (Manual)',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const filteredRecords = useMemo(() => {
        return attendanceRecords
            .map(record => ({
                ...record,
                employeeName: employeeMap.get(record.employeeId)?.nama || 'N/A',
            }))
            .filter(record => 
                record.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .filter(record => {
                const recordDate = new Date(record.tanggal);
                const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
                const endDate = dateFilter.end ? new Date(dateFilter.end) : null;
                if (startDate && recordDate < startDate) return false;
                if (endDate && recordDate > endDate) return false;
                return true;
            })
            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    }, [attendanceRecords, searchTerm, dateFilter, employeeMap]);

    const attendanceStats = useMemo(() => {
        const lateCount = filteredRecords.filter(record => record.isLate).length;
        const totalOvertime = filteredRecords.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
        return {
            totalRecords: filteredRecords.length,
            lateCount,
            onTimeCount: Math.max(filteredRecords.length - lateCount, 0),
            overtimeRecordCount: filteredRecords.filter(record => (record.overtimeHours || 0) > 0).length,
            totalOvertime: Number(totalOvertime.toFixed(2)),
        };
    }, [filteredRecords]);

    const summaryByEmployee = useMemo(() => {
        const map = new Map<string, { employeeName: string; hadir: number; terlambat: number; lembur: number }>();

        filteredRecords.forEach((record) => {
            const prev = map.get(record.employeeId) || {
                employeeName: record.employeeName,
                hadir: 0,
                terlambat: 0,
                lembur: 0,
            };

            prev.hadir += 1;
            if (record.isLate) prev.terlambat += 1;
            prev.lembur += record.overtimeHours || 0;
            map.set(record.employeeId, prev);
        });

        return [...map.values()]
            .map((item) => ({ ...item, lembur: Number(item.lembur.toFixed(2)) }))
            .sort((a, b) => b.hadir - a.hadir)
            .slice(0, 10);
    }, [filteredRecords]);

    const periodLabel = useMemo(() => {
        if (dateFilter.start && dateFilter.end) return `${dateFilter.start} s/d ${dateFilter.end}`;
        if (dateFilter.start) return `Mulai ${dateFilter.start}`;
        if (dateFilter.end) return `Sampai ${dateFilter.end}`;
        return 'Semua periode';
    }, [dateFilter.end, dateFilter.start]);

    const resetFilters = () => {
        setSearchTerm('');
        setDateFilter({ start: '', end: '' });
    };

    return (
        <div className="space-y-2">
            <div className="fixed left-64 right-0 top-0 z-30 bg-gray-50 px-6 pt-2">
                <section className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="max-w-2xl">
                            <h2 className="text-xl font-bold text-[#06736a]">Laporan Kehadiran Karyawan</h2>
                            <p className="mt-1 text-sm text-gray-600">Ringkasan operasional absensi untuk monitoring dan audit kehadiran.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 xl:min-w-[500px]">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Periode</p>
                                <p className="font-semibold text-gray-800">{periodLabel}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Dibuat</p>
                                <p className="font-semibold text-gray-800">{generatedAt.toLocaleDateString('id-ID')}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Jam Cetak</p>
                                <p className="font-semibold text-gray-800">{generatedAt.toLocaleTimeString('id-ID')}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="h-[84px] lg:h-[80px] xl:h-[72px]" aria-hidden="true" />

            <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Cari Karyawan</label>
                        <input
                            type="text"
                            placeholder="Masukkan nama karyawan"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={dateFilter.start}
                            onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal mulai"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal Akhir</label>
                        <input
                            type="date"
                            value={dateFilter.end}
                            onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                            title="Tanggal akhir"
                        />
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Reset Filter
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowManualForm(prev => !prev)}
                        className="rounded-md border border-[#06736a]/40 px-3 py-1.5 text-sm font-medium text-[#06736a] hover:bg-[#e6f3f2]"
                    >
                        {showManualForm ? 'Sembunyikan Input Manual' : 'Tampilkan Input Manual'}
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Catatan</p>
                    <p className="mt-0.5 text-2xl font-bold text-emerald-900">{attendanceStats.totalRecords}</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Tepat Waktu</p>
                    <p className="mt-0.5 text-2xl font-bold text-green-900">{attendanceStats.onTimeCount}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Terlambat</p>
                    <p className="mt-0.5 text-2xl font-bold text-amber-900">{attendanceStats.lateCount}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Total Lembur</p>
                    <p className="mt-0.5 text-2xl font-bold text-sky-900">{attendanceStats.totalOvertime} jam</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Rekor Lembur</p>
                    <p className="mt-0.5 text-2xl font-bold text-indigo-900">{attendanceStats.overtimeRecordCount}</p>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                        <h3 className="mb-2 text-base font-bold text-[#06736a]">Detail Laporan Kehadiran</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">No</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Karyawan</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Jam Kerja</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lembur</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Lokasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredRecords.map((record, index) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{index + 1}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-900">{record.employeeName}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{new Date(record.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-700">
                                            <span className={record.isLate ? 'font-semibold text-red-600' : ''}>{record.clockIn}</span> - {record.clockOut}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2">
                                            {record.isLate ? (
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Terlambat</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Tepat Waktu</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">{record.overtimeHours > 0 ? `${record.overtimeHours} jam` : '-'}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-600">
                                            <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3 w-3 text-gray-400" />{record.location}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredRecords.length === 0 && <p className="py-10 text-center text-gray-500">Tidak ada data kehadiran untuk parameter laporan saat ini.</p>}
                </div>

                <div className="space-y-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                        <h3 className="mb-1.5 text-sm font-bold text-[#06736a]">Rekap Per Karyawan</h3>
                        {summaryByEmployee.length === 0 ? (
                            <p className="text-sm text-gray-500">Belum ada data rekap.</p>
                        ) : (
                            <div className="space-y-2">
                                {summaryByEmployee.map((item, idx) => (
                                    <div key={`${item.employeeName}-${idx}`} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                                        <p className="text-xs font-semibold text-gray-900">{item.employeeName}</p>
                                        <div className="mt-0.5 grid grid-cols-3 gap-1 text-xs text-gray-600">
                                            <p>Hadir: <span className="font-semibold text-gray-800">{item.hadir}</span></p>
                                            <p>Terlambat: <span className="font-semibold text-amber-700">{item.terlambat}</span></p>
                                            <p>Lembur: <span className="font-semibold text-sky-700">{item.lembur} jam</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="mb-2 flex items-center justify-between gap-1.5">
                            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5"><ClockIcon className="w-4 h-4" />Input Manual</h3>
                            <button
                                type="button"
                                onClick={() => setShowManualForm(prev => !prev)}
                                className="rounded-md border border-[#06736a]/30 px-3 py-1.5 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2]"
                            >
                                {showManualForm ? 'Sembunyikan' : 'Tampilkan'}
                            </button>
                        </div>
                        {showManualForm ? (
                            <form onSubmit={handleSaveRecord} className="grid grid-cols-1 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Karyawan</label>
                                    <select
                                        value={newRecord.employeeId}
                                        onChange={e => setNewRecord({ ...newRecord, employeeId: e.target.value })}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                                        required
                                        title="Pilih karyawan"
                                    >
                                        <option value="">Pilih Karyawan</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nama}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
                                        <input type="date" value={newRecord.tanggal} onChange={e => setNewRecord({ ...newRecord, tanggal: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Tanggal kehadiran" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Lokasi</label>
                                        <input type="text" value={newRecord.location} onChange={e => setNewRecord({ ...newRecord, location: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" placeholder="RS Utama / GPS kantor" title="Lokasi kehadiran" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Jam Masuk</label>
                                        <input type="time" value={newRecord.clockIn} onChange={e => setNewRecord({ ...newRecord, clockIn: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam masuk" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Jam Pulang</label>
                                        <input type="time" value={newRecord.clockOut} onChange={e => setNewRecord({ ...newRecord, clockOut: e.target.value })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20" required title="Jam pulang" />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
                                </button>
                            </form>
                        ) : (
                            <p className="text-sm text-gray-500">Panel input manual disembunyikan.</p>
                        )}
                    </section>
                </div>
            </section>
        </div>
    );
};

export default AttendanceManagement;

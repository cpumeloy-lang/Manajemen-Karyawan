import React from 'react';

interface AttendanceFiltersProps {
    monthFilter: string;
    setMonthFilter: (v: string) => void;
    dateFilter: { start: string; end: string };
    setDateFilter: (v: { start: string; end: string }) => void;
    months: string[];
}

const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
    monthFilter, setMonthFilter, dateFilter, setDateFilter, months,
}) => {
    return (
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
                        onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
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
                        onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#06736a] focus:ring-2 focus:ring-[#06736a]/20"
                        title="Tanggal akhir absensi"
                        placeholder="Pilih tanggal akhir"
                    />
                </div>
            </div>
        </section>
    );
};

export default AttendanceFilters;

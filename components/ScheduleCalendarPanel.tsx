import React, { useState, useEffect, useMemo } from 'react';
import { Employee, EmployeeSchedule, RotationPattern, ShiftDefinition, ShiftColor, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';
import {
    getSchedulesByUnit, generateBulkSchedules, publishSchedules,
    overrideSchedule, requestSwapShift, getRotationPatterns, getScheduleSummary,
    type ScheduleSummary,
} from '../services/scheduleService.ts';
import { CalendarDaysIcon, ClockIcon, UserGroupIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import { useConfirm } from './ConfirmDialog.tsx';

const COLOR_CLASSES: Record<ShiftColor, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    teal: 'bg-teal-100 text-teal-800 border-teal-300',
    gray: 'bg-gray-100 text-gray-700 border-gray-300',
};

interface ScheduleCalendarPanelProps {
    unitId: string;
    unitShifts: ShiftDefinition[];
    employees: Employee[];
    userId: string;
    onNotify: (type: 'success' | 'error', text: string) => void;
}

const ScheduleCalendarPanel: React.FC<ScheduleCalendarPanelProps> = ({
    unitId, unitShifts, employees, userId, onNotify
}) => {
    const confirm = useConfirm();
    const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
    const [patterns, setPatterns] = useState<RotationPattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [summary, setSummary] = useState<ScheduleSummary | null>(null);

    // Current month view
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Generate modal state
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedPatternId, setSelectedPatternId] = useState('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [staggerOffset, setStaggerOffset] = useState(0);

    const { startDate, endDate, daysInMonth } = useMemo(() => {
        const [year, month] = viewMonth.split('-').map(Number);
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate: start, endDate: end, daysInMonth: lastDay };
    }, [viewMonth]);

    const dayHeaders = useMemo(() => {
        const headers: { date: string; dayName: string; dayNum: number; isWeekend: boolean }[] = [];
        const [year, month] = viewMonth.split('-').map(Number);
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(year, month - 1, d);
            const dayOfWeek = dt.getDay();
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            headers.push({
                date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                dayName: dayNames[dayOfWeek],
                dayNum: d,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            });
        }
        return headers;
    }, [viewMonth, daysInMonth]);

    useEffect(() => { loadData(); }, [unitId, startDate, endDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [schedData, patternData, summaryData] = await Promise.all([
                getSchedulesByUnit(unitId, startDate, endDate),
                getRotationPatterns(unitId),
                getScheduleSummary(unitId, startDate, endDate),
            ]);
            setSchedules(schedData);
            setPatterns(patternData);
            setSummary(summaryData);
        } catch (err: any) {
            onNotify('error', `Gagal memuat jadwal: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Build schedule grid: employeeId → date → schedule
    const scheduleGrid = useMemo(() => {
        const grid: Record<string, Record<string, EmployeeSchedule>> = {};
        employees.forEach(emp => { grid[emp.id] = {}; });
        schedules.forEach(s => {
            if (!grid[s.employee_id]) grid[s.employee_id] = {};
            grid[s.employee_id][s.schedule_date] = s;
        });
        return grid;
    }, [employees, schedules]);

    const getShiftCellStyle = (shiftName?: string | null): string => {
        if (!shiftName) return 'bg-gray-100 text-gray-600 text-[9px]';
        if (String(shiftName).toLowerCase() === 'libur') return 'bg-gray-50 text-gray-400 text-[9px]';
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? `${COLOR_CLASSES[def.color]} text-[9px] font-semibold` : 'bg-gray-100 text-gray-600 text-[9px]';
    };

    // ====== GENERATE ======
    const handleGenerate = async () => {
        if (!selectedPatternId || selectedEmployeeIds.length === 0) {
            onNotify('error', 'Pilih pola rotasi dan minimal 1 karyawan.');
            return;
        }
        try {
            setGenerating(true);
            const result = await generateBulkSchedules(
                selectedEmployeeIds, unitId, selectedPatternId,
                startDate, endDate, userId, staggerOffset
            );
            onNotify('success', `Berhasil generate ${result.total} jadwal untuk ${selectedEmployeeIds.length} karyawan.`);
            setShowGenerateModal(false);
            await loadData();
        } catch (err: any) {
            onNotify('error', `Gagal generate: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    };

    // ====== PUBLISH ======
    const handlePublish = async () => {
        if (!summary || summary.draftDays === 0) {
            onNotify('error', 'Tidak ada jadwal draft untuk dipublikasi.');
            return;
        }
        const ok = await confirm({
            title: 'Publikasi Jadwal',
            message: `Publish ${summary.draftDays} jadwal draft? Setelah publish, jadwal akan aktif untuk validasi absensi.`,
            confirmLabel: 'Publish',
            variant: 'success',
        });
        if (!ok) return;
        try {
            setPublishing(true);
            const count = await publishSchedules(unitId, startDate, endDate, userId);
            onNotify('success', `${count} jadwal berhasil dipublikasi.`);
            await loadData();
        } catch (err: any) {
            onNotify('error', `Gagal publish: ${err.message}`);
        } finally {
            setPublishing(false);
        }
    };

    // ====== NAV ======
    const navigateMonth = (delta: number) => {
        const [year, month] = viewMonth.split('-').map(Number);
        const d = new Date(year, month - 1 + delta, 1);
        setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const monthLabel = useMemo(() => {
        const [year, month] = viewMonth.split('-').map(Number);
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        return `${months[month - 1]} ${year}`;
    }, [viewMonth]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigateMonth(-1)} className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">&lt;</button>
                    <h3 className="text-lg font-bold text-gray-800 min-w-[160px] text-center">{monthLabel}</h3>
                    <button onClick={() => navigateMonth(1)} className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">&gt;</button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setSelectedEmployeeIds(employees.map(e => e.id)); setShowGenerateModal(true); }}
                        disabled={patterns.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                        title={patterns.length === 0 ? 'Buat pola rotasi terlebih dahulu' : ''}
                    >
                        <CalendarDaysIcon className="w-4 h-4" />
                        Generate Jadwal
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={publishing || !summary || summary.draftDays === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {publishing ? <LoadingSpinner size="small" color="white" /> : <ClockIcon className="w-4 h-4" />}
                        Publish {summary && summary.draftDays > 0 ? `(${summary.draftDays})` : ''}
                    </button>
                </div>
            </div>

            {/* Summary stats */}
            {summary && summary.totalDays > 0 && (
                <div className="flex flex-wrap gap-3 text-xs">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
                        Total: {summary.totalDays} slot
                    </span>
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-medium">
                        Draft: {summary.draftDays}
                    </span>
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
                        Published: {summary.publishedDays}
                    </span>
                    <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg font-medium">
                        Libur: {summary.offDays}
                    </span>
                </div>
            )}

            {/* Coverage Alert */}
            {(() => {
                // Build coverage map: date → shift_name → count
                const cov: Record<string, Record<string, number>> = {};
                schedules.forEach(s => {
                    if (s.is_off_day) return;
                    const d = s.schedule_date;
                    if (!cov[d]) cov[d] = {};
                    cov[d][s.shift_name] = (cov[d][s.shift_name] || 0) + 1;
                });

                // Detect days where any unitShift has 0 coverage (excluding past dates)
                const todayStr = new Date().toISOString().slice(0, 10);
                type Gap = { date: string; missing: string[] };
                const gaps: Gap[] = [];
                dayHeaders.forEach(h => {
                    if (h.date < todayStr) return; // skip past dates
                    const dayCov = cov[h.date] || {};
                    const missing = unitShifts
                        .filter(s => (dayCov[s.name] || 0) === 0)
                        .map(s => s.name);
                    if (missing.length > 0 && Object.keys(dayCov).length > 0) {
                        // only flag days that have SOME schedule (avoid flagging future unscheduled days)
                        gaps.push({ date: h.date, missing });
                    }
                });

                if (gaps.length === 0) return null;

                return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-2">
                            ⚠️ Peringatan Coverage Shift — {gaps.length} hari memiliki shift yang kosong:
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {gaps.slice(0, 20).map(g => (
                                <span key={g.date} className="text-[10px] bg-white border border-amber-300 px-2 py-0.5 rounded font-medium text-amber-700">
                                    {g.date.slice(8)} → tanpa: {g.missing.join(', ')}
                                </span>
                            ))}
                            {gaps.length > 20 && (
                                <span className="text-[10px] text-amber-600 italic px-2">
                                    +{gaps.length - 20} hari lagi…
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Calendar grid */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-center text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left text-xs font-semibold text-gray-600 min-w-[140px]">
                                    Karyawan
                                </th>
                                {dayHeaders.map(h => (
                                    <th
                                        key={h.date}
                                        className={`px-0.5 py-1.5 min-w-[36px] ${h.isWeekend ? 'bg-red-50' : ''}`}
                                    >
                                        <div className="text-[9px] text-gray-400">{h.dayName}</div>
                                        <div className={`text-xs font-bold ${h.isWeekend ? 'text-red-500' : 'text-gray-700'}`}>{h.dayNum}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {employees.length === 0 ? (
                                <tr><td colSpan={daysInMonth + 1} className="py-8 text-gray-500">Tidak ada karyawan</td></tr>
                            ) : (
                                employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50">
                                        <td className="sticky left-0 bg-white z-10 px-3 py-1.5 text-left border-r border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={emp.foto || 'https://via.placeholder.com/24'}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                                <span className="text-xs font-medium text-gray-800 truncate max-w-[100px]">{emp.nama}</span>
                                            </div>
                                        </td>
                                        {dayHeaders.map(h => {
                                            const sched = scheduleGrid[emp.id]?.[h.date];
                                            if (!sched) {
                                                return (
                                                    <td key={h.date} className={`px-0.5 py-1 ${h.isWeekend ? 'bg-red-50/30' : ''}`}>
                                                        <span className="text-gray-300">–</span>
                                                    </td>
                                                );
                                            }
                                            const cellStyle = getShiftCellStyle(sched.shift_name);
                                            const statusDot = sched.status === 'draft' ? 'border-b-2 border-amber-400' :
                                                sched.status === 'published' ? '' :
                                                sched.status === 'swapped' ? 'border-b-2 border-purple-400' :
                                                'border-b-2 border-orange-400';
                                            return (
                                                <td key={h.date} className={`px-0.5 py-1 ${h.isWeekend ? 'bg-red-50/30' : ''}`}>
                                                    <span
                                                        className={`inline-block px-1 py-0.5 rounded ${cellStyle} ${statusDot} cursor-default`}
                                                        title={`${sched.shift_name} (${sched.status})${sched.shift_start_time ? ' ' + sched.shift_start_time + '-' + sched.shift_end_time : ''}`}
                                                    >
                                                        {sched.is_off_day ? 'L' : sched.shift_name.slice(0, 2).toUpperCase()}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 items-center">
                <span className="font-semibold text-gray-600">Legenda:</span>
                {unitShifts.map(s => (
                    <span key={s.id} className="flex items-center gap-1">
                        <span className={`w-5 h-4 rounded text-center text-[9px] font-bold ${COLOR_CLASSES[s.color]}`}>
                            {s.name.slice(0, 2).toUpperCase()}
                        </span>
                        {s.name}
                    </span>
                ))}
                <span className="flex items-center gap-1">
                    <span className="w-5 h-4 rounded text-center text-[9px] bg-gray-50 text-gray-400 border border-dashed border-gray-300">L</span>
                    Libur
                </span>
                <span className="ml-2 border-b-2 border-amber-400 px-1">draft</span>
                <span className="border-b-2 border-purple-400 px-1">swapped</span>
                <span className="border-b-2 border-orange-400 px-1">override</span>
            </div>

            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGenerateModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-primary" />
                            Generate Jadwal: {monthLabel}
                        </h3>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Pola Rotasi</label>
                            <select
                                value={selectedPatternId}
                                onChange={e => setSelectedPatternId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">-- Pilih Pola --</option>
                                {patterns.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.cycle_days} hari: {p.pattern.slice(0, 4).join('-')}...)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Karyawan ({selectedEmployeeIds.length}/{employees.length} terpilih)
                            </label>
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer pb-1 border-b border-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployeeIds.length === employees.length}
                                        onChange={e => setSelectedEmployeeIds(e.target.checked ? employees.map(emp => emp.id) : [])}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Pilih Semua
                                </label>
                                {employees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployeeIds.includes(emp.id)}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedEmployeeIds(prev => [...prev, emp.id]);
                                                else setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                            }}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        {emp.nama}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Stagger Offset (hari antar karyawan)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={14}
                                value={staggerOffset}
                                onChange={e => setStaggerOffset(Number(e.target.value))}
                                className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                0 = semua mulai dari hari yang sama. &gt;0 = karyawan berikutnya dimulai N hari kemudian dalam siklus.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                            <button
                                onClick={handleGenerate}
                                disabled={generating || !selectedPatternId || selectedEmployeeIds.length === 0}
                                className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                            >
                                {generating ? <LoadingSpinner size="small" color="white" /> : null}
                                Generate {selectedEmployeeIds.length} Karyawan
                            </button>
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
                            >
                                Batal
                            </button>
                        </div>

                        <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2">
                            ⚠️ Generate akan menimpa jadwal draft yang sudah ada. Jadwal yang sudah di-publish tidak akan terpengaruh.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleCalendarPanel;

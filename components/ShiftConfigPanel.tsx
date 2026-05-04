import React, { useState } from 'react';
import { ShiftDefinition, ShiftColor, WeekDay, WEEK_DAYS, WEEK_DAY_LABELS, DaySchedule } from '../types';

interface ShiftConfigPanelProps {
    shifts: ShiftDefinition[];
    onChange: (shifts: ShiftDefinition[]) => void;
}

const SHIFT_COLORS: ShiftColor[] = ['yellow', 'blue', 'indigo', 'green', 'red', 'purple', 'orange', 'teal'];
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
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
};

const EMPTY_FIXED_SCHEDULE: Partial<Record<WeekDay, DaySchedule | null>> = {
    senin: { startTime: '08:00', endTime: '16:00' },
    selasa: { startTime: '08:00', endTime: '16:00' },
    rabu: { startTime: '08:00', endTime: '16:00' },
    kamis: { startTime: '08:00', endTime: '16:00' },
    jumat: { startTime: '08:00', endTime: '16:00' },
    sabtu: { startTime: '08:00', endTime: '12:00' },
    minggu: null,
};

const ShiftConfigPanel: React.FC<ShiftConfigPanelProps> = ({ shifts, onChange }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const update = (id: string, patch: Partial<ShiftDefinition>) => {
        onChange(shifts.map(s => s.id === id ? { ...s, ...patch } : s));
    };

    const updateDaySchedule = (shiftId: string, day: WeekDay, field: 'startTime' | 'endTime' | 'enabled', value: string | boolean) => {
        const shift = shifts.find(s => s.id === shiftId);
        if (!shift) return;
        const current = shift.weeklySchedule ?? {};
        let dayEntry = current[day] ?? null;

        if (field === 'enabled') {
            if (value) {
                dayEntry = { startTime: '08:00', endTime: '16:00' };
            } else {
                dayEntry = null;
            }
        } else if (dayEntry && (field === 'startTime' || field === 'endTime')) {
            dayEntry = { ...dayEntry, [field]: value as string };
        }
        update(shiftId, { weeklySchedule: { ...current, [day]: dayEntry } });
    };

    const addShift = () => {
        const id = `shift_${Date.now()}`;
        const newShift: ShiftDefinition = {
            id,
            name: 'Shift Baru',
            type: 'rotating',
            startTime: '08:00',
            endTime: '16:00',
            color: 'gray',
            lateToleranceMinutes: 15,
        };
        onChange([...shifts, newShift]);
        setExpandedId(id);
    };

    const removeShift = (id: string) => {
        onChange(shifts.filter(s => s.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="space-y-3">
            {shifts.map(shift => (
                <div key={shift.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Header row */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedId(expandedId === shift.id ? null : shift.id)}
                    >
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${COLOR_CLASSES[shift.color]}`}>
                            {shift.name || 'Shift'}
                        </span>
                        <span className="text-xs text-gray-500">
                            {shift.type === 'fixed'
                                ? 'Jadwal Per Hari'
                                : (() => {
                                    const sabtu  = shift.weeklySchedule?.['sabtu'];
                                    const minggu = shift.weeklySchedule?.['minggu'];
                                    const weekdayStr = `${shift.startTime || '08:00'} – ${shift.endTime || '16:00'}`;
                                    const sabtuStr  = sabtu  === null ? 'Libur' : sabtu  ? `${(sabtu  as any).startTime}–${(sabtu  as any).endTime}` : weekdayStr;
                                    const mingguStr = minggu === null ? 'Libur' : minggu ? `${(minggu as any).startTime}–${(minggu as any).endTime}` : weekdayStr;
                                    return `Sen–Jum ${weekdayStr} · Sab ${sabtuStr} · Min ${mingguStr}`;
                                })()
                            }
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                            {expandedId === shift.id ? '▲ Tutup' : '▼ Edit'}
                        </span>
                    </div>

                    {/* Expanded edit panel */}
                    {expandedId === shift.id && (
                        <div className="px-4 py-4 space-y-4 bg-white">
                            {/* Name + Color + Type */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Shift</label>
                                    <input
                                        type="text"
                                        value={shift.name}
                                        onChange={e => update(shift.id, { name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#06736a] focus:border-[#06736a]"
                                        placeholder="Contoh: Pagi, Siang, Malam"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
                                    <select
                                        value={shift.type}
                                        onChange={e => {
                                            const t = e.target.value as 'rotating' | 'fixed';
                                            update(shift.id, {
                                                type: t,
                                                weeklySchedule: t === 'fixed' ? EMPTY_FIXED_SCHEDULE : undefined,
                                            });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#06736a] focus:border-[#06736a]"
                                    >
                                        <option value="rotating">Rotating (jam tetap setiap hari)</option>
                                        <option value="fixed">Fixed (jadwal per hari/minggu)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Warna</label>
                                    <select
                                        value={shift.color}
                                        onChange={e => update(shift.id, { color: e.target.value as ShiftColor })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#06736a] focus:border-[#06736a]"
                                    >
                                        {SHIFT_COLORS.map(c => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Toleransi */}
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Toleransi Terlambat (menit)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={shift.lateToleranceMinutes}
                                    onChange={e => update(shift.id, { lateToleranceMinutes: Number(e.target.value) })}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#06736a]"
                                />
                            </div>

                            {/* Rotating: jam hari kerja + weekend override */}
                            {shift.type === 'rotating' && (
                                <div className="space-y-4">
                                    {/* Jam hari kerja Senin–Jumat */}
                                    <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">
                                            Jam Kerja Senin – Jumat
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Jam Masuk</label>
                                                <input
                                                    type="time"
                                                    value={shift.startTime || '08:00'}
                                                    onChange={e => update(shift.id, { startTime: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#06736a]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Jam Keluar</label>
                                                <input
                                                    type="time"
                                                    value={shift.endTime || '16:00'}
                                                    onChange={e => update(shift.id, { endTime: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#06736a]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weekend Override */}
                                    <div className="rounded-xl border border-dashed border-gray-300 p-3 space-y-3">
                                        <p className="text-xs font-semibold text-gray-600">⚙️ Pengaturan Weekend (Sabtu & Minggu)</p>
                                        {(['sabtu', 'minggu'] as WeekDay[]).map(day => {
                                            const dayEntry = shift.weeklySchedule?.[day];
                                            // undefined = belum diatur (ikut jam weekday), null = libur, object = jam custom
                                            const mode: 'same' | 'custom' | 'off' =
                                                dayEntry === undefined ? 'same' :
                                                dayEntry === null     ? 'off'  : 'custom';

                                            const setMode = (m: 'same' | 'custom' | 'off') => {
                                                const current = shift.weeklySchedule ?? {};
                                                let next: Partial<Record<WeekDay, DaySchedule | null>>;
                                                if (m === 'same') {
                                                    const { [day]: _removed, ...rest } = current as any;
                                                    next = rest;
                                                } else if (m === 'off') {
                                                    next = { ...current, [day]: null };
                                                } else {
                                                    next = { ...current, [day]: { startTime: '08:00', endTime: '12:00' } };
                                                }
                                                update(shift.id, { weeklySchedule: next });
                                            };

                                            return (
                                                <div key={day} className="space-y-2">
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <span className="w-16 text-sm font-medium text-gray-700">
                                                            {day === 'sabtu' ? 'Sabtu' : 'Minggu'}
                                                        </span>
                                                        {(['same', 'custom', 'off'] as const).map(opt => (
                                                            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    name={`${shift.id}-${day}-mode`}
                                                                    checked={mode === opt}
                                                                    onChange={() => setMode(opt)}
                                                                    className="text-[#06736a] focus:ring-[#06736a]"
                                                                />
                                                                <span className="text-xs text-gray-600">
                                                                    {opt === 'same'   ? 'Sama seperti hari kerja' :
                                                                     opt === 'custom' ? 'Jam berbeda' : 'Libur'}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {mode === 'custom' && dayEntry && typeof dayEntry === 'object' && (
                                                        <div className="flex items-center gap-2 ml-[4.5rem]">
                                                            <input
                                                                type="time"
                                                                value={(dayEntry as DaySchedule).startTime}
                                                                onChange={e => updateDaySchedule(shift.id, day, 'startTime', e.target.value)}
                                                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#06736a] w-28"
                                                            />
                                                            <span className="text-gray-400 text-xs">–</span>
                                                            <input
                                                                type="time"
                                                                value={(dayEntry as DaySchedule).endTime}
                                                                onChange={e => updateDaySchedule(shift.id, day, 'endTime', e.target.value)}
                                                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#06736a] w-28"
                                                            />
                                                        </div>
                                                    )}
                                                    {mode === 'off' && (
                                                        <p className="ml-[4.5rem] text-xs text-gray-400 italic">Libur — tidak ada jam kerja</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Fixed: per-day schedule */}
                            {shift.type === 'fixed' && (
                                <div>
                                    <p className="text-xs font-medium text-gray-600 mb-2">Jadwal Per Hari</p>
                                    <div className="space-y-2">
                                        {WEEK_DAYS.map(day => {
                                            const dayEntry = shift.weeklySchedule?.[day];
                                            const isActive = dayEntry !== null && dayEntry !== undefined;
                                            return (
                                                <div key={day} className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`${shift.id}-${day}`}
                                                        checked={isActive}
                                                        onChange={e => updateDaySchedule(shift.id, day, 'enabled', e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[#06736a] focus:ring-[#06736a]"
                                                    />
                                                    <label htmlFor={`${shift.id}-${day}`} className="w-20 text-sm font-medium text-gray-700">
                                                        {WEEK_DAY_LABELS[day]}
                                                    </label>
                                                    {isActive && dayEntry ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="time"
                                                                value={dayEntry.startTime}
                                                                onChange={e => updateDaySchedule(shift.id, day, 'startTime', e.target.value)}
                                                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#06736a] w-28"
                                                            />
                                                            <span className="text-gray-400 text-xs">–</span>
                                                            <input
                                                                type="time"
                                                                value={dayEntry.endTime}
                                                                onChange={e => updateDaySchedule(shift.id, day, 'endTime', e.target.value)}
                                                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#06736a] w-28"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Libur</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Delete button */}
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => removeShift(shift.id)}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                >
                                    🗑 Hapus Shift Ini
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={addShift}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-[#06736a] hover:text-[#06736a] transition-colors"
            >
                + Tambah Jenis Shift
            </button>
        </div>
    );
};

export default ShiftConfigPanel;

import React, { useState } from 'react';
import { ShiftDefinition, ShiftColor, WEEK_DAYS, WEEK_DAY_LABELS } from '../../types.ts';
import { ClockIcon, PlusIcon, TrashIcon, PencilIcon } from '../icons.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { SHIFT_COLORS, COLOR_CLASSES } from './constants.ts';

interface ShiftDefinitionPanelProps {
    unitShifts: ShiftDefinition[];
    onShiftsChange: (shifts: ShiftDefinition[]) => void;
    unitShiftsDirty: boolean;
    savingConfig: boolean;
    workUnitName: string;
    unitEmployees: { jabatan?: string }[];
    onSave: () => void;
    onReset: () => void;
    showNotification: (type: 'success' | 'error', text: string) => void;
}

const ShiftDefinitionPanel: React.FC<ShiftDefinitionPanelProps> = ({
    unitShifts, onShiftsChange, unitShiftsDirty, savingConfig,
    workUnitName, unitEmployees, onSave, onReset, showNotification,
}) => {
    const [showAddShiftForm, setShowAddShiftForm] = useState(false);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
    const [newShiftForm, setNewShiftForm] = useState<Omit<ShiftDefinition, 'id'>>({
        name: '', type: 'rotating', startTime: '08:00', endTime: '16:00',
        color: 'green', lateToleranceMinutes: 15, positionGroup: '',
    });

    const resetForm = () => {
        setNewShiftForm({ name: '', type: 'rotating', startTime: '08:00', endTime: '16:00', color: 'green', lateToleranceMinutes: 15, positionGroup: '' });
        setEditingShiftId(null);
        setShowAddShiftForm(false);
    };

    const addShift = () => {
        if (!newShiftForm.name.trim()) return;
        if (unitShifts.some(s => String(s?.name || '').toLowerCase() === String(newShiftForm.name || '').trim().toLowerCase())) {
            showNotification('error', `Shift "${newShiftForm.name}" sudah ada.`);
            return;
        }
        const id = `custom_${Date.now()}`;
        onShiftsChange([...unitShifts, { id, ...newShiftForm, name: newShiftForm.name.trim() }]);
        resetForm();
    };

    const editShift = (shiftId: string) => {
        const shift = unitShifts.find(s => s.id === shiftId);
        if (!shift) return;
        const { id, ...rest } = shift;
        setNewShiftForm(rest);
        setEditingShiftId(shiftId);
        setShowAddShiftForm(true);
    };

    const saveEditShift = () => {
        if (!editingShiftId || !newShiftForm.name.trim()) return;
        onShiftsChange(unitShifts.map(s =>
            s.id === editingShiftId ? { ...s, ...newShiftForm, name: newShiftForm.name.trim() } : s
        ));
        resetForm();
    };

    const removeShift = (shiftId: string) => {
        if (unitShifts.length <= 1) {
            showNotification('error', 'Unit harus memiliki minimal 1 shift.');
            return;
        }
        onShiftsChange(unitShifts.filter(s => s.id !== shiftId));
    };

    const getShiftSummary = (shift: ShiftDefinition): string => {
        if (shift.type === 'rotating') {
            return `${shift.startTime || '08:00'} – ${shift.endTime || '16:00'} (setiap hari)`;
        }
        if (!shift.weeklySchedule) return 'Belum dikonfigurasi';
        const activeDays = WEEK_DAYS.filter(d => shift.weeklySchedule?.[d]);
        if (activeDays.length === 0) return 'Semua hari libur';
        const first = shift.weeklySchedule[activeDays[0]];
        const allSame = activeDays.every(d => {
            const ds = shift.weeklySchedule?.[d];
            return ds?.startTime === first?.startTime && ds?.endTime === first?.endTime;
        });
        if (allSame && first) {
            return `${first.startTime}–${first.endTime} (${activeDays.map(d => WEEK_DAY_LABELS[d].slice(0,3)).join(', ')})`;
        }
        return `${activeDays.length} hari kerja (bervariasi)`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-primary" />
                        Konfigurasi Shift Unit
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Definisikan jenis shift yang berlaku di unit {workUnitName}
                        {unitShiftsDirty && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                belum disimpan
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    {unitShiftsDirty && (
                        <button
                            onClick={onReset}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                    <button
                        onClick={onSave}
                        disabled={!unitShiftsDirty || savingConfig}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {savingConfig ? <LoadingSpinner size="small" color="white" /> : null}
                        Simpan Konfigurasi
                    </button>
                </div>
            </div>

            {/* Daftar shift yang sudah dikonfigurasi */}
            <div className="divide-y divide-gray-100">
                {unitShifts.map(shift => (
                    <div key={shift.id} className="px-5 py-3 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_CLASSES[shift.color].dot}`} />
                            <span className="font-medium text-gray-800 text-sm">{shift.name}</span>
                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                                shift.type === 'fixed' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                            }`}>
                                {shift.type === 'fixed' ? 'Tetap' : 'Bergilir'}
                            </span>
                            <span className="text-xs text-gray-500">{getShiftSummary(shift)}</span>
                            <span className="text-[10px] text-gray-400">toleransi {shift.lateToleranceMinutes ?? 15} mnt</span>
                            {shift.positionGroup && (
                                <span className="px-2 py-0.5 text-[10px] rounded-full bg-sky-100 text-sky-700 border border-sky-200 font-medium">
                                    👤 {shift.positionGroup}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                                onClick={() => editShift(shift.id)}
                                className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary/10"
                                title={`Edit shift ${shift.name}`}
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => removeShift(shift.id)}
                                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                                title={`Hapus shift ${shift.name}`}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form tambah/edit shift */}
            {showAddShiftForm ? (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    <p className="text-sm font-semibold text-gray-700">
                        {editingShiftId ? `Edit Shift: ${newShiftForm.name}` : 'Tambah Shift Baru'}
                    </p>

                    {/* Row 1: Nama, Tipe, Warna, Toleransi, Jabatan */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nama Shift</label>
                            <input
                                type="text"
                                value={newShiftForm.name}
                                onChange={e => setNewShiftForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="cth: Office Hour"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tipe Jadwal</label>
                            <select
                                value={newShiftForm.type}
                                onChange={e => setNewShiftForm(p => ({ ...p, type: e.target.value as 'fixed' | 'rotating' }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="rotating">Bergilir (jam sama setiap hari)</option>
                                <option value="fixed">Tetap (jam berbeda per hari)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Warna</label>
                            <select
                                value={newShiftForm.color}
                                onChange={e => setNewShiftForm(p => ({ ...p, color: e.target.value as ShiftColor }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                {SHIFT_COLORS.map(c => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Toleransi Terlambat (mnt)</label>
                            <input
                                type="number"
                                min={0}
                                max={60}
                                value={newShiftForm.lateToleranceMinutes}
                                onChange={e => setNewShiftForm(p => ({ ...p, lateToleranceMinutes: Number(e.target.value) }))}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Khusus Jabatan</label>
                            <input
                                type="text"
                                value={newShiftForm.positionGroup || ''}
                                onChange={e => setNewShiftForm(p => ({ ...p, positionGroup: e.target.value }))}
                                placeholder="cth: Cleaning Service"
                                list="jabatan-suggestions"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                            <datalist id="jabatan-suggestions">
                                {[...new Set(unitEmployees.map(e => e.jabatan).filter(Boolean))].map(j => (
                                    <option key={j} value={j} />
                                ))}
                            </datalist>
                            <p className="text-[10px] text-gray-400 mt-0.5">Kosongkan = berlaku semua jabatan</p>
                        </div>
                    </div>

                    {/* Row 2: Jam (berbeda tergantung type) */}
                    {newShiftForm.type === 'rotating' ? (
                        <div className="grid grid-cols-2 gap-3 max-w-sm">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Jam Mulai</label>
                                <input
                                    type="time"
                                    value={newShiftForm.startTime || '08:00'}
                                    onChange={e => setNewShiftForm(p => ({ ...p, startTime: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Jam Selesai</label>
                                <input
                                    type="time"
                                    value={newShiftForm.endTime || '16:00'}
                                    onChange={e => setNewShiftForm(p => ({ ...p, endTime: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Atur jam kerja per hari (kosongkan untuk hari libur):</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {WEEK_DAYS.map(day => {
                                    const daySched = newShiftForm.weeklySchedule?.[day];
                                    const isActive = !!daySched;
                                    return (
                                        <div key={day} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                                            isActive ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-gray-50'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={e => {
                                                    setNewShiftForm(p => {
                                                        const ws = { ...(p.weeklySchedule || {}) };
                                                        if (e.target.checked) {
                                                            ws[day] = { startTime: '08:00', endTime: '16:00' };
                                                        } else {
                                                            ws[day] = null;
                                                        }
                                                        return { ...p, weeklySchedule: ws };
                                                    });
                                                }}
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="font-medium text-xs w-10">{WEEK_DAY_LABELS[day].slice(0, 3)}</span>
                                            {isActive && (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={daySched?.startTime || '08:00'}
                                                        onChange={e => setNewShiftForm(p => {
                                                            const ws = { ...(p.weeklySchedule || {}) };
                                                            ws[day] = { ...(ws[day] || { startTime: '08:00', endTime: '16:00' }), startTime: e.target.value };
                                                            return { ...p, weeklySchedule: ws };
                                                        })}
                                                        className="px-1.5 py-1 text-xs border border-gray-300 rounded w-[75px]"
                                                    />
                                                    <span className="text-gray-400 text-xs">–</span>
                                                    <input
                                                        type="time"
                                                        value={daySched?.endTime || '16:00'}
                                                        onChange={e => setNewShiftForm(p => {
                                                            const ws = { ...(p.weeklySchedule || {}) };
                                                            ws[day] = { ...(ws[day] || { startTime: '08:00', endTime: '16:00' }), endTime: e.target.value };
                                                            return { ...p, weeklySchedule: ws };
                                                        })}
                                                        className="px-1.5 py-1 text-xs border border-gray-300 rounded w-[75px]"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <button
                            onClick={editingShiftId ? saveEditShift : addShift}
                            disabled={!newShiftForm.name.trim()}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium"
                        >
                            {editingShiftId ? 'Simpan Perubahan' : 'Tambah Shift'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-5 py-3 border-t border-gray-100">
                    <button
                        onClick={() => setShowAddShiftForm(true)}
                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Shift Baru
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShiftDefinitionPanel;

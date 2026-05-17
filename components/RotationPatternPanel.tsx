import React, { useState, useEffect } from 'react';
import { RotationPattern, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS, ShiftColor } from '../types.ts';
import { getRotationPatterns, createRotationPattern, updateRotationPattern, deleteRotationPattern } from '../services/scheduleService.ts';
import { PlusIcon, TrashIcon, PencilIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import { useConfirm } from './ConfirmDialog.tsx';
import { classifyError } from '../services/errorHandlingService.ts';

const COLOR_CLASSES: Record<ShiftColor, string> = {
    yellow: 'bg-yellow-200 text-yellow-900',
    blue: 'bg-blue-200 text-blue-900',
    indigo: 'bg-indigo-200 text-indigo-900',
    green: 'bg-green-200 text-green-900',
    red: 'bg-red-200 text-red-900',
    purple: 'bg-purple-200 text-purple-900',
    orange: 'bg-orange-200 text-orange-900',
    pink: 'bg-pink-200 text-pink-900',
    teal: 'bg-teal-200 text-teal-900',
    gray: 'bg-gray-300 text-gray-900',
};

interface RotationPatternPanelProps {
    unitId: string;
    unitShifts: ShiftDefinition[];
    userId: string;
    onNotify: (type: 'success' | 'error', text: string) => void;
}

const RotationPatternPanel: React.FC<RotationPatternPanelProps> = ({ unitId, unitShifts, userId, onNotify }) => {
    const confirm = useConfirm();
    const [patterns, setPatterns] = useState<RotationPattern[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPattern, setFormPattern] = useState<string[]>([]);

    const shiftOptions = [...unitShifts.map(s => s.name), 'Libur'];

    useEffect(() => { loadPatterns(); }, [unitId]);

    const loadPatterns = async () => {
        try {
            setLoading(true);
            const data = await getRotationPatterns(unitId);
            setPatterns(data);
        } catch (err: any) {
            onNotify('error', classifyError(err).userMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormPattern([]);
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (p: RotationPattern) => {
        setFormName(p.name);
        setFormDescription(p.description || '');
        setFormPattern([...p.pattern]);
        setEditingId(p.id);
        setShowForm(true);
    };

    const addDayToPattern = () => {
        setFormPattern(prev => [...prev, shiftOptions[0]]);
    };

    const removeDayFromPattern = (index: number) => {
        setFormPattern(prev => prev.filter((_, i) => i !== index));
    };

    const updateDayInPattern = (index: number, value: string) => {
        setFormPattern(prev => prev.map((v, i) => i === index ? value : v));
    };

    const handleSave = async () => {
        if (!formName.trim() || formPattern.length === 0) {
            onNotify('error', 'Nama dan pola harus diisi (minimal 1 hari).');
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await updateRotationPattern(editingId, {
                    name: formName.trim(),
                    description: formDescription.trim() || undefined,
                    pattern: formPattern,
                    cycle_days: formPattern.length,
                });
                onNotify('success', `Pola "${formName}" berhasil diperbarui.`);
            } else {
                await createRotationPattern({
                    unit_id: unitId,
                    name: formName.trim(),
                    description: formDescription.trim() || undefined,
                    pattern: formPattern,
                    cycle_days: formPattern.length,
                    is_active: true,
                    created_by: userId,
                });
                onNotify('success', `Pola "${formName}" berhasil dibuat.`);
            }
            resetForm();
            await loadPatterns();
        } catch (err: any) {
            onNotify('error', classifyError(err).userMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: RotationPattern) => {
        const ok = await confirm({
            title: 'Hapus Pola Rotasi',
            message: `Hapus pola "${p.name}"? Jadwal yang sudah di-generate tidak akan terpengaruh.`,
            confirmLabel: 'Hapus',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await deleteRotationPattern(p.id);
            onNotify('success', `Pola "${p.name}" dihapus.`);
            await loadPatterns();
        } catch (err: any) {
            onNotify('error', classifyError(err).userMessage);
        }
    };

    const getShiftColor = (shiftName?: string | null): string => {
        if (!shiftName) return 'bg-gray-200 text-gray-800';
        if (String(shiftName).toLowerCase() === 'libur') return 'bg-gray-100 text-gray-500 border border-dashed border-gray-300';
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? COLOR_CLASSES[def.color] : 'bg-gray-200 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Pattern list */}
            {patterns.length === 0 && !showForm && (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-lg mb-2">Belum ada pola rotasi</p>
                    <p className="text-sm">Buat pola rotasi untuk meng-generate jadwal otomatis bagi karyawan.</p>
                </div>
            )}

            {patterns.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 group hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-semibold text-gray-800">{p.name}</h4>
                            {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">Siklus: {p.cycle_days} hari</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(p)} className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary/10">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {/* Pattern visualization */}
                    <div className="flex flex-wrap gap-1 mt-2">
                        {p.pattern.map((shiftName, i) => (
                            <div
                                key={i}
                                className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${getShiftColor(shiftName)}`}
                                title={`Hari ${i + 1}: ${shiftName}`}
                            >
                                {shiftName === 'Libur' ? 'L' : shiftName.slice(0, 2).toUpperCase()}
                            </div>
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500">
                        {[...new Set(p.pattern)].map(name => (
                            <span key={name} className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full inline-block ${getShiftColor(name).split(' ')[0]}`} />
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            ))}

            {/* Form */}
            {showForm ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
                    <h4 className="font-semibold text-gray-700">
                        {editingId ? `Edit Pola: ${formName}` : 'Buat Pola Rotasi Baru'}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nama Pola</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="cth: Rotasi IGD 8 Hari"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Deskripsi (opsional)</label>
                            <input
                                type="text"
                                value={formDescription}
                                onChange={e => setFormDescription(e.target.value)}
                                placeholder="Pola P-P-S-S-M-M-L-L"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Pattern builder */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-2">
                            Urutan Shift dalam Siklus ({formPattern.length} hari)
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {formPattern.map((shiftName, i) => (
                                <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                                    <span className="text-[10px] text-gray-400 w-4 text-center">{i + 1}</span>
                                    <select
                                        value={shiftName}
                                        onChange={e => updateDayInPattern(i, e.target.value)}
                                        className={`px-2 py-1 text-xs rounded border-0 font-semibold ${getShiftColor(shiftName)}`}
                                    >
                                        {shiftOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => removeDayFromPattern(i)}
                                        className="p-0.5 text-gray-300 hover:text-red-500"
                                    >
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addDayToPattern}
                                className="flex items-center gap-1 px-2 py-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5"
                            >
                                <PlusIcon className="w-3 h-3" /> Hari
                            </button>
                        </div>
                    </div>

                    {/* Quick-fill buttons */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 self-center">Quick-fill:</span>
                        <button
                            onClick={() => setFormPattern(['Pagi','Pagi','Siang','Siang','Malam','Malam','Libur','Libur'])}
                            className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                        >
                            P-P-S-S-M-M-L-L
                        </button>
                        <button
                            onClick={() => setFormPattern(['Pagi','Siang','Malam','Libur'])}
                            className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                        >
                            P-S-M-L
                        </button>
                        <button
                            onClick={() => setFormPattern(['Pagi','Pagi','Pagi','Siang','Siang','Siang','Libur'])}
                            className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                        >
                            PPP-SSS-L (7 hari)
                        </button>
                        <button
                            onClick={() => setFormPattern(Array(5).fill(unitShifts[0]?.name || 'Pagi').concat(['Libur','Libur']))}
                            className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
                        >
                            5 kerja + 2 libur
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                        <button
                            onClick={handleSave}
                            disabled={!formName.trim() || formPattern.length === 0 || saving}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
                        >
                            {saving && <LoadingSpinner size="small" color="white" />}
                            {editingId ? 'Simpan Perubahan' : 'Buat Pola'}
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
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 font-medium w-full justify-center transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Buat Pola Rotasi Baru
                </button>
            )}
        </div>
    );
};

export default RotationPatternPanel;

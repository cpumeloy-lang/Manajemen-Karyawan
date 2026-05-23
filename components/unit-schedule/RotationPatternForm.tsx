import React from 'react';
import { ShiftDefinition, ShiftColor } from '../../types.ts';
import { PlusIcon, TrashIcon } from '../icons.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';

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

interface RotationPatternFormProps {
    unitShifts: ShiftDefinition[];
    formName: string;
    setFormName: (val: string) => void;
    formDescription: string;
    setFormDescription: (val: string) => void;
    formPattern: string[];
    setFormPattern: (val: string[]) => void;
    editingId: string | null;
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
}

const RotationPatternForm: React.FC<RotationPatternFormProps> = ({
    unitShifts, formName, setFormName, formDescription, setFormDescription,
    formPattern, setFormPattern, editingId, saving, onSave, onCancel
}) => {
    const shiftOptions = [...unitShifts.map(s => s.name), 'Libur'];

    const getShiftColor = (shiftName?: string | null): string => {
        if (!shiftName) return 'bg-gray-200 text-gray-800';
        if (String(shiftName).toLowerCase() === 'libur') return 'bg-gray-100 text-gray-500 border border-dashed border-gray-300';
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? COLOR_CLASSES[def.color] : 'bg-gray-200 text-gray-800';
    };

    const addDayToPattern = () => setFormPattern([...formPattern, shiftOptions[0]]);
    const removeDayFromPattern = (index: number) => setFormPattern(formPattern.filter((_, i) => i !== index));
    const updateDayInPattern = (index: number, value: string) => setFormPattern(formPattern.map((v, i) => i === index ? value : v));

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-gray-700">
                {editingId ? `Edit Pola: ${formName}` : 'Buat Pola Rotasi Baru'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Nama Pola</label>
                    <input
                        type="text" value={formName} onChange={e => setFormName(e.target.value)}
                        placeholder="cth: Rotasi IGD 8 Hari"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Deskripsi (opsional)</label>
                    <input
                        type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)}
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
                                value={shiftName} onChange={e => updateDayInPattern(i, e.target.value)}
                                className={`px-2 py-1 text-xs rounded border-0 font-semibold ${getShiftColor(shiftName)}`}
                            >
                                {shiftOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <button onClick={() => removeDayFromPattern(i)} className="p-0.5 text-gray-300 hover:text-red-500">
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button onClick={addDayToPattern} className="flex items-center gap-1 px-2 py-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5">
                        <PlusIcon className="w-3 h-3" /> Hari
                    </button>
                </div>
            </div>

            {/* Quick-fill buttons */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 self-center">Quick-fill:</span>
                <button onClick={() => setFormPattern(['Pagi','Pagi','Siang','Siang','Malam','Malam','Libur','Libur'])} className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700">
                    P-P-S-S-M-M-L-L
                </button>
                <button onClick={() => setFormPattern(['Pagi','Siang','Malam','Libur'])} className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700">
                    P-S-M-L
                </button>
                <button onClick={() => setFormPattern(['Pagi','Pagi','Pagi','Siang','Siang','Siang','Libur'])} className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700">
                    PPP-SSS-L (7 hari)
                </button>
                <button onClick={() => setFormPattern(Array(5).fill(unitShifts[0]?.name || 'Pagi').concat(['Libur','Libur']))} className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 text-gray-700">
                    5 kerja + 2 libur
                </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
                <button onClick={onSave} disabled={!formName.trim() || formPattern.length === 0 || saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium transition-colors flex items-center gap-2">
                    {saving && <LoadingSpinner size="small" color="white" />}
                    {editingId ? 'Simpan Perubahan' : 'Buat Pola'}
                </button>
                <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                    Batal
                </button>
            </div>
        </div>
    );
};

export default RotationPatternForm;

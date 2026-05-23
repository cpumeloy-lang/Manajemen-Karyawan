import React, { useState } from 'react';
import { ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../../types.ts';
import { CheckIcon } from '../icons.tsx';
import ShiftConfigPanel from '../ShiftConfigPanel.tsx';

interface ShiftConfigSectionProps {
    initialShifts: ShiftDefinition[];
    onSave: (shifts: ShiftDefinition[]) => Promise<void>;
}

const ShiftConfigSection: React.FC<ShiftConfigSectionProps> = ({ initialShifts, onSave }) => {
    const [shiftDefs, setShiftDefs] = useState<ShiftDefinition[]>(
        initialShifts.length > 0 ? initialShifts : DEFAULT_SHIFT_DEFINITIONS
    );
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(shiftDefs);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white shadow-md rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">⏰ Konfigurasi Shift Global</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Shift default sistem. Kepala Unit dapat override per unit di modul Jadwal Unit.
                    </p>
                </div>
                <button type="button" onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] transition-colors disabled:bg-gray-400 text-sm font-medium">
                    {saving ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : <CheckIcon />}
                    <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi Shift'}</span>
                </button>
            </div>

            <div className="mt-1 mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                <strong>Hierarki prioritas shift:</strong>{' '}
                <span className="font-semibold">Jadwal per tanggal (KR)</span> →{' '}
                <span className="font-semibold">Penugasan unit (KR)</span> →{' '}
                <span className="font-semibold">Shift global ini</span> →{' '}
                <span>Tipe kontrak karyawan</span>
            </div>

            <ShiftConfigPanel shifts={shiftDefs} onChange={setShiftDefs} />
        </div>
    );
};

export default ShiftConfigSection;

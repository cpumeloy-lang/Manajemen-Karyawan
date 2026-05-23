/**
 * ShiftConfigPanel.tsx - REFACTORED
 * 
 * Manages the list of global shift definitions.
 * 
 * Previous: ~343 lines, monolithic map inside return
 * Current:  ~60 lines, logic delegated to ShiftConfigItem
 */
import React, { useState } from 'react';
import { ShiftDefinition, WeekDay } from '../types.ts';
import ShiftConfigItem from './system-settings/ShiftConfigItem';

interface ShiftConfigPanelProps {
    shifts: ShiftDefinition[];
    onChange: (shifts: ShiftDefinition[]) => void;
}

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
            dayEntry = value ? { startTime: '08:00', endTime: '16:00' } : null;
        } else if (dayEntry && (field === 'startTime' || field === 'endTime')) {
            dayEntry = { ...dayEntry, [field]: value as string };
        }
        update(shiftId, { weeklySchedule: { ...current, [day]: dayEntry } });
    };

    const addShift = () => {
        const id = `shift_${Date.now()}`;
        const newShift: ShiftDefinition = {
            id, name: 'Shift Baru', type: 'rotating', startTime: '08:00', endTime: '16:00',
            color: 'gray', lateToleranceMinutes: 15,
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
                <ShiftConfigItem 
                    key={shift.id}
                    shift={shift}
                    isExpanded={expandedId === shift.id}
                    onToggleExpand={() => setExpandedId(expandedId === shift.id ? null : shift.id)}
                    onUpdate={update}
                    onUpdateDaySchedule={updateDaySchedule}
                    onRemove={removeShift}
                />
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

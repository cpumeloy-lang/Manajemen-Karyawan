import React from 'react';
import { ShiftDefinition } from '../../types.ts';

const SHIFT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    yellow:  { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
    red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200' },
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
    gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200' },
};

interface ShiftDistributionCardProps {
    shiftStats: Record<string, number>;
    unitShifts: ShiftDefinition[];
}

const ShiftDistributionCard: React.FC<ShiftDistributionCardProps> = ({ shiftStats, unitShifts }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-[#06736a] mb-4">📊 Distribusi Shift Unit</h2>
            <div className={`grid grid-cols-1 gap-4 ${Object.keys(shiftStats).length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
                {Object.entries(shiftStats).map(([name, count]) => {
                    const def = unitShifts.find(s => s.name === name);
                    const c = SHIFT_COLOR_MAP[def?.color || 'gray'] || SHIFT_COLOR_MAP['gray'];
                    const timeLabel = def?.type === 'rotating'
                        ? `${def.startTime || '?'} - ${def.endTime || '?'}`
                        : def?.type === 'fixed' ? 'Jadwal per hari' : '';
                    return (
                        <div key={name} className={`text-center p-4 rounded-lg border ${c.bg} ${c.border}`}>
                            <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
                            <div className={`text-sm font-medium ${c.text}`}>{name}</div>
                            {timeLabel && <div className="text-xs text-gray-500 mt-1">{timeLabel}</div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ShiftDistributionCard;

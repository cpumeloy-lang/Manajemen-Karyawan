import React from 'react';
import { RotationPattern, ShiftDefinition, ShiftColor } from '../../types.ts';
import { PencilIcon, TrashIcon } from '../icons.tsx';

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

interface RotationPatternListProps {
    patterns: RotationPattern[];
    unitShifts: ShiftDefinition[];
    onEdit: (pattern: RotationPattern) => void;
    onDelete: (pattern: RotationPattern) => void;
}

const RotationPatternList: React.FC<RotationPatternListProps> = ({ patterns, unitShifts, onEdit, onDelete }) => {
    const getShiftColor = (shiftName?: string | null): string => {
        if (!shiftName) return 'bg-gray-200 text-gray-800';
        if (String(shiftName).toLowerCase() === 'libur') return 'bg-gray-100 text-gray-500 border border-dashed border-gray-300';
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? COLOR_CLASSES[def.color] : 'bg-gray-200 text-gray-800';
    };

    if (patterns.length === 0) return null;

    return (
        <div className="space-y-4">
            {patterns.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 group hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-semibold text-gray-800">{p.name}</h4>
                            {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">Siklus: {p.cycle_days} hari</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(p)} className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-primary/10">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(p)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
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
        </div>
    );
};

export default RotationPatternList;

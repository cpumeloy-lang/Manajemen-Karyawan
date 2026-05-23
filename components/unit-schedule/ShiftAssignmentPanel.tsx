import React, { useState } from 'react';
import { Employee, Shift, ShiftDefinition } from '../../types.ts';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { COLOR_CLASSES } from './constants.ts';

interface ShiftAssignmentPanelProps {
    unitEmployees: Employee[];
    editedShifts: Record<string, Shift>;
    onShiftChange: (employeeId: string, newShift: Shift) => void;
    changedEmployeeIds: string[];
    unitShifts: ShiftDefinition[];
    workUnitName: string;
    saving: boolean;
    onSave: () => void;
    onReset: () => void;
    onExport: () => void;
}

const ShiftAssignmentPanel: React.FC<ShiftAssignmentPanelProps> = ({
    unitEmployees, editedShifts, onShiftChange, changedEmployeeIds,
    unitShifts, workUnitName, saving, onSave, onReset, onExport,
}) => {
    const [bulkShift, setBulkShift] = useState<Record<string, string>>({});
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const getShiftStyle = (shiftName: Shift) => {
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? COLOR_CLASSES[def.color].badge : COLOR_CLASSES['gray'].badge;
    };

    if (unitEmployees.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-center text-gray-500">
                Tidak ada karyawan aktif di unit ini
            </div>
        );
    }

    const groups: Record<string, Employee[]> = {};
    unitEmployees.forEach(emp => {
        const key = emp.jabatan || 'Lainnya';
        if (!groups[key]) groups[key] = [];
        groups[key].push(emp);
    });
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    return (
        <>
            <div className="space-y-4">
                {sortedGroups.map(([jabatan, emps]) => {
                    const relevantShifts = unitShifts.filter(
                        s => !s.positionGroup || String(s.positionGroup || '').toLowerCase() === String(jabatan || '').toLowerCase()
                    );
                    const shiftsToUse = relevantShifts.length > 0 ? relevantShifts : unitShifts;
                    const groupChanges = emps.filter(e => changedEmployeeIds.includes(e.id)).length;
                    const isCollapsed = collapsedGroups[jabatan] ?? false;
                    const activeEmps = emps.filter(e => e.status === 'Aktif');

                    // Shift distribution
                    const distrib: Record<string, number> = {};
                    emps.forEach(e => {
                        const s = editedShifts[e.id] || e.shift || '?';
                        distrib[s] = (distrib[s] || 0) + 1;
                    });

                    return (
                        <div key={jabatan} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            {/* Group Header */}
                            <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <button
                                        onClick={() => setCollapsedGroups(prev => ({ ...prev, [jabatan]: !isCollapsed }))}
                                        className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-primary transition-colors"
                                    >
                                        <span>{isCollapsed ? '▶' : '▼'}</span>
                                        <span>👤 {jabatan}</span>
                                    </button>
                                    <span className="text-xs text-gray-500">{emps.length} karyawan</span>
                                    {groupChanges > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                            {groupChanges} diubah
                                        </span>
                                    )}

                                    {/* Shift distribution chips */}
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {Object.entries(distrib).map(([sName, count]) => {
                                            const sDef = unitShifts.find(s => s.name === sName);
                                            const cls = sDef ? COLOR_CLASSES[sDef.color].badge : COLOR_CLASSES['gray'].badge;
                                            return (
                                                <span key={sName} className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${cls}`}>
                                                    {sName}: {count}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    {/* Bulk Assign */}
                                    {activeEmps.length > 0 && (
                                        <div className="ml-auto flex items-center gap-2">
                                            <span className="text-xs text-gray-500 hidden sm:inline">Tugaskan semua:</span>
                                            <select
                                                value={bulkShift[jabatan] || ''}
                                                onChange={e => setBulkShift(prev => ({ ...prev, [jabatan]: e.target.value }))}
                                                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">— pilih shift —</option>
                                                {shiftsToUse.map(s => (
                                                    <option key={s.id} value={s.name}>
                                                        {s.name}{s.startTime ? ` (${s.startTime}–${s.endTime})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                disabled={!bulkShift[jabatan]}
                                                onClick={() => {
                                                    const target = bulkShift[jabatan];
                                                    if (!target) return;
                                                    activeEmps.forEach(e => onShiftChange(e.id, target));
                                                    setBulkShift(prev => ({ ...prev, [jabatan]: '' }));
                                                }}
                                                className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors whitespace-nowrap"
                                            >
                                                Terapkan ({activeEmps.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Employee Rows */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-100">
                                    {emps.map(emp => (
                                        <div key={emp.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors flex-wrap">
                                            <div className="flex items-center gap-3 min-w-[180px]">
                                                <img
                                                    src={emp.foto || 'https://via.placeholder.com/36'}
                                                    alt={emp.nama}
                                                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 leading-tight">{emp.nama}</p>
                                                    <p className="text-xs text-gray-400">{emp.email}</p>
                                                </div>
                                            </div>

                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                                emp.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                                                emp.status === 'Cuti' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {emp.status}
                                            </span>

                                            <span className={`px-3 py-1 text-xs font-medium rounded-lg border flex-shrink-0 ${getShiftStyle(editedShifts[emp.id] || emp.shift)}`}>
                                                {editedShifts[emp.id] || emp.shift}
                                            </span>

                                            <div className="flex items-center gap-2 ml-auto">
                                                <select
                                                    value={editedShifts[emp.id] || emp.shift}
                                                    onChange={e => onShiftChange(emp.id, e.target.value as Shift)}
                                                    disabled={emp.status !== 'Aktif'}
                                                    title={`Pilih shift untuk ${emp.nama}`}
                                                    className={`px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent ${
                                                        changedEmployeeIds.includes(emp.id)
                                                            ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                                                            : 'border-gray-300'
                                                    }`}
                                                >
                                                    {shiftsToUse.map(shift => (
                                                        <option key={shift.id} value={shift.name}>
                                                            {shift.name}{shift.startTime ? ` (${shift.startTime}–${shift.endTime})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {changedEmployeeIds.includes(emp.id) && (
                                                    <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">● diubah</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 flex-wrap">
                <button
                    onClick={onExport}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    disabled={unitEmployees.length === 0}
                    title="Export penugasan shift ke Excel"
                >
                    📊 Export Excel
                </button>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    disabled={saving}
                >
                    Reset
                </button>
                <button
                    onClick={onSave}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={saving || unitEmployees.length === 0 || changedEmployeeIds.length === 0}
                >
                    {saving ? (
                        <>
                            <LoadingSpinner size="small" color="white" />
                            Menyimpan...
                        </>
                    ) : (
                        `💾 Simpan Jadwal${changedEmployeeIds.length > 0 ? ` (${changedEmployeeIds.length})` : ''}`
                    )}
                </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Informasi</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Anda dapat mengatur jadwal shift untuk semua karyawan di unit {workUnitName}</li>
                    <li>• Karyawan dengan status "Cuti" atau "Non-Aktif" tidak bisa diubah shiftnya</li>
                    <li>• Perubahan akan langsung berlaku setelah disimpan</li>
                    <li>• Klik "Reset" untuk membatalkan perubahan yang belum disimpan</li>
                </ul>
            </div>
        </>
    );
};

export default ShiftAssignmentPanel;

/**
 * UnitScheduleManagement.tsx - REFACTORED
 * 
 * Manages unit schedules.
 * 
 * Previous: ~381 lines, monolithic
 * Current:  ~130 lines, layout and state orchestration via hook
 */
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Employee } from '../types.ts';
import { CalendarDaysIcon, UserGroupIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import RotationPatternPanel from './RotationPatternPanel.tsx';
import ScheduleCalendarPanel from './ScheduleCalendarPanel.tsx';
import ShiftDefinitionPanel from './unit-schedule/ShiftDefinitionPanel.tsx';
import ShiftAssignmentPanel from './unit-schedule/ShiftAssignmentPanel.tsx';
import { useUnitScheduleManagement } from '../hooks/useUnitScheduleManagement';

interface UnitScheduleManagementProps {
    kepalaRuangan: Employee;
}

const UnitScheduleManagement: React.FC<UnitScheduleManagementProps> = ({ kepalaRuangan }) => {
    const managedUnitId = kepalaRuangan.unitKerjaId || kepalaRuangan.managedUnitId;
    const {
        unitEmployees, workUnit, loading, saving, savingConfig,
        editedShifts, originalUnitShifts, unitShifts, setUnitShifts,
        notification, showNotification, loadUnitData, handleShiftChange,
        changedEmployeeIds, saveShiftChanges, saveShiftConfig, unitShiftsDirty
    } = useUnitScheduleManagement(managedUnitId);

    const [activeTab, setActiveTab] = useState<'config' | 'patterns' | 'calendar'>('calendar');

    const handleExportAssignments = () => {
        if (unitEmployees.length === 0) {
            showNotification('error', 'Tidak ada karyawan untuk di-export.');
            return;
        }
        const rows = unitEmployees.map(emp => {
            const shiftName = editedShifts[emp.id] || emp.shift || '';
            const shiftDef = unitShifts.find(s => s.name === shiftName);
            return {
                NIK: (emp as any).nik || (emp as any).ktpNumber || '',
                Nama: emp.nama, Jabatan: emp.jabatan || '-', Status: emp.status || '-',
                Shift: shiftName || '-', Tipe: shiftDef?.type === 'fixed' ? 'Tetap' : (shiftDef?.type === 'rotating' ? 'Bergilir' : '-'),
                Jam_Masuk: shiftDef?.startTime || '-', Jam_Keluar: shiftDef?.endTime || '-',
                Khusus_Jabatan: shiftDef?.positionGroup || '-', Toleransi_Menit: shiftDef?.lateToleranceMinutes ?? '-',
                Email: emp.email || '-',
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 14 },{ wch: 25 },{ wch: 22 },{ wch: 12 },{ wch: 16 },{ wch: 10 },{ wch: 12 },{ wch: 12 },{ wch: 22 },{ wch: 14 },{ wch: 25 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Penugasan Shift');
        const today = new Date().toISOString().split('T')[0];
        const safeName = (workUnit?.nama || 'unit').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `penugasan_shift_${safeName}_${today}.xlsx`);
        showNotification('success', `✅ Export ${rows.length} penugasan shift berhasil.`);
    };

    if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="large" /></div>;

    if (!managedUnitId) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-800 font-medium">⚠️ Anda belum ditugaskan sebagai kepala ruangan untuk unit tertentu.</p>
                <p className="text-yellow-600 text-sm mt-2">Silakan hubungi HRD untuk pengaturan lebih lanjut.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <CalendarDaysIcon className="w-7 h-7 text-primary" />
                            Manajemen Jadwal Shift
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Unit: <span className="font-semibold text-primary">{workUnit?.nama}</span>
                            {changedEmployeeIds.length > 0 && (
                                <span className="ml-3 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                    {changedEmployeeIds.length} perubahan belum disimpan
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-600">{unitEmployees.length} Karyawan</span>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="flex gap-0 -mb-px">
                    {[
                        { key: 'calendar' as const, label: 'Jadwal Bulanan', icon: '📅' },
                        { key: 'patterns' as const, label: 'Pola Rotasi', icon: '🔄' },
                        { key: 'config' as const, label: 'Konfigurasi Shift', icon: '⚙️' },
                    ].map(tab => (
                        <button
                            key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {notification && (
                <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    notification.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {notification.text}
                </div>
            )}

            {activeTab === 'calendar' && managedUnitId && (
                <ScheduleCalendarPanel
                    unitId={managedUnitId} unitShifts={unitShifts}
                    employees={unitEmployees.filter(e => e.status === 'Aktif')}
                    userId={kepalaRuangan.user_id} onNotify={showNotification}
                />
            )}

            {activeTab === 'patterns' && managedUnitId && (
                <RotationPatternPanel
                    unitId={managedUnitId} unitShifts={unitShifts} userId={kepalaRuangan.user_id} onNotify={showNotification}
                />
            )}

            {activeTab === 'config' && (<>
                <ShiftDefinitionPanel
                    unitShifts={unitShifts} onShiftsChange={setUnitShifts} unitShiftsDirty={unitShiftsDirty}
                    savingConfig={savingConfig} workUnitName={workUnit?.nama || ''} unitEmployees={unitEmployees}
                    onSave={saveShiftConfig} onReset={() => setUnitShifts([...originalUnitShifts])} showNotification={showNotification}
                />

                <ShiftAssignmentPanel
                    unitEmployees={unitEmployees} editedShifts={editedShifts} onShiftChange={handleShiftChange}
                    changedEmployeeIds={changedEmployeeIds} unitShifts={unitShifts} workUnitName={workUnit?.nama || ''}
                    saving={saving} onSave={saveShiftChanges} onReset={loadUnitData} onExport={handleExportAssignments}
                />
            </>)}
        </div>
    );
};

export default UnitScheduleManagement;

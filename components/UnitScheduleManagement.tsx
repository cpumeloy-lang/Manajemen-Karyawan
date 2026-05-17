import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Employee, WorkUnit, Shift, ShiftDefinition, ShiftColor, DaySchedule, WeekDay, WEEK_DAYS, WEEK_DAY_LABELS, DEFAULT_SHIFT_DEFINITIONS, getScheduleForDay } from '../types.ts';
import { useAppData } from '../stores/appStore.ts';
import { supabase } from '../services/supabaseClient.ts';
import { CalendarDaysIcon, UserGroupIcon, ClockIcon, PlusIcon, TrashIcon, PencilIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import RotationPatternPanel from './RotationPatternPanel.tsx';
import ScheduleCalendarPanel from './ScheduleCalendarPanel.tsx';
import { createAuditLog } from '../services/auditLogService.ts';
import { classifyError } from '../services/errorHandlingService.ts';

const SHIFT_COLORS: ShiftColor[] = ['yellow','blue','indigo','green','red','purple','orange','pink','teal','gray'];
const COLOR_CLASSES: Record<ShiftColor, { badge: string; dot: string }> = {
    yellow:  { badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',  dot: 'bg-yellow-400' },
    blue:    { badge: 'bg-blue-100 text-blue-800 border-blue-300',        dot: 'bg-blue-400' },
    indigo:  { badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',  dot: 'bg-indigo-400' },
    green:   { badge: 'bg-green-100 text-green-800 border-green-300',     dot: 'bg-green-400' },
    red:     { badge: 'bg-red-100 text-red-800 border-red-300',           dot: 'bg-red-400' },
    purple:  { badge: 'bg-purple-100 text-purple-800 border-purple-300',  dot: 'bg-purple-400' },
    orange:  { badge: 'bg-orange-100 text-orange-800 border-orange-300',  dot: 'bg-orange-400' },
    pink:    { badge: 'bg-pink-100 text-pink-800 border-pink-300',        dot: 'bg-pink-400' },
    teal:    { badge: 'bg-teal-100 text-teal-800 border-teal-300',        dot: 'bg-teal-400' },
    gray:    { badge: 'bg-gray-100 text-gray-800 border-gray-300',        dot: 'bg-gray-400' },
};

interface UnitScheduleManagementProps {
    kepalaRuangan: Employee; // Current user (kepala ruangan)
}

const UnitScheduleManagement: React.FC<UnitScheduleManagementProps> = ({ kepalaRuangan }) => {
    const { systemSettings } = useAppData();
    const systemShiftFallback = (systemSettings?.default_shifts?.length)
        ? systemSettings.default_shifts
        : DEFAULT_SHIFT_DEFINITIONS;
    const managedUnitId = kepalaRuangan.unitKerjaId || kepalaRuangan.managedUnitId;
    const [unitEmployees, setUnitEmployees] = useState<Employee[]>([]);
    const [workUnit, setWorkUnit] = useState<WorkUnit | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'config' | 'patterns' | 'calendar'>('calendar');
    const [saving, setSaving] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [editedShifts, setEditedShifts] = useState<Record<string, Shift>>({});
    const [originalShifts, setOriginalShifts] = useState<Record<string, Shift>>({});
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [bulkShift, setBulkShift] = useState<Record<string, string>>({}); // jabatan -> shift untuk bulk assign
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    // Shift definition config state
    const [unitShifts, setUnitShifts] = useState<ShiftDefinition[]>(systemShiftFallback);
    const [originalUnitShifts, setOriginalUnitShifts] = useState<ShiftDefinition[]>(systemShiftFallback);
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

    useEffect(() => {
        loadUnitData();
    }, [managedUnitId]);

    const loadUnitData = async () => {
        if (!managedUnitId) {
            console.error('❌ Kepala ruangan tidak memiliki unit yang dikelola');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Load unit info from single source table
            const { data: unitData, error: unitError } = await supabase
                .from('units')
                .select('*')
                .eq('id', managedUnitId)
                .single();

            if (unitError) throw unitError;
            if (!unitData) throw new Error('Data unit tidak ditemukan');
            setWorkUnit(unitData as unknown as WorkUnit);

            // Load unit-specific shift definitions (falls back to defaults if not configured)
            const unitDataAny = unitData as any;
            const loadedShifts: ShiftDefinition[] = (unitDataAny.shifts && unitDataAny.shifts.length > 0)
                ? unitDataAny.shifts as ShiftDefinition[]
                : systemShiftFallback; // systemSettings.default_shifts → DEFAULT_SHIFT_DEFINITIONS
            setUnitShifts(loadedShifts);
            setOriginalUnitShifts(loadedShifts);

            // Load employees in this unit
            const { data: employeesData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('unitKerjaId', managedUnitId)
                .order('nama', { ascending: true });

            if (empError) throw empError;
            
            // Map database fields to camelCase
            const mappedEmployees = (employeesData || []).map(emp => ({
                ...emp,
                ktpNumber: emp.ktp_number,
                bpjsKesehatan: emp.bpjs_kesehatan,
                bpjsKetenagakerjaan: emp.bpjs_ketenagakerjaan,
                maritalStatus: emp.marital_status,
                emergencyContacts: emp.emergency_contacts,
                workHistory: emp.work_history,
                bankAccount: emp.bank_account,
                isProfileCompleted: emp.is_profile_completed,
                isVerified: emp.is_verified,
                verifiedBy: emp.verified_by,
                verifiedAt: emp.verified_at,
                isLocked: emp.is_locked,
                managedUnitId: emp.managed_unit_id,
            }));

            setUnitEmployees(mappedEmployees as unknown as Employee[]);

            // Load shift assignments from unit (not from employee profile)
            // Industry standard: unit owns rotation assignment, employee.shift = contract default only
            const savedAssignments: Record<string, Shift> = (unitDataAny.shift_assignments as Record<string, Shift>) || {};
            const initialShifts: Record<string, Shift> = {};
            mappedEmployees.forEach(emp => {
                // Priority: unit assignment → employee contract default
                initialShifts[emp.id] = savedAssignments[emp.id] ?? emp.shift ?? 'Pagi';
            });
            setEditedShifts(initialShifts);
            setOriginalShifts(initialShifts);

        } catch (error: any) {
            console.error('❌ Error loading unit data:', error);
            showNotification('error', classifyError(error).userMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleShiftChange = (employeeId: string, newShift: Shift) => {
        setEditedShifts(prev => ({
            ...prev,
            [employeeId]: newShift
        }));
    };

    const changedEmployeeIds = Object.entries(editedShifts)
        .filter(([empId, newShift]) => originalShifts[empId] !== newShift)
        .map(([empId]) => empId);

    const showNotification = (type: 'success' | 'error', text: string) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 4000);
    };

    const saveShiftChanges = async () => {
        if (changedEmployeeIds.length === 0) {
            showNotification('error', 'Tidak ada perubahan penugasan shift untuk disimpan.');
            return;
        }

        try {
            setSaving(true);

            // Build merged assignments object: existing + new changes
            // Saves to units.shift_assignments — NOT to employees.shift
            // This prevents overwriting employee contract shift set by HRD
            const mergedAssignments: Record<string, Shift> = { ...editedShifts };

            const { error } = await (supabase.from('units') as any)
                .update({ shift_assignments: mergedAssignments })
                .eq('id', managedUnitId);

            if (error) throw error;

            // Audit log perubahan penugasan shift
            const changedDetails = changedEmployeeIds.map(id => {
                const emp = unitEmployees.find(e => e.id === id);
                return {
                    employee_id: id,
                    employee_name: emp?.nama || id,
                    from_shift: originalShifts[id],
                    to_shift: editedShifts[id],
                };
            });
            void createAuditLog({
                action: 'UPDATE',
                entityType: 'unit',
                entityId: managedUnitId!,
                entityName: workUnit?.nama,
                description: `Mengubah penugasan shift ${changedEmployeeIds.length} karyawan di unit ${workUnit?.nama}`,
                oldData: { shift_assignments: originalShifts },
                newData: { shift_assignments: editedShifts, changes: changedDetails },
            });

            setOriginalShifts({ ...editedShifts });
            showNotification('success', `✅ Penugasan shift ${changedEmployeeIds.length} karyawan berhasil disimpan untuk ${workUnit?.nama}.`);
            await loadUnitData();

        } catch (error: any) {
            console.error('❌ Error saving shift assignments:', error);
            showNotification('error', classifyError(error).userMessage);
        } finally {
            setSaving(false);
        }
    };

    const getShiftStyle = (shiftName: Shift) => {
        const def = unitShifts.find(s => s.name === shiftName);
        return def ? COLOR_CLASSES[def.color].badge : COLOR_CLASSES['gray'].badge;
    };

    const addShift = () => {
        if (!newShiftForm.name.trim()) return;
        if (unitShifts.some(s => String(s?.name || '').toLowerCase() === String(newShiftForm.name || '').trim().toLowerCase())) {
            showNotification('error', `Shift "${newShiftForm.name}" sudah ada.`);
            return;
        }
        const id = `custom_${Date.now()}`;
        setUnitShifts(prev => [...prev, { id, ...newShiftForm, name: newShiftForm.name.trim() }]);
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
        setUnitShifts(prev => prev.map(s =>
            s.id === editingShiftId ? { ...s, ...newShiftForm, name: newShiftForm.name.trim() } : s
        ));
        resetForm();
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

    const removeShift = (shiftId: string) => {
        if (unitShifts.length <= 1) {
            showNotification('error', 'Unit harus memiliki minimal 1 shift.');
            return;
        }
        setUnitShifts(prev => prev.filter(s => s.id !== shiftId));
    };

    const saveShiftConfig = async () => {
        try {
            setSavingConfig(true);
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            const response = await fetch(`/api/organization/units`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ unit: { id: managedUnitId!, nama: workUnit?.nama || '', shifts: unitShifts } }),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(result?.error || 'Gagal menyimpan konfigurasi shift unit');
            }

            // Audit log perubahan konfigurasi shift
            void createAuditLog({
                action: 'UPDATE',
                entityType: 'unit',
                entityId: managedUnitId!,
                entityName: workUnit?.nama,
                description: `Mengubah konfigurasi shift unit ${workUnit?.nama} (${unitShifts.length} shift)`,
                oldData: { shifts: originalUnitShifts },
                newData: { shifts: unitShifts },
            });

            setOriginalUnitShifts([...unitShifts]);
            showNotification('success', `✅ Konfigurasi ${unitShifts.length} shift berhasil disimpan untuk ${workUnit?.nama}.`);
        } catch (error: any) {
            showNotification('error', classifyError(error).userMessage);
        } finally {
            setSavingConfig(false);
        }
    };

    const unitShiftsDirty = JSON.stringify(unitShifts) !== JSON.stringify(originalUnitShifts);

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
                Nama: emp.nama,
                Jabatan: emp.jabatan || '-',
                Status: emp.status || '-',
                Shift: shiftName || '-',
                Tipe: shiftDef?.type === 'fixed' ? 'Tetap' : (shiftDef?.type === 'rotating' ? 'Bergilir' : '-'),
                Jam_Masuk: shiftDef?.startTime || '-',
                Jam_Keluar: shiftDef?.endTime || '-',
                Khusus_Jabatan: shiftDef?.positionGroup || '-',
                Toleransi_Menit: shiftDef?.lateToleranceMinutes ?? '-',
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="large" />
            </div>
        );
    }

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
            {/* Header */}
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0 -mb-px">
                    {[
                        { key: 'calendar' as const, label: 'Jadwal Bulanan', icon: '📅' },
                        { key: 'patterns' as const, label: 'Pola Rotasi', icon: '🔄' },
                        { key: 'config' as const, label: 'Konfigurasi Shift', icon: '⚙️' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Inline Notification */}
            {notification && (
                <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                    notification.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    {notification.text}
                </div>
            )}

            {/* Tab: Jadwal Bulanan */}
            {activeTab === 'calendar' && managedUnitId && (
                <ScheduleCalendarPanel
                    unitId={managedUnitId}
                    unitShifts={unitShifts}
                    employees={unitEmployees.filter(e => e.status === 'Aktif')}
                    userId={kepalaRuangan.user_id}
                    onNotify={showNotification}
                />
            )}

            {/* Tab: Pola Rotasi */}
            {activeTab === 'patterns' && managedUnitId && (
                <RotationPatternPanel
                    unitId={managedUnitId}
                    unitShifts={unitShifts}
                    userId={kepalaRuangan.user_id}
                    onNotify={showNotification}
                />
            )}

            {/* Tab: Konfigurasi Shift */}
            {activeTab === 'config' && (<>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-primary" />
                            Konfigurasi Shift Unit
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Definisikan jenis shift yang berlaku di unit {workUnit?.nama}
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
                                onClick={() => setUnitShifts([...originalUnitShifts])}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Reset
                            </button>
                        )}
                        <button
                            onClick={saveShiftConfig}
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

            {/* Shift Assignment — Grouped by Jabatan */}
            {unitEmployees.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 px-6 py-10 text-center text-gray-500">
                    Tidak ada karyawan aktif di unit ini
                </div>
            ) : (() => {
                const groups: Record<string, Employee[]> = {};
                unitEmployees.forEach(emp => {
                    const key = emp.jabatan || 'Lainnya';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(emp);
                });
                const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

                return (
                    <div className="space-y-4">
                        {sortedGroups.map(([jabatan, emps]) => {
                            const relevantShifts = unitShifts.filter(
                                s => !s.positionGroup || String(s.positionGroup || '').toLowerCase() === String(jabatan || '').toLowerCase()
                            );
                            const shiftsToUse = relevantShifts.length > 0 ? relevantShifts : unitShifts;
                            const groupChanges = emps.filter(e => changedEmployeeIds.includes(e.id)).length;
                            const isCollapsed = collapsedGroups[jabatan] ?? false;
                            const activeEmps = emps.filter(e => e.status === 'Aktif');

                            // Shift distribution: count per shift in this group
                            const distrib: Record<string, number> = {};
                            emps.forEach(e => {
                                const s = editedShifts[e.id] || e.shift || '?';
                                distrib[s] = (distrib[s] || 0) + 1;
                            });

                            return (
                                <div key={jabatan} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

                                    {/* ── Group Header ── */}
                                    <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {/* Collapse toggle */}
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

                                            {/* ── Bulk Assign ── */}
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
                                                            setEditedShifts(prev => {
                                                                const next = { ...prev };
                                                                activeEmps.forEach(e => { next[e.id] = target; });
                                                                return next;
                                                            });
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

                                    {/* ── Employee Rows (collapsible) ── */}
                                    {!isCollapsed && (
                                        <div className="divide-y divide-gray-100">
                                            {emps.map(emp => (
                                                <div key={emp.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors flex-wrap">
                                                    {/* Avatar + Name */}
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

                                                    {/* Status */}
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                                        emp.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                                                        emp.status === 'Cuti' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {emp.status}
                                                    </span>

                                                    {/* Current shift badge */}
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-lg border flex-shrink-0 ${getShiftStyle(editedShifts[emp.id] || emp.shift)}`}>
                                                        {editedShifts[emp.id] || emp.shift}
                                                    </span>

                                                    {/* Per-employee selector */}
                                                    <div className="flex items-center gap-2 ml-auto">
                                                        <select
                                                            value={editedShifts[emp.id] || emp.shift}
                                                            onChange={e => handleShiftChange(emp.id, e.target.value as Shift)}
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
                );
            })()}

            {/* Save Button */}
            <div className="flex justify-end gap-3 flex-wrap">
                <button
                    onClick={handleExportAssignments}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    disabled={unitEmployees.length === 0}
                    title="Export penugasan shift ke Excel"
                >
                    📊 Export Excel
                </button>
                <button
                    onClick={loadUnitData}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    disabled={saving}
                >
                    Reset
                </button>
                <button
                    onClick={saveShiftChanges}
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
                    <li>• Anda dapat mengatur jadwal shift untuk semua karyawan di unit {workUnit?.nama}</li>
                    <li>• Karyawan dengan status "Cuti" atau "Non-Aktif" tidak bisa diubah shiftnya</li>
                    <li>• Perubahan akan langsung berlaku setelah disimpan</li>
                    <li>• Klik "Reset" untuk membatalkan perubahan yang belum disimpan</li>
                </ul>
            </div>
            </>)}
        </div>
    );
};

export default UnitScheduleManagement;

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import { createAuditLog } from '../services/auditLogService.ts';
import logger from '../services/logger.ts';
import { Employee, WorkUnit, Shift, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../types.ts';

export function useUnitScheduleManagement(managedUnitId?: string, systemShiftFallback: ShiftDefinition[] = DEFAULT_SHIFT_DEFINITIONS) {
    const [unitEmployees, setUnitEmployees] = useState<Employee[]>([]);
    const [workUnit, setWorkUnit] = useState<WorkUnit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [editedShifts, setEditedShifts] = useState<Record<string, Shift>>({});
    const [originalShifts, setOriginalShifts] = useState<Record<string, Shift>>({});
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [unitShifts, setUnitShifts] = useState<ShiftDefinition[]>(systemShiftFallback);
    const [originalUnitShifts, setOriginalUnitShifts] = useState<ShiftDefinition[]>(systemShiftFallback);

    useEffect(() => {
        let isMounted = true;
        
        loadUnitData(isMounted);

        return () => {
            isMounted = false;
        };
    }, [managedUnitId]);

    const showNotification = (type: 'success' | 'error', text: string) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 4000);
    };

    // [HK-K6] Accept an optional isMounted flag or function to prevent race conditions
    // If called from useEffect, only apply state if still mounted.
    // If called manually (e.g. after save), apply state normally.
    const loadUnitData = async (isMountedIndicator: boolean | (() => boolean) = true) => {
        const isMounted = typeof isMountedIndicator === 'function' ? isMountedIndicator() : isMountedIndicator;

        if (!managedUnitId) {
            if (isMounted) setLoading(false);
            return;
        }

        try {
            if (isMounted) setLoading(true);
            const { data: unitData, error: unitError } = await supabase.from('units').select('*').eq('id', managedUnitId).single();
            if (unitError) throw unitError;
            if (!unitData) throw new Error('Data unit tidak ditemukan');
            
            if (!isMounted) return;
            setWorkUnit(unitData as unknown as WorkUnit);

            const unitDataAny = unitData as any;
            const loadedShifts: ShiftDefinition[] = (unitDataAny.shifts && unitDataAny.shifts.length > 0) ? unitDataAny.shifts as ShiftDefinition[] : systemShiftFallback;
            setUnitShifts(loadedShifts);
            setOriginalUnitShifts(loadedShifts);

            const { data: employeesData, error: empError } = await supabase.from('employees').select('*').eq('unitKerjaId', managedUnitId).order('nama', { ascending: true });
            if (empError) throw empError;
            
            if (!isMounted) return;
            const mappedEmployees = (employeesData || []).map(emp => ({
                ...emp,
                ktpNumber: emp.ktp_number, bpjsKesehatan: emp.bpjs_kesehatan, bpjsKetenagakerjaan: emp.bpjs_ketenagakerjaan,
                maritalStatus: emp.marital_status, emergencyContacts: emp.emergency_contacts, workHistory: emp.work_history,
                bankAccount: emp.bank_account, isProfileCompleted: emp.is_profile_completed, isVerified: emp.is_verified,
                verifiedBy: emp.verified_by, verifiedAt: emp.verified_at, isLocked: emp.is_locked, managedUnitId: emp.managed_unit_id,
            }));
            setUnitEmployees(mappedEmployees as unknown as Employee[]);

            const savedAssignments: Record<string, Shift> = (unitDataAny.shift_assignments as Record<string, Shift>) || {};
            const initialShifts: Record<string, Shift> = {};
            mappedEmployees.forEach(emp => {
                initialShifts[emp.id] = savedAssignments[emp.id] ?? emp.shift ?? 'Pagi';
            });
            setEditedShifts(initialShifts);
            setOriginalShifts(initialShifts);
        } catch (error: any) {
            if (!isMounted) return;
            logger.error('Error loading unit data', error);
            showNotification('error', `Gagal memuat data unit: ${error.message}`);
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    const handleShiftChange = (employeeId: string, newShift: Shift) => {
        setEditedShifts(prev => ({ ...prev, [employeeId]: newShift }));
    };

    const changedEmployeeIds = Object.entries(editedShifts).filter(([empId, newShift]) => originalShifts[empId] !== newShift).map(([empId]) => empId);

    const saveShiftChanges = async () => {
        if (changedEmployeeIds.length === 0) {
            showNotification('error', 'Tidak ada perubahan penugasan shift untuk disimpan.');
            return;
        }

        try {
            setSaving(true);
            const mergedAssignments: Record<string, Shift> = { ...editedShifts };
            const { error } = await (supabase.from('units') as any).update({ shift_assignments: mergedAssignments }).eq('id', managedUnitId);
            if (error) throw error;

            const changedDetails = changedEmployeeIds.map(id => {
                const emp = unitEmployees.find(e => e.id === id);
                return { employee_id: id, employee_name: emp?.nama || id, from_shift: originalShifts[id], to_shift: editedShifts[id] };
            });
            void createAuditLog({
                action: 'UPDATE', entityType: 'unit', entityId: managedUnitId!, entityName: workUnit?.nama,
                description: `Mengubah penugasan shift ${changedEmployeeIds.length} karyawan di unit ${workUnit?.nama}`,
                oldData: { shift_assignments: originalShifts }, newData: { shift_assignments: editedShifts, changes: changedDetails },
            });

            setOriginalShifts({ ...editedShifts });
            showNotification('success', `✅ Penugasan shift ${changedEmployeeIds.length} karyawan berhasil disimpan untuk ${workUnit?.nama}.`);
            await loadUnitData();
        } catch (error: any) {
            logger.error('Error saving shift assignments', error);
            showNotification('error', `Gagal menyimpan penugasan shift: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const saveShiftConfig = async () => {
        try {
            setSavingConfig(true);
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            const response = await fetch(`/api/organization/units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ unit: { id: managedUnitId!, nama: workUnit?.nama || '', shifts: unitShifts } }),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) throw new Error(result?.error || 'Gagal menyimpan konfigurasi shift unit');

            void createAuditLog({
                action: 'UPDATE', entityType: 'unit', entityId: managedUnitId!, entityName: workUnit?.nama,
                description: `Mengubah konfigurasi shift unit ${workUnit?.nama} (${unitShifts.length} shift)`,
                oldData: { shifts: originalUnitShifts }, newData: { shifts: unitShifts },
            });

            setOriginalUnitShifts([...unitShifts]);
            showNotification('success', `✅ Konfigurasi ${unitShifts.length} shift berhasil disimpan untuk ${workUnit?.nama}.`);
        } catch (error: any) {
            showNotification('error', `Gagal menyimpan konfigurasi shift: ${error.message}`);
        } finally {
            setSavingConfig(false);
        }
    };

    const unitShiftsDirty = JSON.stringify(unitShifts) !== JSON.stringify(originalUnitShifts);

    return {
        unitEmployees, workUnit, loading, saving, savingConfig,
        editedShifts, originalShifts, unitShifts, originalUnitShifts, setUnitShifts,
        notification, showNotification, loadUnitData, handleShiftChange,
        changedEmployeeIds, saveShiftChanges, saveShiftConfig, unitShiftsDirty
    };
}

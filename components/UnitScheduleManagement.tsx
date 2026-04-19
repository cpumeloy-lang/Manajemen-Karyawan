import React, { useState, useEffect } from 'react';
import { Employee, WorkUnit, Shift } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { CalendarDaysIcon, UserGroupIcon, ClockIcon } from './icons.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';

interface UnitScheduleManagementProps {
    kepalaRuangan: Employee; // Current user (kepala ruangan)
}

const UnitScheduleManagement: React.FC<UnitScheduleManagementProps> = ({ kepalaRuangan }) => {
    const managedUnitId = kepalaRuangan.unitKerjaId || kepalaRuangan.managedUnitId;
    const [unitEmployees, setUnitEmployees] = useState<Employee[]>([]);
    const [workUnit, setWorkUnit] = useState<WorkUnit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editedShifts, setEditedShifts] = useState<Record<string, Shift>>({});

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
            setWorkUnit(unitData);

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

            setUnitEmployees(mappedEmployees);

            // Initialize edited shifts with current shifts
            const initialShifts: Record<string, Shift> = {};
            mappedEmployees.forEach(emp => {
                initialShifts[emp.id] = emp.shift;
            });
            setEditedShifts(initialShifts);

        } catch (error: any) {
            console.error('❌ Error loading unit data:', error);
            alert(`Gagal memuat data unit: ${error.message}`);
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

    const saveShiftChanges = async () => {
        try {
            setSaving(true);

            // Update shifts for all employees that have changes
            const updates = Object.entries(editedShifts).map(([empId, shift]) => {
                return supabase
                    .from('employees')
                    .update({ shift })
                    .eq('id', empId);
            });

            await Promise.all(updates);

            alert(`✅ Jadwal shift untuk ${workUnit?.nama} berhasil disimpan!`);
            await loadUnitData(); // Reload data

        } catch (error: any) {
            console.error('❌ Error saving shifts:', error);
            alert(`Gagal menyimpan jadwal: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const getShiftColor = (shift: Shift) => {
        switch (shift) {
            case 'Pagi': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Siang': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'Malam': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
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
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-600">
                            {unitEmployees.length} Karyawan
                        </span>
                    </div>
                </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <label htmlFor="unit-schedule-period" className="block text-sm font-medium text-gray-700 mb-2">
                    <ClockIcon className="w-4 h-4 inline mr-2" />
                    Periode Jadwal
                </label>
                <input
                    id="unit-schedule-period"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    title="Pilih periode jadwal shift"
                />
            </div>

            {/* Shift Assignment Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nama Karyawan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Jabatan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Shift Saat Ini
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ubah Shift
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {unitEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Tidak ada karyawan di unit ini
                                    </td>
                                </tr>
                            ) : (
                                unitEmployees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img
                                                    src={emp.foto || 'https://via.placeholder.com/40'}
                                                    alt={emp.nama}
                                                    className="w-10 h-10 rounded-full object-cover mr-3"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{emp.nama}</div>
                                                    <div className="text-xs text-gray-500">{emp.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {emp.jabatan}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                emp.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                                                emp.status === 'Cuti' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-sm font-medium rounded-md border ${getShiftColor(emp.shift)}`}>
                                                {emp.shift}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={editedShifts[emp.id] || emp.shift}
                                                onChange={(e) => handleShiftChange(emp.id, e.target.value as Shift)}
                                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                                disabled={emp.status !== 'Aktif'}
                                                title={`Pilih shift untuk ${emp.nama}`}
                                            >
                                                <option value="Pagi">Pagi (07:00-15:00)</option>
                                                <option value="Siang">Siang (15:00-23:00)</option>
                                                <option value="Malam">Malam (23:00-07:00)</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <button
                    onClick={loadUnitData}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                    disabled={saving}
                >
                    Reset
                </button>
                <button
                    onClick={saveShiftChanges}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={saving || unitEmployees.length === 0}
                >
                    {saving ? (
                        <>
                            <LoadingSpinner size="small" color="white" />
                            Menyimpan...
                        </>
                    ) : (
                        '💾 Simpan Jadwal'
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
        </div>
    );
};

export default UnitScheduleManagement;

import React, { useState, useEffect } from 'react';
import { WorkUnit, Department, Position } from '../types.ts';
import { PencilIcon, TrashIcon } from './icons.tsx';

interface OrganizationSettingsProps {
    workUnits: WorkUnit[];
    departments: Department[];
    positions: Position[];
    onSaveWorkUnit: (unit: WorkUnit) => void;
    onDeleteWorkUnit: (id: string) => void;
    onSaveDepartment: (dept: Department) => void;
    onDeleteDepartment: (id: string) => void;
    onSavePosition: (position: Position) => void;
    onDeletePosition: (id: string) => void;
}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
    workUnits,
    departments,
    positions,
    onSaveWorkUnit,
    onDeleteWorkUnit,
    onSaveDepartment,
    onDeleteDepartment,
    onSavePosition,
    onDeletePosition,
}) => {
    const [activeTab, setActiveTab] = useState<'units' | 'departments' | 'positions'>('departments');
    
    // Work Unit State
    const [editingUnit, setEditingUnit] = useState<WorkUnit | null>(null);
    const [unitName, setUnitName] = useState('');
    
    // Department State
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptName, setDeptName] = useState('');
    
    // Position State
    const [editingPos, setEditingPos] = useState<Position | null>(null);
    const [posName, setPosName] = useState('');

    useEffect(() => {
        if (editingUnit) {
            setUnitName(editingUnit.nama);
        } else {
            setUnitName('');
        }
    }, [editingUnit]);

    useEffect(() => {
        if (editingDept) {
            setDeptName(editingDept.nama);
        } else {
            setDeptName('');
        }
    }, [editingDept]);

    useEffect(() => {
        if (editingPos) {
            setPosName(editingPos.nama);
        } else {
            setPosName('');
        }
    }, [editingPos]);

    // Work Unit Handlers
    const handleSaveUnit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitName.trim()) {
            alert('Nama unit kerja tidak boleh kosong.');
            return;
        }
        onSaveWorkUnit({
            id: editingUnit ? editingUnit.id : '',
            nama: unitName,
        });
        setEditingUnit(null);
        setUnitName('');
    };

    const handleEditUnit = (unit: WorkUnit) => {
        setEditingUnit(unit);
    };

    const handleCancelUnit = () => {
        setEditingUnit(null);
        setUnitName('');
    };

    // Department Handlers
    const handleSaveDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptName.trim()) {
            alert('Nama departemen tidak boleh kosong.');
            return;
        }
        onSaveDepartment({
            id: editingDept ? editingDept.id : '',
            nama: deptName,
        });
        setEditingDept(null);
        setDeptName('');
    };

    const handleEditDept = (dept: Department) => {
        setEditingDept(dept);
    };

    const handleCancelDept = () => {
        setEditingDept(null);
        setDeptName('');
    };

    // Position Handlers
    const handleSavePos = (e: React.FormEvent) => {
        e.preventDefault();
        if (!posName.trim()) {
            alert('Nama jabatan tidak boleh kosong.');
            return;
        }
        onSavePosition({
            id: editingPos ? editingPos.id : '',
            nama: posName,
        });
        setEditingPos(null);
        setPosName('');
    };

    const handleEditPos = (pos: Position) => {
        setEditingPos(pos);
    };

    const handleCancelPos = () => {
        setEditingPos(null);
        setPosName('');
    };

    const TabButton: React.FC<{ tab: 'units' | 'departments' | 'positions'; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === tab
                    ? 'bg-white text-[#06736a] border-b-2 border-[#06736a]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pengaturan Organisasi</h2>
                <div className="flex gap-2 border-b border-gray-200">
                    <TabButton tab="departments" label="Departemen" />
                    <TabButton tab="positions" label="Jabatan" />
                    <TabButton tab="units" label="Unit Kerja" />
                </div>
            </div>

            {/* Department Tab */}
            {activeTab === 'departments' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">
                                {editingDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}
                            </h3>
                            <form onSubmit={handleSaveDept} className="space-y-4">
                                <div>
                                    <label htmlFor="deptName" className="block text-sm font-medium text-gray-700">
                                        Nama Departemen
                                    </label>
                                    <input
                                        type="text"
                                        id="deptName"
                                        value={deptName}
                                        onChange={(e) => setDeptName(e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
                                        placeholder="Contoh: Departemen Medis"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    {editingDept && (
                                        <button
                                            type="button"
                                            onClick={handleCancelDept}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#06736a] hover:bg-[#054f46]"
                                    >
                                        {editingDept ? 'Simpan Perubahan' : 'Tambah Departemen'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">Daftar Departemen</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nama Departemen
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {departments.length > 0 ? (
                                            departments.map((dept) => (
                                                <tr key={dept.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {dept.nama}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEditDept(dept)}
                                                            className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]"
                                                            aria-label="Edit departemen"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteDepartment(dept.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 ml-2"
                                                            aria-label="Hapus departemen"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                                                    Belum ada departemen yang ditambahkan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Position Tab */}
            {activeTab === 'positions' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">
                                {editingPos ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
                            </h3>
                            <form onSubmit={handleSavePos} className="space-y-4">
                                <div>
                                    <label htmlFor="posName" className="block text-sm font-medium text-gray-700">
                                        Nama Jabatan
                                    </label>
                                    <input
                                        type="text"
                                        id="posName"
                                        value={posName}
                                        onChange={(e) => setPosName(e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
                                        placeholder="Contoh: Dokter Spesialis"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    {editingPos && (
                                        <button
                                            type="button"
                                            onClick={handleCancelPos}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#06736a] hover:bg-[#054f46]"
                                    >
                                        {editingPos ? 'Simpan Perubahan' : 'Tambah Jabatan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">Daftar Jabatan</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nama Jabatan
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {positions.length > 0 ? (
                                            positions.map((pos) => (
                                                <tr key={pos.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {pos.nama}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEditPos(pos)}
                                                            className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]"
                                                            aria-label="Edit jabatan"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeletePosition(pos.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 ml-2"
                                                            aria-label="Hapus jabatan"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                                                    Belum ada jabatan yang ditambahkan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Work Unit Tab */}
            {activeTab === 'units' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">
                                {editingUnit ? 'Edit Unit Kerja' : 'Tambah Unit Kerja Baru'}
                            </h3>
                            <form onSubmit={handleSaveUnit} className="space-y-4">
                                <div>
                                    <label htmlFor="unitName" className="block text-sm font-medium text-gray-700">
                                        Nama Unit
                                    </label>
                                    <input
                                        type="text"
                                        id="unitName"
                                        value={unitName}
                                        onChange={(e) => setUnitName(e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
                                        placeholder="Contoh: Poli Anak"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    {editingUnit && (
                                        <button
                                            type="button"
                                            onClick={handleCancelUnit}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#06736a] hover:bg-[#054f46]"
                                    >
                                        {editingUnit ? 'Simpan Perubahan' : 'Tambah Unit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-lg font-bold text-[#06736a] mb-4">Daftar Unit Kerja</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Nama Unit Kerja
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {workUnits.length > 0 ? (
                                            workUnits.map((unit) => (
                                                <tr key={unit.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {unit.nama}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => handleEditUnit(unit)}
                                                            className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]"
                                                            aria-label="Edit unit kerja"
                                                        >
                                                            <PencilIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => onDeleteWorkUnit(unit.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 ml-2"
                                                            aria-label="Hapus unit kerja"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                                                    Belum ada unit kerja yang ditambahkan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationSettings;

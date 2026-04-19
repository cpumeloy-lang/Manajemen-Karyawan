import React, { useState, useEffect } from 'react';
import { WorkUnit } from '../types.ts';
import { PencilIcon, TrashIcon } from './icons.tsx';

interface WorkUnitManagementProps {
    workUnits: WorkUnit[];
    onSave: (unit: WorkUnit) => void;
    onDelete: (id: string) => void;
}

const WorkUnitManagement: React.FC<WorkUnitManagementProps> = ({ workUnits, onSave, onDelete }) => {
    const [editingUnit, setEditingUnit] = useState<WorkUnit | null>(null);
    const [unitName, setUnitName] = useState('');

    useEffect(() => {
        if (editingUnit) {
            setUnitName(editingUnit.nama);
        } else {
            setUnitName('');
        }
    }, [editingUnit]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitName.trim()) {
            alert('Nama unit kerja tidak boleh kosong.');
            return;
        }
        onSave({
            id: editingUnit ? editingUnit.id : '',
            nama: unitName,
        });
        setEditingUnit(null);
        setUnitName('');
    };
    
    const handleEdit = (unit: WorkUnit) => {
        setEditingUnit(unit);
    };

    const handleCancel = () => {
        setEditingUnit(null);
        setUnitName('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-primary mb-4">{editingUnit ? 'Edit Unit Kerja' : 'Tambah Unit Kerja Baru'}</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label htmlFor="unitName" className="block text-sm font-medium text-gray-700">Nama Unit</label>
                            <input
                                type="text"
                                id="unitName"
                                value={unitName}
                                onChange={(e) => setUnitName(e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                                placeholder="Contoh: Poli Anak"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            {editingUnit && (
                                <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Batal</button>
                            )}
                            <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-90">
                                {editingUnit ? 'Simpan Perubahan' : 'Tambah Unit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-primary mb-4">Daftar Unit Kerja</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Unit Kerja</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {workUnits.length > 0 ? (
                                    workUnits.map(unit => (
                                        <tr key={unit.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.nama}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(unit)} className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]">
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => onDelete(unit.id)} className="p-2 text-gray-400 hover:text-danger rounded-full hover:bg-red-50 ml-2">
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
    );
};

export default WorkUnitManagement;
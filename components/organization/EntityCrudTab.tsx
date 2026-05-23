import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon } from '../icons.tsx';

interface CrudItem {
    id: string;
    nama: string;
}

interface EntityCrudTabProps<T extends CrudItem> {
    entityLabel: string;
    entityLabelPlural: string;
    items: T[];
    onSave: (item: T) => void;
    onDelete: (id: string) => void;
    placeholder?: string;
}

function EntityCrudTab<T extends CrudItem>({
    entityLabel,
    entityLabelPlural,
    items,
    onSave,
    onDelete,
    placeholder,
}: EntityCrudTabProps<T>) {
    const [editing, setEditing] = useState<T | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        setName(editing ? editing.nama : '');
    }, [editing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert(`Nama ${entityLabel.toLowerCase()} tidak boleh kosong.`);
            return;
        }
        onSave({ id: editing ? editing.id : '', nama: name } as T);
        setEditing(null);
        setName('');
    };

    const handleCancel = () => {
        setEditing(null);
        setName('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">
                        {editing ? `Edit ${entityLabel}` : `Tambah ${entityLabel} Baru`}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor={`${entityLabel}-name`} className="block text-sm font-medium text-gray-700">
                                Nama {entityLabel}
                            </label>
                            <input
                                type="text"
                                id={`${entityLabel}-name`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a]"
                                placeholder={placeholder || `Contoh: ${entityLabel} Baru`}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            {editing && (
                                <button type="button" onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
                                    Batal
                                </button>
                            )}
                            <button type="submit"
                                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#06736a] hover:bg-[#054f46]">
                                {editing ? 'Simpan Perubahan' : `Tambah ${entityLabel}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Daftar {entityLabelPlural}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nama {entityLabel}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.length > 0 ? (
                                    items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item.nama}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => setEditing(item)}
                                                    className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]"
                                                    aria-label={`Edit ${entityLabel.toLowerCase()}`}>
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => onDelete(item.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 ml-2"
                                                    aria-label={`Hapus ${entityLabel.toLowerCase()}`}>
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-10 text-center text-gray-500">
                                            Belum ada {entityLabelPlural.toLowerCase()} yang ditambahkan.
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
}

export default EntityCrudTab;

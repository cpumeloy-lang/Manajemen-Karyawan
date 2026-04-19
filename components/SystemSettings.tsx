import React, { useState, useEffect } from 'react';
import { SystemSettings as SystemSettingsType } from '../types';
import { PencilIcon, CheckIcon, XMarkIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface SystemSettingsProps {
    settings: SystemSettingsType | null;
    onUpdate: (settings: Partial<SystemSettingsType>) => Promise<void>;
    loading: boolean;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ settings, onUpdate, loading }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<SystemSettingsType>>({
        institution_name: '',
        institution_type: 'Rumah Sakit',
        address: '',
        phone: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                institution_name: settings.institution_name,
                institution_type: settings.institution_type,
                address: settings.address || '',
                phone: settings.phone || ''
            });
        }
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (settings) {
            setFormData({
                institution_name: settings.institution_name,
                institution_type: settings.institution_type,
                address: settings.address || '',
                phone: settings.phone || ''
            });
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h2>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        aria-label="Edit pengaturan sistem"
                    >
                        <PencilIcon />
                        <span>Edit</span>
                    </button>
                )}
            </div>

            {!isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Nama Institusi
                        </label>
                        <p className="text-lg font-semibold text-gray-800">
                            {settings?.institution_name || 'Belum diatur'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Jenis Institusi
                        </label>
                        <p className="text-lg text-gray-800">
                            {settings?.institution_type || 'Belum diatur'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Alamat
                        </label>
                        <p className="text-lg text-gray-800">
                            {settings?.address || 'Belum diatur'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Telepon
                        </label>
                        <p className="text-lg text-gray-800">
                            {settings?.phone || 'Belum diatur'}
                        </p>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nama Institusi *
                        </label>
                        <input
                            type="text"
                            name="institution_name"
                            value={formData.institution_name}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            placeholder="Contoh: RS Harapan Sehat"
                        />
                    </div>
                    <div>
                        <label htmlFor="institution-type" className="block text-sm font-medium text-gray-700 mb-2">
                            Jenis Institusi *
                        </label>
                        <select
                            id="institution-type"
                            name="institution_type"
                            value={formData.institution_type}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="Rumah Sakit">Rumah Sakit</option>
                            <option value="Klinik">Klinik</option>
                            <option value="Puskesmas">Puskesmas</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Alamat
                        </label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Alamat lengkap institusi"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Telepon
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nomor telepon institusi"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
                        >
                            <CheckIcon />
                            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400"
                        >
                            <XMarkIcon />
                            <span>Batal</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default SystemSettings;

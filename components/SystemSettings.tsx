import React, { useState, useEffect } from 'react';
import { SystemSettings as SystemSettingsType, ShiftDefinition, DEFAULT_SHIFT_DEFINITIONS } from '../types';
import { PencilIcon, CheckIcon, XMarkIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import ShiftConfigPanel from './ShiftConfigPanel';

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
    const [shiftDefs, setShiftDefs] = useState<ShiftDefinition[]>(DEFAULT_SHIFT_DEFINITIONS);
    const [shiftSaving, setShiftSaving] = useState(false);
    const [payrollForm, setPayrollForm] = useState({
        overtime_rate_per_hour: 30000,
        bpjs_kesehatan_rate: 1, // dalam persen, akan dikonversi ke decimal saat simpan
        bpjs_kesehatan_max_wage: 12000000,
    });
    const [payrollSaving, setPayrollSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                institution_name: settings.institution_name,
                institution_type: settings.institution_type,
                address: settings.address || '',
                phone: settings.phone || ''
            });
            setShiftDefs(
                (settings.default_shifts && settings.default_shifts.length > 0)
                    ? settings.default_shifts
                    : DEFAULT_SHIFT_DEFINITIONS
            );
            setPayrollForm({
                overtime_rate_per_hour:  settings.overtime_rate_per_hour  ?? 30000,
                bpjs_kesehatan_rate:    (settings.bpjs_kesehatan_rate    ?? 0.01) * 100, // ke persen
                bpjs_kesehatan_max_wage: settings.bpjs_kesehatan_max_wage ?? 12000000,
            });
        }
    }, [settings]);

    const handleSavePayroll = async () => {
        setPayrollSaving(true);
        try {
            await onUpdate({
                overtime_rate_per_hour: payrollForm.overtime_rate_per_hour,
                bpjs_kesehatan_rate:    payrollForm.bpjs_kesehatan_rate / 100, // dari persen ke decimal
                bpjs_kesehatan_max_wage: payrollForm.bpjs_kesehatan_max_wage,
            } as any);
        } finally {
            setPayrollSaving(false);
        }
    };

    const handleSaveShifts = async () => {
        setShiftSaving(true);
        try {
            await onUpdate({ default_shifts: shiftDefs } as any);
        } finally {
            setShiftSaving(false);
        }
    };

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
        <>
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

        {/* Konfigurasi Shift Global */}

        <div className="bg-white shadow-md rounded-lg p-6 mt-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">⏰ Konfigurasi Shift Global</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Shift default sistem. Kepala Unit dapat override per unit di modul Jadwal Unit.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSaveShifts}
                    disabled={shiftSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] transition-colors disabled:bg-gray-400 text-sm font-medium"
                >
                    {shiftSaving ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : <CheckIcon />}
                    <span>{shiftSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Shift'}</span>
                </button>
            </div>

            <div className="mt-1 mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                <strong>Hierarki prioritas shift:</strong>{' '}
                <span className="font-semibold">Jadwal per tanggal (KR)</span> →{' '}
                <span className="font-semibold">Penugasan unit (KR)</span> →{' '}
                <span className="font-semibold">Shift global ini</span> →{' '}
                <span>Tipe kontrak karyawan</span>
            </div>

            <ShiftConfigPanel shifts={shiftDefs} onChange={setShiftDefs} />
        </div>

        {/* ── Payroll Configuration Panel ── */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        💰 Konfigurasi Penggajian
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Tarif lembur dan BPJS yang dipakai pada perhitungan slip gaji.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSavePayroll}
                    disabled={payrollSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] transition-colors disabled:bg-gray-400 text-sm font-medium"
                >
                    {payrollSaving ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : <CheckIcon />}
                    <span>{payrollSaving ? 'Menyimpan...' : 'Simpan Konfigurasi Gaji'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tarif Lembur per Jam (Rp)</label>
                    <input
                        type="number" min={0} step={1000}
                        value={payrollForm.overtime_rate_per_hour}
                        onChange={e => setPayrollForm(p => ({ ...p, overtime_rate_per_hour: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Default: Rp 30.000/jam</p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tarif BPJS Kesehatan (%)</label>
                    <input
                        type="number" min={0} max={10} step={0.1}
                        value={payrollForm.bpjs_kesehatan_rate}
                        onChange={e => setPayrollForm(p => ({ ...p, bpjs_kesehatan_rate: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Default: 1% (dipotong dari gaji)</p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Batas Atas Upah BPJS (Rp)</label>
                    <input
                        type="number" min={0} step={100000}
                        value={payrollForm.bpjs_kesehatan_max_wage}
                        onChange={e => setPayrollForm(p => ({ ...p, bpjs_kesehatan_max_wage: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Default: Rp 12.000.000 (regulasi BPJS)</p>
                </div>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                ⚠️ Perubahan tarif berlaku untuk slip gaji yang <strong>baru di-generate</strong> setelah simpan. Slip lama tidak dihitung ulang otomatis.
            </div>
        </div>
        </>
    );
};

export default SystemSettings;

import React, { useState } from 'react';
import { CheckIcon } from '../icons.tsx';

interface PayrollConfigPanelProps {
    overtimeRate: number;
    bpjsRate: number;
    bpjsMaxWage: number;
    onSave: (data: { overtime_rate_per_hour: number; bpjs_kesehatan_rate: number; bpjs_kesehatan_max_wage: number }) => Promise<void>;
}

const PayrollConfigPanel: React.FC<PayrollConfigPanelProps> = ({ overtimeRate, bpjsRate, bpjsMaxWage, onSave }) => {
    const [form, setForm] = useState({
        overtime_rate_per_hour: overtimeRate,
        bpjs_kesehatan_rate: bpjsRate * 100, // decimal to percent
        bpjs_kesehatan_max_wage: bpjsMaxWage,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({
                overtime_rate_per_hour: form.overtime_rate_per_hour,
                bpjs_kesehatan_rate: form.bpjs_kesehatan_rate / 100, // percent to decimal
                bpjs_kesehatan_max_wage: form.bpjs_kesehatan_max_wage,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">💰 Konfigurasi Penggajian</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Tarif lembur dan BPJS yang dipakai pada perhitungan slip gaji.</p>
                </div>
                <button type="button" onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] transition-colors disabled:bg-gray-400 text-sm font-medium">
                    {saving ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    ) : <CheckIcon />}
                    <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi Gaji'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tarif Lembur per Jam (Rp)</label>
                    <input type="number" min={0} step={1000} value={form.overtime_rate_per_hour}
                        onChange={e => setForm(p => ({ ...p, overtime_rate_per_hour: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]" />
                    <p className="text-[10px] text-gray-500 mt-1">Default: Rp 30.000/jam</p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tarif BPJS Kesehatan (%)</label>
                    <input type="number" min={0} max={10} step={0.1} value={form.bpjs_kesehatan_rate}
                        onChange={e => setForm(p => ({ ...p, bpjs_kesehatan_rate: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]" />
                    <p className="text-[10px] text-gray-500 mt-1">Default: 1% (dipotong dari gaji)</p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Batas Atas Upah BPJS (Rp)</label>
                    <input type="number" min={0} step={100000} value={form.bpjs_kesehatan_max_wage}
                        onChange={e => setForm(p => ({ ...p, bpjs_kesehatan_max_wage: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#06736a]" />
                    <p className="text-[10px] text-gray-500 mt-1">Default: Rp 12.000.000 (regulasi BPJS)</p>
                </div>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                ⚠️ Perubahan tarif berlaku untuk slip gaji yang <strong>baru di-generate</strong> setelah simpan. Slip lama tidak dihitung ulang otomatis.
            </div>
        </div>
    );
};

export default PayrollConfigPanel;

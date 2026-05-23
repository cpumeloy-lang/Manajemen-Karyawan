import React from 'react';
import { InfoBox, Code } from './GuideComponents';

const GuidePayroll: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="info">
                Tarif penggajian (lembur, BPJS) sekarang dapat dikonfigurasi per institusi. Sebelumnya hardcoded di kode.
            </InfoBox>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">⚙️ Lokasi Pengaturan</h4>
                <p className="text-sm text-gray-600">
                    Buka <strong>Pengaturan Sistem</strong> → panel <strong>💰 Konfigurasi Penggajian</strong>.
                </p>

                <h4 className="font-bold text-gray-800 pt-2">📊 3 Parameter yang Dapat Diatur</h4>
                <div className="space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-gray-800 text-sm">🕒 Tarif Lembur per Jam</p>
                        <p className="text-xs text-gray-600 mt-1">Default: <Code>Rp 30.000/jam</Code>. Dipakai untuk menghitung <strong>upah lembur</strong> di slip gaji: <Code>upahLembur = totalOvertime * tarif</Code>.</p>
                        <p className="text-xs text-amber-700 mt-1">⚠️ Pastikan sesuai dengan kebijakan UU Ketenagakerjaan / kebijakan internal.</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-gray-800 text-sm">🏥 Tarif BPJS Kesehatan (%)</p>
                        <p className="text-xs text-gray-600 mt-1">Default: <Code>1%</Code> dari gaji pokok (porsi karyawan, regulasi BPJS).</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-gray-800 text-sm">💵 Batas Atas Upah BPJS</p>
                        <p className="text-xs text-gray-600 mt-1">Default: <Code>Rp 12.000.000</Code>. Gaji di atas batas ini tidak ditambahkan ke perhitungan iuran BPJS.</p>
                    </div>
                </div>

                <h4 className="font-bold text-gray-800 pt-2">⚠️ Penting</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                    <li>Perubahan tarif berlaku untuk slip gaji yang <strong>baru di-generate</strong></li>
                    <li>Slip gaji lama yang sudah dibuat <strong>tidak dihitung ulang otomatis</strong></li>
                    <li>Untuk hitung ulang slip gaji historis, regenerate manual dari menu Penggajian</li>
                </ul>
            </div>
        </div>
    );
};

export default GuidePayroll;

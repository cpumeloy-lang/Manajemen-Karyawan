import React from 'react';
import { Step, InfoBox, Code } from './GuideComponents';

const GuideNik: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="warning">
                NIK (Nomor Induk Karyawan) adalah <strong>kunci utama</strong> penghubung data karyawan di HRMS Pro dengan mesin absensi Hikvision. Wajib diisi sebelum mengintegrasikan mesin absensi.
            </InfoBox>
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📌 Aturan Format NIK</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { icon: '✅', title: 'Format yang diizinkan', items: ['Angka saja (0-9)', 'Maksimal 32 digit', 'Contoh: 20240001'] },
                        { icon: '❌', title: 'Format yang tidak boleh', items: ['Huruf (a-z, A-Z)', 'Tanda hubung (-)', 'Spasi atau simbol'] },
                    ].map((f, i) => (
                        <div key={i} className={`rounded-xl border p-4 ${i === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <p className="font-semibold text-sm mb-2">{f.icon} {f.title}</p>
                            <ul className="text-xs space-y-1">
                                {f.items.map((item, j) => <li key={j} className={i === 0 ? 'text-green-700' : 'text-red-600'}>• {item}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
                <h4 className="font-bold text-gray-800">📋 Rekomendasi Format NIK</h4>
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm">
                    <p className="font-mono text-lg text-center text-[#06736a] font-bold mb-2">YYYY + NNNNN</p>
                    <p className="text-gray-600 text-center text-xs mb-3">Tahun masuk + Nomor urut 5 digit</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {[['20240001', 'Karyawan ke-1 masuk 2024'], ['20240002', 'Karyawan ke-2 masuk 2024'], ['20230015', 'Karyawan ke-15 masuk 2023'], ['20250001', 'Karyawan ke-1 masuk 2025']].map(([nik, desc]) => (
                            <div key={nik} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2">
                                <Code>{nik}</Code>
                                <span className="text-gray-500">{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <h4 className="font-bold text-gray-800">⚙️ Cara Isi NIK di HRMS Pro</h4>
                <div className="space-y-3">
                    <Step no={1} title="Buka Data Karyawan"><p>Klik <strong>Karyawan</strong> di sidebar → pilih karyawan → klik <strong>Edit</strong>.</p></Step>
                    <Step no={2} title="Isi Field NIK"><p>Cari field <strong>NIK</strong> di form → isi dengan nomor yang sudah ditentukan (contoh: <Code>20240001</Code>).</p></Step>
                    <Step no={3} title="Simpan"><p>Klik <strong>Simpan</strong> → NIK tersimpan.</p></Step>
                    <Step no={4} title="Daftarkan NIK yang sama di device">
                        <p>Di mesin Hikvision: <strong>Menu → User Management → Add User</strong></p>
                        <p>Isi <strong>Employee No</strong> dengan NIK yang <strong>sama persis</strong>: <Code>20240001</Code></p>
                    </Step>
                </div>
                <InfoBox type="success">
                    Setelah NIK sama di HRMS Pro dan device, sinkronisasi absensi akan otomatis terhubung ke karyawan yang benar.
                </InfoBox>
            </div>
        </div>
    );
};

export default GuideNik;

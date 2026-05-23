import React from 'react';
import { Badge, Step, InfoBox, Code } from './GuideComponents';

const GuideEmployee: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="info">
                Menu <strong>Karyawan</strong> digunakan untuk mengelola seluruh data SDM — dari pendaftaran, verifikasi, hingga penonaktifan.
            </InfoBox>
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📌 Alur Manajemen Karyawan</h4>
                <div className="space-y-3">
                    <Step no={1} title="Tambah Karyawan Baru">
                        <p>Klik tombol <strong>+ Tambah Karyawan</strong> → isi data lengkap (nama, jabatan, unit, dll).</p>
                        <p>Status awal: <Badge text="Belum Verifikasi" color="yellow" /></p>
                    </Step>
                    <Step no={2} title="Isi NIK Karyawan">
                        <p>Wajib diisi jika menggunakan mesin absensi Hikvision.</p>
                        <p>NIK = Nomor Induk Karyawan (angka saja, contoh: <Code>20240001</Code>)</p>
                        <p>NIK ini harus <strong>sama persis</strong> dengan Employee No di mesin absensi.</p>
                    </Step>
                    <Step no={3} title="Verifikasi Data">
                        <p>HRD/Admin klik tombol <strong>Verifikasi</strong> setelah data lengkap & benar.</p>
                        <p>Status berubah: <Badge text="Terverifikasi" color="green" /></p>
                    </Step>
                    <Step no={4} title="Kunci Profil (Opsional)">
                        <p>Profil yang sudah dikunci tidak bisa diubah oleh karyawan sendiri.</p>
                        <p>Hanya Admin/HRD yang bisa mengubah data.</p>
                    </Step>
                </div>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">📋 Field Data Karyawan Penting</div>
                <div className="divide-y divide-gray-50">
                    {[
                        ['NIK', 'Nomor Induk Karyawan — dipakai sebagai ID di mesin absensi', 'Wajib untuk Hikvision'],
                        ['Nama', 'Nama lengkap sesuai KTP', 'Wajib'],
                        ['Jabatan / Posisi', 'Jabatan fungsional karyawan', 'Wajib'],
                        ['Unit Kerja', 'Unit/ruangan tempat bertugas', 'Wajib'],
                        ['No. HP / Email', 'Kontak & login ESS', 'Wajib'],
                        ['BPJS', 'Nomor BPJS Kesehatan & Ketenagakerjaan', 'Opsional'],
                        ['Rekening Bank', 'Untuk transfer gaji', 'Opsional'],
                    ].map(([field, desc, note], i) => (
                        <div key={i} className="grid grid-cols-3 px-4 py-2 text-xs">
                            <span className="font-medium text-gray-700">{field}</span>
                            <span className="text-gray-500 col-span-1">{desc}</span>
                            <span className="text-right"><Badge text={note} color={note === 'Wajib' ? 'red' : note === 'Wajib untuk Hikvision' ? 'yellow' : 'blue'} /></span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GuideEmployee;

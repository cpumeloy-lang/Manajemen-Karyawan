import React from 'react';
import { Badge, Step, InfoBox, Code } from './GuideComponents';

const GuideAttendance: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="info">
                Menu <strong>Kehadiran</strong> menampilkan data absensi real-time dari semua sumber (web, mobile, mesin absensi).
            </InfoBox>
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📡 Sumber Data Absensi</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { src: 'Web ESS', icon: '🌐', desc: 'Karyawan check-in via browser dengan face recognition & GPS', badge: 'web-ess' },
                        { src: 'Mobile App', icon: '📱', desc: 'Karyawan check-in via aplikasi Android/iOS dengan biometrik', badge: 'mobile' },
                        { src: 'Mesin Absensi', icon: '📷', desc: 'Hikvision DS-K1T321MFX — sync otomatis ke HRMS Pro', badge: 'hikvision' },
                        { src: 'Admin Manual', icon: '🖥️', desc: 'Admin/HRD input absensi manual untuk koreksi', badge: 'web-admin' },
                    ].map((s, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex gap-3 items-start">
                            <span className="text-xl">{s.icon}</span>
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{s.src}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                                <Code>{s.badge}</Code>
                            </div>
                        </div>
                    ))}
                </div>
                <h4 className="font-bold text-gray-800 pt-2">📋 Cara Input Absensi Manual</h4>
                <div className="space-y-3">
                    <Step no={1} title="Buka menu Kehadiran (Live)">
                        <p>Klik <strong>Kehadiran (Live)</strong> di sidebar.</p>
                    </Step>
                    <Step no={2} title="Klik tombol + Tambah">
                        <p>Pilih karyawan, isi tanggal, jam masuk/pulang, dan lokasi.</p>
                    </Step>
                    <Step no={3} title="Simpan">
                        <p>Data tersimpan dengan source <Code>web-admin</Code> dan muncul di laporan.</p>
                    </Step>
                </div>
                <h4 className="font-bold text-gray-800 pt-2">📊 Status Absensi</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        ['Hadir', 'green'], ['Terlambat', 'yellow'], ['Absen', 'red'],
                        ['Cuti', 'blue'], ['Sakit', 'purple'], ['Pending', 'yellow'], ['Recorded', 'blue'],
                    ].map(([s, c]) => (
                        <div key={s} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                            <Badge text={s} color={c} />
                        </div>
                    ))}
                </div>

                <h4 className="font-bold text-gray-800 pt-4">🔄 Hitung Ulang Terlambat & Lembur</h4>
                <InfoBox type="warning">
                    Data absensi dari <strong>Hikvision</strong> direkam dengan <Code>is_late=false</Code> dan <Code>overtime=0</Code> karena mesin tidak tahu jadwal shift karyawan saat itu. Gunakan fitur ini untuk menghitung ulang berdasarkan jadwal aktual.
                </InfoBox>
                <div className="space-y-3">
                    <Step no={1} title="Buka tab Laporan Absensi">
                        <p>Scroll ke bawah, cari panel <strong>🔄 Hitung Ulang Terlambat & Lembur</strong> (background oranye).</p>
                    </Step>
                    <Step no={2} title="Pilih rentang tanggal & sumber">
                        <p>Default: bulan berjalan, sumber Hikvision. Bisa diganti ke Mobile atau Semua Sumber.</p>
                    </Step>
                    <Step no={3} title="Klik Hitung Ulang">
                        <p>Sistem akan:</p>
                        <ul className="list-disc list-inside text-xs space-y-1 pl-2">
                            <li>Baca jadwal aktual karyawan dari <Code>employee_schedules</Code> (jika sudah di-publish)</li>
                            <li>Atau fallback ke definisi shift unit/global jika tidak ada per-date</li>
                            <li>Hitung <Code>is_late</Code> berdasarkan toleransi shift</li>
                            <li>Hitung <Code>overtime_hours</Code> = (jam kerja aktual) − (durasi shift)</li>
                            <li>Update record di database (kolom <Code>is_late</Code> dan <Code>overtime_hours</Code>)</li>
                        </ul>
                    </Step>
                    <Step no={4} title="Verifikasi hasil">
                        <p>Setelah selesai, muat ulang halaman. Data baru akan muncul di laporan dan slip gaji yang di-generate setelahnya.</p>
                    </Step>
                </div>
                <InfoBox type="info">
                    💡 Tips: jalankan recalculate setiap akhir bulan sebelum generate slip gaji untuk memastikan data lembur akurat.
                </InfoBox>
            </div>
        </div>
    );
};

export default GuideAttendance;

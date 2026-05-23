import React from 'react';
import { Badge, InfoBox, Code } from './GuideComponents';

const GuideKepala: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="info">
                <strong>Dashboard Kepala Ruangan</strong> adalah halaman utama untuk mengelola unit kerja Anda — memantau kehadiran, melihat distribusi shift, dan mengakses fitur manajemen.
            </InfoBox>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">🖥️ Komponen Dashboard</h4>
                <p className="text-sm text-gray-600">Dashboard menampilkan informasi real-time yang otomatis di-refresh setiap 45 detik:</p>

                <div className="space-y-3">
                    {[
                        {
                            icon: '👋', title: 'Header Welcome',
                            desc: 'Menampilkan foto, nama, jabatan Anda, dan nama unit kerja yang dikelola. Ada tombol Refresh untuk memuat ulang data secara manual.',
                        },
                        {
                            icon: '📊', title: 'Kartu Ringkasan (4 Kartu)',
                            desc: 'Total Karyawan aktif di unit, jumlah Hadir Hari Ini (dengan persentase), Tidak Hadir (absen + cuti/sakit), dan Jumlah Jenis Shift yang terkonfigurasi.',
                        },
                        {
                            icon: '🎨', title: 'Distribusi Shift Hari Ini',
                            desc: 'Menampilkan berapa karyawan per jenis shift hari ini dengan kartu berwarna sesuai konfigurasi. Jika jadwal per-tanggal sudah di-generate, data diambil dari tabel employee_schedules (lebih akurat). Jika belum, fallback ke field shift statis.',
                        },
                        {
                            icon: '📋', title: 'Ringkasan Jadwal Bulan Ini',
                            desc: 'Menampilkan statistik jadwal bulan berjalan: Total Jadwal, Draft, Published, Hari Libur, dan Coverage (persentase kelengkapan). Jika belum ada jadwal, akan tampil panduan 5 langkah untuk membuat jadwal.',
                        },
                        {
                            icon: '🕐', title: 'Jadwal Hari Ini — Siapa Bertugas',
                            desc: 'Daftar karyawan dikelompokkan berdasarkan shift hari ini. Menampilkan foto & nama karyawan per grup shift, termasuk siapa yang libur. Sumber data: jadwal per-tanggal jika tersedia, atau shift statis.',
                        },
                        {
                            icon: '⚡', title: 'Aksi Cepat',
                            desc: '3 tombol shortcut: Kelola Jadwal Shift (buka halaman manajemen jadwal), Pantau Kehadiran (buka live attendance), dan Lihat Daftar Karyawan.',
                        },
                        {
                            icon: '🚨', title: 'Status Unit Hari Ini',
                            desc: 'Notifikasi kondisional: peringatan jika kehadiran rendah (<80%), info jika ada yang tidak hadir, atau konfirmasi jika semua hadir.',
                        },
                    ].map((item, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex gap-3">
                            <span className="text-2xl flex-shrink-0">{item.icon}</span>
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">🔐 Hak Akses Kepala Ruangan</h4>
                <p className="text-sm text-gray-600">Sebagai Kepala Ruangan, Anda memiliki akses khusus yang terbatas pada unit kerja Anda:</p>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">📋 Daftar Hak Akses</div>
                    <div className="divide-y divide-gray-50">
                        {[
                            ['✅', 'Lihat data karyawan di unit sendiri'],
                            ['✅', 'Kelola jadwal shift (konfigurasi, pola rotasi, generate, publish)'],
                            ['✅', 'Pantau kehadiran karyawan di unit sendiri'],
                            ['✅', 'Override jadwal per karyawan per tanggal'],
                            ['✅', 'Approve tukar shift antar karyawan'],
                            ['❌', 'Akses data unit lain'],
                            ['❌', 'Ubah data karyawan (profil, gaji, dll)'],
                            ['❌', 'Akses menu penggajian'],
                            ['❌', 'Akses pengaturan sistem'],
                        ].map(([icon, desc], i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs">
                                <span>{icon}</span>
                                <span className="text-gray-700">{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📱 Fitur untuk Karyawan (ESS)</h4>
                <InfoBox type="info">
                    Setelah jadwal dipublish, karyawan di unit Anda akan otomatis melihat jadwal shift mereka di halaman <strong>Employee Self Service (ESS)</strong>:
                </InfoBox>
                <div className="space-y-2 text-sm">
                    {[
                        ['Shift hari ini', 'Terlihat di header ESS: nama shift + jam masuk'],
                        ['Hari libur', 'Jika jadwal menunjukkan libur, tampil label "Hari Libur"'],
                        ['Validasi absensi', 'Jam masuk/toleransi terlambat dihitung dari jadwal per-tanggal'],
                    ].map(([title, desc], i) => (
                        <div key={i} className="rounded-lg bg-green-50 border border-green-100 px-4 py-2">
                            <p className="font-semibold text-green-800 text-xs">✅ {title}</p>
                            <p className="text-green-700 text-xs mt-0.5">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">❓ FAQ Kepala Ruangan</h4>
                <div className="space-y-2">
                    {[
                        ['Kenapa distribusi shift tidak sesuai?', 'Pastikan jadwal sudah di-generate dan di-publish. Jika belum, dashboard menggunakan data shift statis dari profil karyawan.'],
                        ['Bagaimana jika karyawan minta tukar shift?', 'Buka Manajemen Jadwal Shift → klik jadwal karyawan → pilih Override atau gunakan fitur Tukar Shift.'],
                        ['Coverage jadwal masih di bawah 100%?', 'Beberapa karyawan belum memiliki jadwal di semua hari bulan ini. Generate ulang atau isi manual per tanggal. Sistem sekarang juga menampilkan ⚠️ Coverage Alert otomatis di tab Jadwal Bulanan yang menunjukkan tanggal & shift mana yang kosong.'],
                        ['Apa bedanya Draft dan Published?', 'Draft = jadwal sementara yang belum aktif. Published = jadwal resmi yang dipakai untuk validasi absensi.'],
                        ['Data dashboard tidak update?', 'Klik tombol Refresh di header dashboard, atau tunggu auto-refresh setiap 45 detik.'],
                        ['Dropdown shift karyawan menampilkan shift jabatan lain?', 'Pastikan kolom Khusus Jabatan pada definisi shift sudah diisi dan ejaannya sama persis dengan jabatan karyawan di profil mereka.'],
                        ['Tombol Terapkan (Bulk Assign) tidak aktif?', 'Pilih dulu shift target dari dropdown di sebelah kiri tombol Terapkan. Tombol aktif setelah shift dipilih.'],
                        ['Apakah Bulk Assign langsung tersimpan?', 'Tidak — Bulk Assign hanya mengubah tampilan (status "diubah"). Klik 💾 Simpan Jadwal di bagian bawah halaman untuk menyimpan ke database.'],
                        ['Unit saya punya CS, Teknisi, Security — perlu dibuat unit terpisah?', 'Tidak perlu. Satu unit bisa menangani banyak jabatan. Gunakan fitur positionGroup (Khusus Jabatan) agar shift terkelompok otomatis per jabatan.'],
                    ].map(([q, a], i) => (
                        <div key={i} className="rounded-lg border border-gray-100 px-4 py-3">
                            <p className="font-semibold text-gray-800 text-xs">❓ {q}</p>
                            <p className="text-gray-600 text-xs mt-1">→ {a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GuideKepala;

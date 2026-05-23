import React from 'react';
import { Badge, Step, InfoBox, Code } from './GuideComponents';

const GuideShift: React.FC = () => {
    return (
        <div className="space-y-5">
            <InfoBox type="info">
                Menu <strong>Manajemen Jadwal Shift</strong> memungkinkan Kepala Ruangan membuat, mengelola, dan mempublikasikan jadwal shift karyawan secara otomatis dengan sistem pola rotasi.
            </InfoBox>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">🏗️ Arsitektur Penjadwalan</h4>
                <p className="text-sm text-gray-600">Sistem menggunakan 3 layer data:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { icon: '⚙️', title: 'Konfigurasi Shift', desc: 'Definisi jenis shift (Pagi, Siang, Malam, dll) dengan jam masuk/pulang dan toleransi keterlambatan', color: 'blue' },
                        { icon: '🔄', title: 'Pola Rotasi', desc: 'Template siklus berulang seperti P-P-S-S-M-M-L-L yang otomatis di-generate ke jadwal harian', color: 'green' },
                        { icon: '📋', title: 'Jadwal Harian', desc: 'Hasil generate: 1 baris = 1 karyawan pada 1 tanggal. Bisa di-override manual per sel', color: 'purple' },
                    ].map((f, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <span className="text-2xl">{f.icon}</span>
                            <p className="font-semibold text-gray-800 text-sm mt-2">{f.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
                            <Badge text={`Layer ${i + 1}`} color={f.color} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📌 Alur Lengkap Penjadwalan (5 Langkah)</h4>
                <div className="space-y-3">
                    <Step no={1} title="Konfigurasi Shift Unit">
                        <p>Buka tab <strong>⚙️ Konfigurasi Shift</strong> → definisikan jenis shift yang berlaku di unit Anda.</p>
                        <p>Setiap shift memiliki: <strong>nama</strong>, <strong>jam masuk</strong>, <strong>jam pulang</strong>, <strong>warna</strong>, <strong>toleransi terlambat</strong>, dan opsional <strong>Khusus Jabatan</strong>.</p>

                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 my-2 space-y-2">
                            <p className="text-xs font-bold text-sky-800">🆕 Fitur: Khusus Jabatan (positionGroup)</p>
                            <p className="text-xs text-sky-700">Isi kolom <strong>Khusus Jabatan</strong> saat membuat shift agar shift tersebut <em>hanya muncul</em> di dropdown karyawan dengan jabatan yang sesuai.</p>
                            <p className="text-xs text-sky-700">Contoh: shift <Code>CS-Pagi</Code> dengan Khusus Jabatan = <Code>Cleaning Service</Code> hanya muncul untuk karyawan CS, bukan untuk Teknisi atau Security.</p>
                            <p className="text-xs text-sky-700">Kosongkan = shift berlaku untuk semua jabatan (universal).</p>
                        </div>

                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 my-2 space-y-2">
                            <p className="text-xs font-bold text-violet-800">🆕 Fitur: Pengaturan Weekend untuk Shift Bergilir</p>
                            <p className="text-xs text-violet-700">Untuk shift tipe <strong>Bergilir (Rotating)</strong>, Anda bisa mengatur Sabtu dan Minggu secara terpisah:</p>
                            <ul className="text-xs text-violet-700 list-disc list-inside space-y-1 pl-1">
                                <li><strong>Sama seperti hari kerja</strong> — Sabtu/Minggu ikut jam weekday (default)</li>
                                <li><strong>Jam berbeda</strong> — set jam custom, contoh Sabtu 08:00–12:00</li>
                                <li><strong>Libur</strong> — tidak ada jam kerja di hari tersebut</li>
                            </ul>
                            <p className="text-xs text-violet-700 mt-1">Contoh: Teknisi masuk Senin–Jumat 08:00–16:00, Sabtu 08:00–16:00 (sama), Minggu Libur → pilih Sabtu = <em>Sama seperti hari kerja</em>, Minggu = <em>Libur</em>.</p>
                        </div>

                        <p>Contoh konfigurasi untuk Unit Rumah Tangga (multi-jabatan):</p>
                        <div className="bg-gray-50 rounded-lg p-3 mt-2 text-xs space-y-1">
                            {[
                                ['CS-Pagi', '06:00–14:00', 'Bergilir', 'Cleaning Service'],
                                ['CS-Siang', '14:00–22:00', 'Bergilir', 'Cleaning Service'],
                                ['CS-Malam', '22:00–06:00', 'Bergilir', 'Cleaning Service'],
                                ['Teknisi', '08:00–16:00', 'Bergilir (Sabtu sama, Minggu libur)', 'Teknisi'],
                                ['Sec-Pagi', '06:00–14:00', 'Bergilir', 'Security'],
                                ['Sec-Siang', '14:00–22:00', 'Bergilir', 'Security'],
                                ['Sec-Malam', '22:00–06:00', 'Bergilir', 'Security'],
                            ].map(([name, jam, tipe, jabatan], i) => (
                                <div key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 py-0.5 border-b border-gray-100 last:border-0">
                                    <span className="font-semibold text-gray-800 w-20">{name}</span>
                                    <span className="text-gray-600 w-32">{jam}</span>
                                    <span className="text-gray-500 w-44">{tipe}</span>
                                    <span className="text-sky-600 font-medium">👤 {jabatan}</span>
                                </div>
                            ))}
                        </div>

                        <p className="mt-2">Contoh konfigurasi umum rumah sakit:</p>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {[
                                ['Pagi', '07:00 – 14:00', 'yellow'],
                                ['Siang', '14:00 – 21:00', 'blue'],
                                ['Malam', '21:00 – 07:00', 'indigo'],
                            ].map(([n, t, c]) => (
                                <div key={n} className="text-center text-xs p-2 rounded-lg border bg-gray-50">
                                    <Badge text={n} color={c} />
                                    <p className="text-gray-500 mt-1">{t}</p>
                                </div>
                            ))}
                        </div>
                        <InfoBox type="warning">
                            Jika unit Anda hanya punya 1 shift (misal administrasi), cukup definisikan 1 shift saja.
                        </InfoBox>
                        <InfoBox type="info">
                            Shift global default (Pagi/Siang/Malam) dikonfigurasi oleh Admin/HRD di <strong>Pengaturan Sistem → Konfigurasi Shift Global</strong>. Unit bisa override dengan definisi shift sendiri.
                        </InfoBox>
                    </Step>

                    <Step no={2} title="Buat Pola Rotasi">
                        <p>Buka tab <strong>🔄 Pola Rotasi</strong> → klik <strong>+ Tambah Pola Baru</strong>.</p>
                        <p>Pola rotasi = urutan shift yang berulang setiap N hari (siklus).</p>
                        <div className="bg-gray-50 rounded-lg p-3 mt-2">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Contoh Pola Populer:</p>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <Code>P-P-S-S-M-M-L-L</Code>
                                    <span className="text-gray-500">→ Siklus 8 hari, cocok untuk 3 shift rotation</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Code>P-P-P-P-P-L-L</Code>
                                    <span className="text-gray-500">→ Siklus 7 hari, shift tetap Pagi (Senin–Jumat)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Code>P-S-M-L</Code>
                                    <span className="text-gray-500">→ Siklus 4 hari, rotasi cepat</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-2">Gunakan tombol <strong>Quick Fill</strong> untuk mengisi pola secara cepat, atau klik per slot untuk memilih shift.</p>
                    </Step>

                    <Step no={3} title="Generate Jadwal Bulanan">
                        <p>Buka tab <strong>📅 Jadwal Bulanan</strong> → klik tombol <strong>Generate Jadwal</strong>.</p>
                        <p>Pilih:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Pola Rotasi</strong> — template yang sudah dibuat di langkah 2</li>
                            <li><strong>Bulan & Tahun</strong> — periode yang ingin di-generate</li>
                            <li><strong>Karyawan</strong> — pilih semua atau sebagian karyawan</li>
                        </ul>
                        <p className="mt-1">Sistem otomatis mengisi jadwal harian sesuai siklus pola rotasi. Setiap karyawan mendapat <strong>offset otomatis</strong> agar tidak semua orang masuk shift yang sama di hari yang sama.</p>
                        <InfoBox type="info">
                            Generate jadwal <strong>tidak menimpa</strong> jadwal yang sudah di-publish. Hanya jadwal berstatus <Badge text="Draft" color="yellow" /> yang akan di-overwrite.
                        </InfoBox>
                    </Step>

                    <Step no={4} title="Sesuaikan (Ad-Hoc Override)">
                        <p>Di kalender bulanan, klik <strong>sel jadwal</strong> karyawan tertentu untuk mengubah shift di tanggal itu.</p>
                        <p>Berguna untuk:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Karyawan yang mengajukan tukar shift</li>
                            <li>Penyesuaian karena cuti mendadak</li>
                            <li>Kebutuhan operasional khusus (misal ada operasi malam)</li>
                        </ul>
                        <p className="mt-1">Jadwal yang diubah manual akan berstatus <Badge text="Override" color="purple" />.</p>
                    </Step>

                    <Step no={5} title="Publish Jadwal">
                        <p>Setelah jadwal final, klik tombol <strong>✅ Publish</strong>.</p>
                        <p>Efek publish:</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Status berubah dari <Badge text="Draft" color="yellow" /> → <Badge text="Published" color="green" /></li>
                            <li>Jadwal aktif untuk <strong>validasi absensi</strong> (jam masuk sesuai jadwal)</li>
                            <li>Karyawan bisa melihat jadwal mereka di <strong>ESS (Self Service)</strong></li>
                            <li>Tercatat di <strong>Riwayat Publish</strong> untuk audit trail</li>
                        </ul>
                        <InfoBox type="success">
                            Setelah dipublish, jadwal tidak bisa diubah kecuali melalui fitur <strong>Override</strong> atau <strong>Tukar Shift</strong>.
                        </InfoBox>
                    </Step>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">📊 Status Jadwal</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                        ['Draft', 'yellow', 'Baru di-generate, belum aktif'],
                        ['Published', 'green', 'Aktif untuk validasi absensi'],
                        ['Override', 'purple', 'Diubah manual oleh Kepala Ruangan'],
                        ['Swapped', 'blue', 'Hasil tukar shift antar karyawan'],
                        ['Cancelled', 'red', 'Dibatalkan'],
                    ].map(([s, c, d]) => (
                        <div key={s} className="rounded-lg border border-gray-100 px-3 py-2">
                            <Badge text={s} color={c} />
                            <p className="text-[10px] text-gray-500 mt-1">{d}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">👥 Mengelola Unit dengan Multi-Jabatan</h4>
                <InfoBox type="info">
                    Satu unit (misal <strong>Rumah Tangga</strong>) bisa memiliki beberapa kelompok jabatan dengan pola shift berbeda — CS 3 shift, Teknisi fix, Security 3 shift — tanpa perlu dipecah jadi unit terpisah.
                </InfoBox>
                <div className="space-y-3">
                    <Step no={1} title="Definisikan shift dengan positionGroup">
                        <p>Beri label <strong>Khusus Jabatan</strong> pada setiap shift (lihat Langkah 1 di atas). Ini mengelompokkan shift secara otomatis.</p>
                    </Step>
                    <Step no={2} title="Penugasan shift dikelompokkan per jabatan">
                        <p>Panel Penugasan Shift otomatis <strong>mengelompokkan karyawan berdasarkan jabatan</strong>. Header tiap grup menampilkan:</p>
                        <ul className="list-disc list-inside text-xs space-y-1 pl-2">
                            <li><strong>Distribusi shift real-time</strong> — contoh: <Code>CS-Pagi: 8 | CS-Siang: 4 | CS-Malam: 3</Code></li>
                            <li><strong>Tombol bulk assign</strong> — tugaskan semua karyawan aktif di grup ke satu shift sekaligus</li>
                            <li><strong>Dropdown hanya tampilkan shift relevan</strong> — karyawan CS tidak melihat shift Security</li>
                        </ul>
                    </Step>
                    <Step no={3} title="Bulk Assign untuk grup besar">
                        <p>Jika CS punya 15 orang yang semua masuk Shift Pagi:</p>
                        <ol className="list-decimal list-inside text-xs space-y-1 pl-2">
                            <li>Di header grup <strong>Cleaning Service</strong>, pilih <Code>CS-Pagi</Code> dari dropdown <em>Tugaskan semua</em></li>
                            <li>Klik <strong>Terapkan (15)</strong> → semua 15 karyawan aktif langsung di-assign ke CS-Pagi</li>
                            <li>Override individual jika ada yang berbeda shift</li>
                            <li>Klik <strong>💾 Simpan Jadwal</strong> di bagian bawah</li>
                        </ol>
                        <InfoBox type="success">
                            Grup bisa di-<strong>collapse</strong> (klik ▼) setelah selesai. Header tetap menampilkan ringkasan distribusi meski collapsed.
                        </InfoBox>
                    </Step>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">💡 Tips & Best Practices</h4>
                <div className="space-y-2">
                    {[
                        ['Generate di awal bulan', 'Buat jadwal 1 bulan ke depan di minggu terakhir bulan sebelumnya agar karyawan punya waktu melihat jadwal mereka.'],
                        ['Gunakan offset stagger', 'Saat generate, setiap karyawan otomatis mendapat offset berbeda agar distribusi shift merata per hari.'],
                        ['Validasi jam kerja', 'Sistem akan memperingatkan jika ada karyawan melebihi 40 jam kerja per minggu (sesuai UU Ketenagakerjaan).'],
                        ['Review sebelum publish', 'Selalu periksa kalender visual sebelum publish — pastikan coverage shift terpenuhi setiap hari.'],
                        ['Pakai Bulk Assign untuk efisiensi', 'Untuk unit dengan 10+ karyawan per jabatan, gunakan Tugaskan Semua di header grup → override individual jika perlu. Jauh lebih cepat dari mengubah satu per satu.'],
                        ['Label positionGroup konsisten', 'Pastikan teks Khusus Jabatan pada shift sama persis (case-insensitive) dengan jabatan karyawan di data profil. Contoh: "Cleaning Service" harus match dengan jabatan karyawan yang tertulis "Cleaning Service".'],
                        ['Weekend override untuk shift non-klinis', 'Untuk jabatan yang Sabtu/Minggu berbeda (misal administrasi, teknisi), gunakan opsi weekend override di shift Bergilir daripada membuat shift terpisah Senin–Jumat dan Sabtu.'],
                        ['Perhatikan ⚠️ Coverage Alert', 'Di tab Jadwal Bulanan, sistem otomatis mendeteksi hari yang ada shift kosong (tidak ada karyawan). Peringatan kuning muncul di atas kalender dengan detail tanggal & shift yang belum terisi.'],
                        ['Export Excel penugasan shift', 'Gunakan tombol 📊 Export Excel di bawah panel penugasan untuk mengunduh file Excel lengkap (NIK, Nama, Jabatan, Shift, Jam, Toleransi, dsb). Cocok untuk arsip & laporan ke manajemen.'],
                        ['Semua perubahan shift tercatat di audit log', 'Setiap kali Anda menyimpan konfigurasi shift atau mengubah penugasan shift karyawan, sistem mencatat di Audit Log lengkap dengan: siapa mengubah, dari shift apa ke shift apa, dan kapan.'],
                    ].map(([title, desc], i) => (
                        <div key={i} className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                            <p className="font-semibold text-blue-800 text-xs">💡 {title}</p>
                            <p className="text-blue-700 text-xs mt-0.5">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GuideShift;

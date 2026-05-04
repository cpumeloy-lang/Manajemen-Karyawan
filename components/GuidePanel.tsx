import React, { useState } from 'react';

type Tab = 'overview' | 'attendance' | 'face' | 'hikvision' | 'employee' | 'nik' | 'shift' | 'kepala' | 'payroll';

interface Section {
    title: string;
    icon: string;
    content: React.ReactNode;
}

const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = 'blue' }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        yellow: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-700',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.blue}`}>
            {text}
        </span>
    );
};

const Step: React.FC<{ no: number; title: string; children: React.ReactNode }> = ({ no, title, children }) => (
    <div className="flex gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#06736a] text-white text-sm font-bold flex items-center justify-center mt-0.5">
            {no}
        </div>
        <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>
            <div className="text-sm text-gray-600 space-y-1">{children}</div>
        </div>
    </div>
);

const InfoBox: React.FC<{ type?: 'info' | 'warning' | 'success'; children: React.ReactNode }> = ({ type = 'info', children }) => {
    const styles = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-green-50 border-green-200 text-green-800',
    };
    const icons = { info: 'ℹ️', warning: '⚠️', success: '✅' };
    return (
        <div className={`rounded-xl border px-4 py-3 text-sm flex gap-2 ${styles[type]}`}>
            <span>{icons[type]}</span>
            <div>{children}</div>
        </div>
    );
};

const Code: React.FC<{ children: string }> = ({ children }) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
);

const sections: Record<Tab, Section> = {
    overview: {
        title: 'Ringkasan Sistem',
        icon: '🏠',
        content: (
            <div className="space-y-5">
                <p className="text-gray-600 text-sm">HRMS Pro adalah sistem manajemen SDM terpadu untuk rumah sakit dan klinik. Berikut fitur utama yang tersedia:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { icon: '👥', title: 'Manajemen Karyawan', desc: 'Data karyawan, profil, dokumen, verifikasi HRD', role: 'Admin / HRD', color: 'blue' },
                        { icon: '⏰', title: 'Absensi & Kehadiran', desc: 'Live monitoring, laporan, absensi manual & biometrik', role: 'Admin / HRD', color: 'green' },
                        { icon: '💰', title: 'Penggajian', desc: 'Hitung gaji, slip gaji, tunjangan & potongan', role: 'Admin / HRD', color: 'purple' },
                        { icon: '📋', title: 'Permohonan', desc: 'Cuti, reimbursement, persetujuan & penolakan', role: 'Admin / HRD', color: 'yellow' },
                        { icon: '📷', title: 'Face Recognition', desc: 'Enrollment wajah, verifikasi saat absensi', role: 'Karyawan', color: 'blue' },
                        { icon: '📡', title: 'Mesin Absensi', desc: 'Integrasi Hikvision DS-K1T321MFX via ISAPI', role: 'Admin', color: 'green' },
                        { icon: '🏢', title: 'ESS (Self Service)', desc: 'Check-in/out mandiri, lihat slip gaji, ajukan permohonan', role: 'Karyawan', color: 'purple' },
                        { icon: '📝', title: 'Audit Log', desc: 'Riwayat semua aksi pengguna di sistem', role: 'Admin', color: 'yellow' },
                    ].map((f, i) => (
                        <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex gap-3">
                            <span className="text-2xl">{f.icon}</span>
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                                <Badge text={f.role} color={f.color} />
                            </div>
                        </div>
                    ))}
                </div>
                <InfoBox type="info">
                    Panduan detail tersedia di tab masing-masing fitur di sebelah kiri.
                </InfoBox>
            </div>
        ),
    },

    employee: {
        title: 'Manajemen Karyawan',
        icon: '👥',
        content: (
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
        ),
    },

    attendance: {
        title: 'Manajemen Absensi',
        icon: '⏰',
        content: (
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

                    {/* Recalculate Metrics Section */}
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
        ),
    },

    payroll: {
        title: 'Konfigurasi Penggajian',
        icon: '💰',
        content: (
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
        ),
    },

    face: {
        title: 'Face Recognition',
        icon: '👤',
        content: (
            <div className="space-y-5">
                <InfoBox type="info">
                    Face Recognition digunakan untuk verifikasi identitas karyawan saat absensi via Web ESS. Karyawan harus mendaftarkan wajah <strong>satu kali</strong> sebelum bisa absensi.
                </InfoBox>
                <div className="space-y-4">
                    <h4 className="font-bold text-gray-800">📌 Alur Face Recognition</h4>
                    <div className="space-y-3">
                        <Step no={1} title="Enrollment (Pendaftaran Wajah)">
                            <p>Karyawan masuk ke <strong>ESS → Tab Profil → Enroll Face Recognition</strong>.</p>
                            <p>Kamera terbuka, wajah difoto, dan <em>face descriptor</em> (128 angka unik) disimpan ke database.</p>
                            <InfoBox type="warning">Enrollment hanya perlu dilakukan <strong>1 kali</strong>. Jika wajah berubah drastis (operasi, dll), perlu enroll ulang.</InfoBox>
                        </Step>
                        <Step no={2} title="Verifikasi Saat Absensi">
                            <p>Karyawan klik Check-In di ESS:</p>
                            <ul className="list-disc list-inside space-y-1 pl-2">
                                <li>Sistem cek GPS (geofencing)</li>
                                <li>Kamera terbuka, deteksi wajah</li>
                                <li>Liveness check (pastikan bukan foto)</li>
                                <li>Bandingkan wajah dengan data enrollment</li>
                                <li>Jika cocok ≥ 60% → absensi berhasil</li>
                            </ul>
                        </Step>
                    </div>
                    <InfoBox type="warning">
                        <strong>Jika karyawan belum enroll:</strong> Sistem otomatis menolak Check-In dan membuka form enrollment.
                    </InfoBox>
                    <h4 className="font-bold text-gray-800">⚙️ Troubleshooting Face Detection</h4>
                    <div className="space-y-2 text-sm">
                        {[
                            ['❌ No Face terdeteksi', 'Pencahayaan kurang / terlalu gelap — pastikan cahaya dari depan wajah'],
                            ['❌ Model belum loaded', 'Tunggu status "✅ Model Ready" di atas video'],
                            ['❌ Verifikasi gagal', 'Posisi wajah kurang ideal — hadap lurus ke kamera, jarak 30-50cm'],
                            ['❌ Liveness gagal', 'Sistem mendeteksi foto/video — gunakan wajah asli live'],
                        ].map(([err, fix], i) => (
                            <div key={i} className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                                <p className="font-medium text-red-700 text-xs">{err}</p>
                                <p className="text-gray-600 text-xs mt-0.5">→ {fix}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        ),
    },

    hikvision: {
        title: 'Mesin Absensi Hikvision',
        icon: '📡',
        content: (
            <div className="space-y-5">
                <InfoBox type="info">
                    HRMS Pro dapat terhubung ke mesin absensi <strong>Hikvision DS-K1T321MFX</strong> melalui protokol ISAPI untuk sinkronisasi data absensi secara otomatis.
                </InfoBox>
                <div className="space-y-4">
                    <h4 className="font-bold text-gray-800">🔧 Konfigurasi di Device Hikvision</h4>
                    <div className="space-y-3">
                        <Step no={1} title="Atur IP Statis Device">
                            <p>Di layar device: <strong>Menu → Communication → Network Settings</strong></p>
                            <p>Set IP statis, subnet mask, dan gateway sesuai jaringan LAN rumah sakit.</p>
                            <InfoBox type="warning">Device dan komputer server HRMS Pro harus dalam <strong>jaringan LAN yang sama</strong>.</InfoBox>
                        </Step>
                        <Step no={2} title="Aktifkan ISAPI">
                            <p>Di layar device: <strong>Menu → Communication → Open API</strong></p>
                            <p>Set <strong>Enable ISAPI = ON</strong></p>
                        </Step>
                        <Step no={3} title="Catat Password Admin Device">
                            <p>Di layar device: <strong>Menu → System → User Management</strong></p>
                            <p>Catat username dan password admin — ini yang dimasukkan ke pengaturan HRMS Pro.</p>
                        </Step>
                        <Step no={4} title="Set Waktu Device">
                            <p>Di layar device: <strong>Menu → System → Time Settings</strong></p>
                            <p>Timezone: <Code>WIB (UTC+7)</Code> — waktu yang salah berakibat timestamp absensi salah.</p>
                        </Step>
                        <Step no={5} title="Daftarkan Karyawan di Device">
                            <p>Di layar device: <strong>Menu → User Management → Add User</strong></p>
                            <p><strong>Employee No</strong> = NIK karyawan di HRMS Pro (contoh: <Code>20240001</Code>)</p>
                            <p>Daftarkan wajah karyawan langsung di device.</p>
                        </Step>
                    </div>
                    <h4 className="font-bold text-gray-800 pt-2">⚙️ Konfigurasi di HRMS Pro</h4>
                    <p className="text-sm text-gray-600">Masuk ke <strong>Pengaturan Sistem → panel Hikvision DS-K1T321MFX</strong>, isi form:</p>
                    <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
                        {[
                            ['IP Address Device', '192.168.1.100', 'IP statis yang diset di device'],
                            ['Port', '80', 'Port HTTP default'],
                            ['Username', 'admin', 'Username admin device'],
                            ['Password', '••••••', 'Password admin device'],
                            ['Nama Lokasi', 'Kantor Utama', 'Tampil di field lokasi absensi'],
                            ['Interval Sync', '5 menit', 'Seberapa sering data ditarik dari device'],
                        ].map(([field, val, desc], i) => (
                            <div key={i} className="grid grid-cols-3 px-3 py-2 border-b border-gray-50 last:border-0">
                                <span className="font-medium text-gray-700">{field}</span>
                                <Code>{val}</Code>
                                <span className="text-gray-500 text-right">{desc}</span>
                            </div>
                        ))}
                    </div>
                    <h4 className="font-bold text-gray-800 pt-2">▶️ Cara Menggunakan</h4>
                    <div className="space-y-3">
                        <Step no={1} title="Test Koneksi">
                            <p>Klik tombol <strong>🔌 Test Koneksi</strong> — status harus hijau "Terhubung".</p>
                        </Step>
                        <Step no={2} title="Sync Manual (pertama kali)">
                            <p>Klik <strong>🔄 Sync Manual (24 jam)</strong> untuk tarik semua data absensi 24 jam terakhir.</p>
                        </Step>
                        <Step no={3} title="Aktifkan Auto-Sync">
                            <p>Toggle <strong>Auto-Sync Otomatis</strong> = ON agar data masuk otomatis setiap N menit.</p>
                            <p>Data akan muncul di <strong>Kehadiran (Live)</strong> dan <strong>Laporan Kehadiran</strong> tanpa refresh manual.</p>
                        </Step>
                    </div>
                </div>
            </div>
        ),
    },

    shift: {
        title: 'Manajemen Jadwal Shift',
        icon: '📅',
        content: (
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
        ),
    },

    kepala: {
        title: 'Dashboard Kepala Ruangan',
        icon: '👨‍💼',
        content: (
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
        ),
    },

    nik: {
        title: 'Setup NIK Karyawan',
        icon: '🔢',
        content: (
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
        ),
    },
};

const GuidePanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'overview', label: 'Ringkasan', icon: '🏠' },
        { key: 'employee', label: 'Karyawan', icon: '👥' },
        { key: 'attendance', label: 'Absensi', icon: '⏰' },
        { key: 'face', label: 'Face Recognition', icon: '👤' },
        { key: 'hikvision', label: 'Mesin Absensi', icon: '📡' },
        { key: 'nik', label: 'Setup NIK', icon: '🔢' },
        { key: 'shift', label: 'Jadwal Shift', icon: '📅' },
        { key: 'kepala', label: 'Kepala Ruangan', icon: '👨‍💼' },
        { key: 'payroll', label: 'Penggajian', icon: '💰' },
    ];

    const current = sections[activeTab];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#06736a]/10 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#06736a] flex items-center justify-center text-white text-xl">📚</div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Panduan HRMS Pro</h2>
                        <p className="text-sm text-gray-500">Panduan penggunaan fitur untuk Admin, HRD, dan Kepala Ruangan</p>
                    </div>
                </div>
            </div>

            <div className="flex min-h-[600px]">
                {/* Sidebar tabs */}
                <div className="w-48 border-r border-gray-100 bg-gray-50 p-3 space-y-1 flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? 'bg-[#06736a] text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-white hover:shadow-sm'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="leading-tight">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>{current.icon}</span> {current.title}
                    </h3>
                    {current.content}
                </div>
            </div>
        </div>
    );
};

export default GuidePanel;

import React from 'react';
import { Step, InfoBox, Code } from './GuideComponents';

const GuideHikvision: React.FC = () => {
    return (
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
    );
};

export default GuideHikvision;

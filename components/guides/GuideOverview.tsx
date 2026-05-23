import React from 'react';
import { Badge, InfoBox } from './GuideComponents';

const GuideOverview: React.FC = () => {
    return (
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
    );
};

export default GuideOverview;

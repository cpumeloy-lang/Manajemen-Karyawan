import React from 'react';
import { Step, InfoBox } from './GuideComponents';

const GuideFaceRecognition: React.FC = () => {
    return (
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
    );
};

export default GuideFaceRecognition;

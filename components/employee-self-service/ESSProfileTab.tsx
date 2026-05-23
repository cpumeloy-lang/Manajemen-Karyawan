import React from 'react';
import { Employee } from '../../types';

interface ESSProfileTabProps {
    user: Employee;
    onEditProfile?: () => void;
    setIsFaceEnrollmentOpen: (isOpen: boolean) => void;
}

const ESSProfileTab: React.FC<ESSProfileTabProps> = ({ user, onEditProfile, setIsFaceEnrollmentOpen }) => {
    return (
        <div className="space-y-6">
            {/* Status Banner */}
            {user.isLocked && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-sm text-red-700">
                        🔒 Profil Anda telah dikunci oleh HRD. Jika ada perubahan data yang perlu dilakukan, silakan hubungi HRD.
                    </p>
                </div>
            )}
            
            {!user.isProfileCompleted && !user.isLocked && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <p className="text-sm text-yellow-700">
                        ⚠️ Profil Anda belum lengkap. Silakan lengkapi data profil Anda untuk verifikasi HRD.
                    </p>
                </div>
            )}
            
            {user.isProfileCompleted && !user.isVerified && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p className="text-sm text-blue-700">
                        ℹ️ Profil Anda sedang menunggu verifikasi HRD.
                    </p>
                </div>
            )}
            
            {user.isVerified && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <p className="text-sm text-green-700">
                        ✓ Profil Anda telah diverifikasi oleh HRD pada {user.verifiedAt ? new Date(user.verifiedAt).toLocaleDateString('id-ID') : '-'}.
                    </p>
                </div>
            )}
            
            {/* Data Profil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Data Pribadi */}
                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Data Pribadi</h3>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-gray-600">NIK:</span> <span className="font-medium">{user.nik || '-'}</span></div>
                        <div><span className="text-gray-600">No. KTP:</span> <span className="font-medium">{user.ktpNumber || '-'}</span></div>
                        <div><span className="text-gray-600">NPWP:</span> <span className="font-medium">{user.npwp || '-'}</span></div>
                        <div><span className="text-gray-600">Tanggal Lahir:</span> <span className="font-medium">{user.birthDate ? new Date(user.birthDate).toLocaleDateString('id-ID') : '-'}</span></div>
                        <div><span className="text-gray-600">Agama:</span> <span className="font-medium">{user.agama || '-'}</span></div>
                        <div><span className="text-gray-600">Status Pernikahan:</span> <span className="font-medium">{user.maritalStatus || '-'}</span></div>
                        <div><span className="text-gray-600">Tanggungan:</span> <span className="font-medium">{user.dependents || 0}</span></div>
                    </div>
                </div>
                
                {/* Kontak */}
                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Kontak</h3>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-gray-600">Email:</span> <span className="font-medium">{user.email}</span></div>
                        <div><span className="text-gray-600">Telepon:</span> <span className="font-medium">{user.telepon || '-'}</span></div>
                        <div><span className="text-gray-600">Alamat KTP:</span> <span className="font-medium">{user.address?.ktp || '-'}</span></div>
                        <div><span className="text-gray-600">Alamat Domisili:</span> <span className="font-medium">{user.address?.domisili || '-'}</span></div>
                    </div>
                </div>
                
                {/* Kepegawaian */}
                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">Data Kepegawaian</h3>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-gray-600">Jabatan:</span> <span className="font-medium">{user.jabatan}</span></div>
                        <div><span className="text-gray-600">Departemen:</span> <span className="font-medium">{user.departemen}</span></div>
                        <div><span className="text-gray-600">Tanggal Masuk:</span> <span className="font-medium">{new Date(user.hireDate).toLocaleDateString('id-ID')}</span></div>
                        <div><span className="text-gray-600">Status:</span> <span className="font-medium">{user.status}</span></div>
                        <div><span className="text-gray-600">Shift:</span> <span className="font-medium">{user.shift}</span></div>
                    </div>
                </div>
                
                {/* BPJS */}
                <div className="rounded-2xl bg-gray-50 p-4 sm:p-6">
                    <h3 className="text-lg font-bold text-[#06736a] mb-4">BPJS & Bank</h3>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-gray-600">BPJS Kesehatan:</span> <span className="font-medium">{user.bpjsKesehatan || '-'}</span></div>
                        <div><span className="text-gray-600">BPJS Ketenagakerjaan:</span> <span className="font-medium">{user.bpjsKetenagakerjaan || '-'}</span></div>
                        <div><span className="text-gray-600">Bank:</span> <span className="font-medium">{user.bankAccount?.bankName || '-'}</span></div>
                        <div><span className="text-gray-600">No. Rekening:</span> <span className="font-medium">{user.bankAccount?.accountNumber || '-'}</span></div>
                        <div><span className="text-gray-600">Nama Pemegang:</span> <span className="font-medium">{user.bankAccount?.accountHolder || '-'}</span></div>
                    </div>
                </div>
            </div>
            
            {/* Tombol Edit Profil */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:pt-4">
                <button
                    onClick={onEditProfile}
                    disabled={user.isLocked}
                    className={`w-full rounded-2xl px-6 py-4 font-medium transition-colors sm:w-auto ${
                        user.isLocked
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#06736a] text-white hover:bg-[#054f46]'
                    }`}
                >
                    {user.isLocked ? '🔒 Profil Terkunci' : '✏️ Lengkapi/Edit Profil'}
                </button>
                
                <button
                    onClick={() => setIsFaceEnrollmentOpen(true)}
                    className="w-full rounded-2xl px-6 py-4 font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                    👤 Enroll Face Recognition
                </button>
            </div>
        </div>
    );
};

export default ESSProfileTab;

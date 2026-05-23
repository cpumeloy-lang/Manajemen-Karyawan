import React, { useState } from 'react';
import { Employee, WorkUnit } from '../../types.ts';
import { useEmployeeCRUD } from '../../hooks/useEmployeeCRUD.ts';

const DetailItem: React.FC<{ label: string; value?: string | number | null; isCurrency?: boolean }> = ({ label, value, isCurrency }) => (
    <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-800">
            {isCurrency && typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : (value || '-')}
        </p>
    </div>
);

interface DetailTabProps {
    employee: Employee;
    workUnit?: WorkUnit;
}

const DetailTab: React.FC<DetailTabProps> = ({ employee, workUnit }) => {
    const { handleResetPasswordByHR } = useEmployeeCRUD();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const closePasswordModal = () => {
        if (isSubmitting) return;
        setIsPasswordModalOpen(false);
        setNewPassword('');
    };

    const submitPasswordReset = async () => {
        const password = newPassword.trim();
        if (password.length < 6) {
            return;
        }

        setIsSubmitting(true);
        const success = await handleResetPasswordByHR(employee.id, password);
        setIsSubmitting(false);

        if (success) {
            closePasswordModal();
        }
    };

    return (
        <div className="space-y-6">
            {/* Informasi Pribadi */}
            <div>
                <h4 className="font-semibold text-primary mb-3 text-lg">Informasi Pribadi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                    <DetailItem label="Email" value={employee.email} />
                    <DetailItem label="Telepon" value={employee.telepon} />
                    <DetailItem label="Tanggal Lahir" value={employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('id-ID') : '-'} />
                    <DetailItem label="No. KTP" value={employee.ktpNumber} />
                    <DetailItem label="Alamat KTP" value={employee.address?.ktp} />
                    <DetailItem label="Agama" value={employee.agama} />
                    <DetailItem label="Status Pernikahan" value={employee.maritalStatus} />
                </div>
            </div>

            {/* Informasi Pekerjaan */}
            <div>
                <h4 className="font-semibold text-primary mb-3 text-lg">Informasi Pekerjaan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                    <DetailItem label="Jabatan" value={employee.jabatan} />
                    <DetailItem label="Departemen" value={employee.departemen} />
                    <DetailItem label="Unit Kerja" value={workUnit?.nama} />
                    <DetailItem label="Tanggal Masuk" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('id-ID') : '-'} />
                    <DetailItem label="Status Karyawan" value={employee.status} />
                    <DetailItem label="Shift" value={employee.shift} />
                    <DetailItem label="Sisa Cuti" value={`${employee.sisaCuti || 0} hari`} />
                </div>
            </div>

            {/* Informasi Profesional (untuk tenaga medis) */}
            {(employee.spesialisasi || employee.nomorSTR) && (
                <div>
                    <h4 className="font-semibold text-primary mb-3 text-lg">Informasi Profesional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                        <DetailItem label="Spesialisasi" value={employee.spesialisasi} />
                        <DetailItem label="Kredensial" value={employee.kredensial} />
                        <DetailItem label="Nomor STR" value={employee.nomorSTR} />
                        <DetailItem label="STR Kedaluwarsa" value={employee.tanggalKadaluarsaSTR ? new Date(employee.tanggalKadaluarsaSTR).toLocaleDateString('id-ID') : '-'} />
                    </div>
                    {(employee.sertifikasi || employee.kompetensi) && (
                        <div className="mt-3 space-y-2">
                            {employee.sertifikasi && employee.sertifikasi.length > 0 && (
                                <p className="text-sm text-gray-600">
                                    <strong>Sertifikasi:</strong> {employee.sertifikasi.join(', ')}
                                </p>
                            )}
                            {employee.kompetensi && employee.kompetensi.length > 0 && (
                                <p className="text-sm text-gray-600">
                                    <strong>Kompetensi:</strong> {employee.kompetensi.join(', ')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Alamat Domisili */}
            {(employee.address?.domisili || employee.address?.city) && (
                <div>
                    <h4 className="font-semibold text-primary mb-3 text-lg">Alamat Domisili</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                        <DetailItem label="Alamat Domisili" value={employee.address?.domisili} />
                        <DetailItem label="Provinsi" value={employee.address?.province} />
                        <DetailItem label="Kota/Kabupaten" value={employee.address?.city} />
                        <DetailItem label="Kode Pos" value={employee.address?.postalCode} />
                    </div>
                </div>
            )}

            {/* Pendidikan */}
            {employee.education && Array.isArray(employee.education) && employee.education.length > 0 && (
                <div>
                    <h4 className="font-semibold text-primary mb-3 text-lg">Riwayat Pendidikan</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        {employee.education.map((edu: any, idx: number) => (
                            <div key={idx} className="border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                                <p className="font-medium text-gray-800">{edu.degree || '-'} - {edu.major || '-'}</p>
                                <p className="text-sm text-gray-600">{edu.institution || '-'}</p>
                                <p className="text-xs text-gray-500">{edu.startYear || '-'} – {edu.endYear || 'Sekarang'}{edu.gpa ? ` · IPK ${edu.gpa}` : ''}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* BPJS & Perbankan */}
            <div>
                <h4 className="font-semibold text-primary mb-3 text-lg">BPJS & Perbankan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                    <DetailItem label="NPWP" value={employee.npwp} />
                    <DetailItem label="BPJS Kesehatan" value={employee.bpjsKesehatan} />
                    <DetailItem label="BPJS Ketenagakerjaan" value={employee.bpjsKetenagakerjaan} />
                    {employee.bankAccount && typeof employee.bankAccount === 'object' ? (
                        <div>
                            <p className="text-sm text-gray-500">Rekening Bank</p>
                            <p className="font-medium text-gray-800">
                                {employee.bankAccount.bankName || '-'} - {employee.bankAccount.accountNumber || '-'}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">a.n. {employee.bankAccount.accountHolder || '-'}</p>
                        </div>
                    ) : (
                        <DetailItem label="Rekening Bank" value="-" />
                    )}
                </div>
            </div>

            {/* Kontak Darurat */}
            {employee.emergencyContacts && Array.isArray(employee.emergencyContacts) && employee.emergencyContacts.length > 0 && (
                <div>
                    <h4 className="font-semibold text-primary mb-3 text-lg">Kontak Darurat</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        {employee.emergencyContacts.map((contact: any, idx: number) => (
                            <div key={idx} className="border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                                <p className="font-medium text-gray-800">{contact.name || '-'} ({contact.relationship || '-'})</p>
                                <p className="text-sm text-gray-600">{contact.phone || '-'}</p>
                                {contact.address && <p className="text-sm text-gray-500">{contact.address}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Riwayat Pekerjaan */}
            {employee.workHistory && Array.isArray(employee.workHistory) && employee.workHistory.length > 0 && (
                <div>
                    <h4 className="font-semibold text-primary mb-3 text-lg">Riwayat Pekerjaan</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        {employee.workHistory.map((work: any, idx: number) => (
                            <div key={idx} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                                <p className="font-medium text-gray-800">{work.position || '-'}</p>
                                <p className="text-sm text-gray-600">{work.company || '-'}</p>
                                <p className="text-xs text-gray-500">
                                    {work.startDate || '-'} - {work.endDate || 'Sekarang'}
                                    {work.duration && ` (${work.duration})`}
                                </p>
                                {work.responsibilities && <p className="text-sm text-gray-600 mt-1">{work.responsibilities}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {employee.user_id && (
            <div className="pt-4 mt-6 border-t border-gray-200">
                 <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
                    <div>
                        <h4 className="font-semibold text-red-800 text-sm">Manajemen Akun Login</h4>
                        <p className="text-xs text-red-600 mt-1">Gunakan fitur ini jika karyawan lupa password. Password akan langsung diganti lokalan The HR tidak perlu akses dasboard.</p>
                    </div>
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        Reset Password Karyawan
                    </button>
                 </div>
            </div>
            )}

            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">Reset Password Karyawan</h3>
                            <p className="mt-1 text-sm text-gray-600">Masukkan password baru untuk {employee.nama}.</p>
                        </div>

                        <div className="space-y-4 px-6 py-5">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Password Baru</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-[#06736a] focus:outline-none focus:ring-2 focus:ring-[#06736a]/20"
                                    placeholder="Minimal 6 karakter"
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </div>

                            <p className="text-xs text-gray-500">
                                Password akan langsung diupdate untuk akun login karyawan ini.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                            <button
                                type="button"
                                onClick={closePasswordModal}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
                                disabled={isSubmitting}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={submitPasswordReset}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isSubmitting || newPassword.trim().length < 6}
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailTab;

import React, { useState } from 'react';
import { Employee, WorkUnit, AttendanceRecord, Document } from '../types.ts';
import { XMarkIcon, PaperClipIcon, DocumentTextIcon, ClockIcon, CurrencyDollarIcon } from './icons.tsx';
import { useEmployeeCRUD } from '../hooks/useEmployeeCRUD.ts';

interface EmployeeDetailProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    workUnit?: WorkUnit;
    attendanceRecords: AttendanceRecord[];
    onOpenAttendanceDetail?: () => void;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({ isOpen, onClose, employee, workUnit, attendanceRecords, onOpenAttendanceDetail }) => {
    const [activeTab, setActiveTab] = useState('detail');
    const { handleResetPasswordByHR } = useEmployeeCRUD();

    if (!isOpen) return null;
    if (!employee) {
        console.error('❌ EmployeeDetail: employee is null or undefined');
        return null;
    }

    const DetailItem: React.FC<{ label: string; value?: string | number | null; isCurrency?: boolean }> = ({ label, value, isCurrency }) => (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-medium text-gray-800">
                {isCurrency && typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : (value || '-')}
            </p>
        </div>
    );

    const TabButton: React.FC<{ tabName: string; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === tabName ? 'bg-[#e6f3f2] text-[#06736a]' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const sortedAttendance = [...attendanceRecords].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const attendanceSummary = {
        total: sortedAttendance.length,
        late: sortedAttendance.filter((rec) => rec.isLate).length,
        overtime: Number(sortedAttendance.reduce((sum, rec) => sum + (rec.overtimeHours || 0), 0).toFixed(2)),
        latestDate: sortedAttendance[0]?.tanggal || null,
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dokumen':
                return (
                     <div>
                        <h4 className="font-semibold text-primary mb-2 text-lg">Dokumen Terlampir</h4>
                        {employee.documents && employee.documents.length > 0 ? (
                             <ul className="space-y-3">
                                {employee.documents.map(doc => (
                                     <li key={doc.id} className="text-sm p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-800">{doc.name}</p>
                                            <p className="text-gray-500">Tipe: {doc.type} | Diunggah: {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}</p>
                                        </div>
                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                            Lihat Dokumen
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 mt-4">Tidak ada dokumen yang dilampirkan.</p>
                        )}
                    </div>
                );
            case 'kehadiran':
                return (
                    <div>
                        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Riwayat</p>
                                <p className="mt-1 text-xl font-bold text-emerald-900">{attendanceSummary.total}</p>
                            </div>
                            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Terlambat</p>
                                <p className="mt-1 text-xl font-bold text-amber-900">{attendanceSummary.late}</p>
                            </div>
                            <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Total Lembur</p>
                                <p className="mt-1 text-xl font-bold text-sky-900">{attendanceSummary.overtime} jam</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-primary text-lg">Riwayat Kehadiran Seluruh Periode</h4>
                            <div className="flex items-center gap-3">
                                {attendanceSummary.latestDate && (
                                    <p className="text-xs text-gray-500">Update terakhir: {new Date(attendanceSummary.latestDate).toLocaleDateString('id-ID')}</p>
                                )}
                                {onOpenAttendanceDetail && (
                                    <button
                                        type="button"
                                        onClick={onOpenAttendanceDetail}
                                        className="rounded-md border border-[#06736a]/30 px-3 py-1.5 text-xs font-semibold text-[#06736a] hover:bg-[#e6f3f2]"
                                    >
                                        Buka Detail Absensi Lengkap
                                    </button>
                                )}
                            </div>
                        </div>

                        {sortedAttendance.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Masuk</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pulang</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lembur</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedAttendance.map(rec => (
                                            <tr key={rec.id}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(rec.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td className={`px-4 py-2 whitespace-nowrap text-sm ${rec.isLate ? 'text-red-600 font-semibold' : ''}`}>{rec.clockIn}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{rec.clockOut}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">{rec.overtimeHours} jam</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                    {rec.isLate ? (
                                                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Terlambat</span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Tepat Waktu</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                             <p className="text-sm text-gray-500 mt-4">Tidak ada riwayat kehadiran.</p>
                        )}
                    </div>
                );
            case 'kompensasi':
                 return (
                    <div>
                        <h4 className="font-semibold text-primary mb-4 text-lg">Informasi Kompensasi</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg">
                            <DetailItem label="Gaji Pokok" value={employee.compensation?.gajiPokok} isCurrency />
                            <DetailItem label="Tunjangan Profesi" value={employee.compensation?.tunjanganProfesi} isCurrency />
                        </div>
                    </div>
                );
            default:
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
                                <DetailItem label="Alamat KTP" value={employee.alamat} />
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
                                    onClick={() => handleResetPasswordByHR(employee.id)}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                                >
                                    Reset Password Karyawan
                                </button>
                             </div>
                        </div>
                        )}
                    </div>
                );
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-lg">
                    <div className="flex items-center gap-4">
                        <img
                            className="h-16 w-16 rounded-full object-cover"
                            src={employee.foto || `https://ui-avatars.com/api/?name=${employee.nama.replace(/\s/g, '+')}&background=random`}
                            alt={employee.nama}
                        />
                        <div>
                            <h2 className="text-xl font-bold text-primary">{employee.nama} {employee.kredensial && <span className="text-base font-normal text-gray-600">{employee.kredensial}</span>}</h2>
                             <p className="text-sm text-gray-600">{employee.jabatan} - {employee.departemen}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        title="Tutup detail karyawan"
                        aria-label="Tutup detail karyawan"
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div className="border-b pb-4">
                        <div className="flex items-center gap-2">
                           <TabButton tabName="detail" label="Detail" icon={<DocumentTextIcon className="w-5 h-5" />} />
                           <TabButton tabName="dokumen" label="Dokumen" icon={<PaperClipIcon className="w-5 h-5" />} />
                           <TabButton tabName="kehadiran" label="Kehadiran" icon={<ClockIcon className="w-5 h-5" />} />
                           <TabButton tabName="kompensasi" label="Kompensasi" icon={<CurrencyDollarIcon className="w-5 h-5" />} />
                        </div>
                    </div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;

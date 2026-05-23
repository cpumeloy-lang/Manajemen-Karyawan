import React from 'react';
import { Employee, Education, WorkHistory, EducationLevel } from '../../types';
import { PlusIcon } from '../icons';

interface ProfessionalInfoTabProps {
    employee: Employee;
    handleAddEducation: () => void;
    handleUpdateEducation: (index: number, field: keyof Education, value: any) => void;
    handleDeleteEducation: (index: number) => void;
    handleAddWorkHistory: () => void;
    handleUpdateWorkHistory: (index: number, field: keyof WorkHistory, value: string) => void;
    handleDeleteWorkHistory: (index: number) => void;
}

const ProfessionalInfoTab: React.FC<ProfessionalInfoTabProps> = ({
    employee,
    handleAddEducation,
    handleUpdateEducation,
    handleDeleteEducation,
    handleAddWorkHistory,
    handleUpdateWorkHistory,
    handleDeleteWorkHistory,
}) => {
    return (
        <div className="space-y-6">
            {/* Education History */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-[#06736a]">Riwayat Pendidikan</h3>
                    <button 
                        type="button" 
                        onClick={handleAddEducation} 
                        className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Tambah Pendidikan
                    </button>
                </div>

                {(employee.education || []).map((edu, index) => (
                    <div key={edu.id} className="p-4 bg-white border rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Pendidikan #{index + 1}</h4>
                            <button 
                                type="button" 
                                onClick={() => handleDeleteEducation(index)} 
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                Hapus
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Jenjang</label>
                                <select 
                                    value={edu.level} 
                                    onChange={(e) => handleUpdateEducation(index, 'level', e.target.value as EducationLevel)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    title="Pilih jenjang pendidikan"
                                >
                                    <option value="SMA">SMA</option>
                                    <option value="D3">D3</option>
                                    <option value="S1">S1</option>
                                    <option value="S2">S2</option>
                                    <option value="S3">S3</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Institusi</label>
                                <input 
                                    type="text" 
                                    value={edu.institution} 
                                    onChange={(e) => handleUpdateEducation(index, 'institution', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Nama universitas/sekolah"
                                    title="Nama institusi pendidikan"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Jurusan</label>
                                <input 
                                    type="text" 
                                    value={edu.major} 
                                    onChange={(e) => handleUpdateEducation(index, 'major', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Program studi"
                                    title="Nama jurusan atau program studi"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Lulus</label>
                                <input 
                                    type="number" 
                                    value={edu.graduationYear} 
                                    onChange={(e) => handleUpdateEducation(index, 'graduationYear', parseInt(e.target.value))} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    min="1950"
                                    max="2100"
                                    title="Tahun lulus pendidikan"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">IPK (opsional)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={edu.gpa || ''} 
                                    onChange={(e) => handleUpdateEducation(index, 'gpa', parseFloat(e.target.value) || undefined)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    min="0"
                                    max="4"
                                    placeholder="0.00 - 4.00"
                                    title="IPK atau GPA pendidikan"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {(!employee.education || employee.education.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Belum ada riwayat pendidikan.</p>
                        <p className="text-xs mt-1">Klik "Tambah Pendidikan" untuk menambahkan</p>
                    </div>
                )}
            </div>

            {/* Work History */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-[#06736a]">Riwayat Pekerjaan</h3>
                    <button 
                        type="button" 
                        onClick={handleAddWorkHistory} 
                        className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Tambah Riwayat
                    </button>
                </div>

                {(employee.workHistory || []).map((work, index) => (
                    <div key={work.id} className="p-4 bg-white border rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Pekerjaan #{index + 1}</h4>
                            <button 
                                type="button" 
                                onClick={() => handleDeleteWorkHistory(index)} 
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                Hapus
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                                <input 
                                    type="text" 
                                    value={work.company} 
                                    onChange={(e) => handleUpdateWorkHistory(index, 'company', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="PT. ABC"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Posisi</label>
                                <input 
                                    type="text" 
                                    value={work.position} 
                                    onChange={(e) => handleUpdateWorkHistory(index, 'position', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Staff/Manager/etc"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                                <input 
                                    type="date" 
                                    value={work.startDate} 
                                    onChange={(e) => handleUpdateWorkHistory(index, 'startDate', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    title="Tanggal mulai bekerja"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                                <input 
                                    type="date" 
                                    value={work.endDate} 
                                    onChange={(e) => handleUpdateWorkHistory(index, 'endDate', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    title="Tanggal selesai bekerja"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Alasan Berhenti</label>
                                <input 
                                    type="text" 
                                    value={work.reasonLeaving} 
                                    onChange={(e) => handleUpdateWorkHistory(index, 'reasonLeaving', e.target.value)} 
                                    className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Alasan resign/kontrak habis/etc"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {(!employee.workHistory || employee.workHistory.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Belum ada riwayat pekerjaan.</p>
                        <p className="text-xs mt-1">Klik "Tambah Riwayat" untuk menambahkan</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessionalInfoTab;

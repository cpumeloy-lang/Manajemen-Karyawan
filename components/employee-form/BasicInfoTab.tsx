import React from 'react';
import { Employee, Role } from '../../types';

interface BasicInfoTabProps {
    employee: Employee;
    employeeToEdit: Employee | null;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    isAdmin: boolean;
    handleGenerateNIK: () => void;
    errors: Record<string, string>;
    password?: string;
    setPassword?: (pwd: string) => void;
    showPasswordReset?: boolean;
    setShowPasswordReset?: (val: boolean) => void;
    newPassword?: string;
    setNewPassword?: (pwd: string) => void;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
    employee,
    employeeToEdit,
    handleChange,
    isAdmin,
    handleGenerateNIK,
    errors,
    password = '',
    setPassword,
    showPasswordReset = false,
    setShowPasswordReset,
    newPassword = '',
    setNewPassword,
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informasi Dasar */}
                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                    <h3 className="font-semibold text-lg text-[#06736a]">Informasi Dasar</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
                        <input 
                            type="text" 
                            name="nama" 
                            value={employee.nama} 
                            onChange={handleChange} 
                            className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.nama ? 'border-red-500' : ''}`}
                            placeholder="Contoh: Dr. John Doe"
                            required
                        />
                        {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NIK (Nomor Induk Karyawan)</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                name="nik"
                                value={employee.nik || ''}
                                onChange={isAdmin ? handleChange : undefined}
                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.nik ? 'border-red-500' : ''}`}
                                placeholder="2024-MED-001"
                                readOnly={!isAdmin}
                            />
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleGenerateNIK}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                                >
                                    Generate NIK
                                </button>
                            )}
                        </div>
                        {errors.nik && <p className="mt-1 text-sm text-red-600">{errors.nik}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kredensial</label>
                        <input 
                            type="text" 
                            name="kredensial" 
                            value={employee.kredensial || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Contoh: Sp.PD, M.Kes"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={employee.email} 
                            onChange={handleChange} 
                            className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.email ? 'border-red-500' : ''}`}
                            placeholder="email@hospital.com"
                            required
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                        <input 
                            type="tel" 
                            name="telepon" 
                            value={employee.telepon || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="081234567890"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Lahir</label>
                        <input 
                            type="date" 
                            name="birthDate" 
                            value={employee.birthDate || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Tanggal lahir karyawan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Foto URL</label>
                        <input 
                            type="text" 
                            name="foto" 
                            value={employee.foto || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="https://..."
                        />
                    </div>
                </div>

                {/* Login & Password */}
                <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                    <h3 className="font-semibold text-lg text-[#06736a]">Login & Password</h3>
                    
                    {!employeeToEdit && setPassword && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.password ? 'border-red-500' : ''}`}
                                placeholder="Minimal 6 karakter"
                                required
                            />
                            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                        </div>
                    )}

                    {employeeToEdit && setShowPasswordReset && setNewPassword && (
                        <div>
                            <button 
                                type="button" 
                                onClick={() => setShowPasswordReset(!showPasswordReset)} 
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {showPasswordReset ? 'Batalkan Reset Password' : 'Reset Password'}
                            </button>
                            {showPasswordReset && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                                    <input 
                                        type="password" 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                        placeholder="Minimal 6 karakter"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select 
                            name="role" 
                            value={employee.role || 'karyawan'} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Pilih role pengguna"
                        >
                       <option value="karyawan">Karyawan</option>
                       <option value="kepala_ruangan">Kepala Ruangan</option>
                       <option value="hrd">HRD</option>
                       <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicInfoTab;

import React from 'react';
import { Employee, Department, Position, WorkUnit, Status } from '../../types';

interface EmploymentInfoTabProps {
    employee: Employee;
    setEmployee: (emp: Employee) => void;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleCompensationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    positions: Position[];
    departments: Department[];
    workUnits: WorkUnit[];
    errors: Record<string, string>;
    sertifikasiInput: string;
    setSertifikasiInput: (val: string) => void;
    kompetensiInput: string;
    setKompetensiInput: (val: string) => void;
}

const EmploymentInfoTab: React.FC<EmploymentInfoTabProps> = ({
    employee,
    setEmployee,
    handleChange,
    handleCompensationChange,
    positions,
    departments,
    workUnits,
    errors,
    sertifikasiInput,
    setSertifikasiInput,
    kompetensiInput,
    setKompetensiInput,
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Informasi Kepegawaian</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Jabatan *</label>
                        <select 
                            name="jabatan" 
                            value={employee.jabatan} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            title="Pilih jabatan"
                        >
                            <option value="">Pilih Jabatan</option>
                            {positions.map(p => <option key={p.id} value={p.nama}>{p.nama}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Departemen *</label>
                        <select 
                            name="departemen" 
                            value={employee.departemen} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            title="Pilih departemen"
                        >
                            <option value="">Pilih Departemen</option>
                            {departments.map(d => <option key={d.id} value={d.nama}>{d.nama}</option>)}
                        </select>
                    </div>

                    {/* Unit Kerja / Unit yang Dikepalai - Conditional based on Role */}
                    {employee.role === 'kepala_ruangan' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit yang Dikepalai *</label>
                            <select 
                                name="managedUnitId" 
                                value={employee.managedUnitId || ''} 
                                onChange={(e) => {
                                    handleChange(e);
                                    // Sync dengan unitKerjaId untuk kepala ruangan
                                    setEmployee({ ...employee, managedUnitId: e.target.value, unitKerjaId: e.target.value });
                                }}
                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.managedUnitId ? 'border-red-500' : ''}`}
                                title="Pilih unit yang akan dikelola"
                                required
                            >
                                <option value="">-- Pilih Unit yang Dikepalai --</option>
                                {workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.nama}</option>)}
                            </select>
                            {errors.managedUnitId && <p className="mt-1 text-sm text-red-600">{errors.managedUnitId}</p>}
                            <p className="mt-1 text-xs text-gray-500">Kepala ruangan akan mengelola karyawan di unit ini</p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Unit Kerja</label>
                            <select 
                                name="unitKerjaId" 
                                value={employee.unitKerjaId || ''} 
                                onChange={handleChange} 
                                className={`mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3 ${errors.unitKerjaId ? 'border-red-500' : ''}`}
                                title="Pilih unit kerja tempat karyawan bekerja"
                            >
                                <option value="">-- Pilih Unit Kerja --</option>
                                {workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.nama}</option>)}
                            </select>
                            {errors.unitKerjaId && <p className="mt-1 text-sm text-red-600">{errors.unitKerjaId}</p>}
                            <p className="mt-1 text-xs text-gray-500">Wajib diisi agar karyawan muncul di dashboard kepala ruangan</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Spesialisasi</label>
                        <input 
                            type="text" 
                            name="spesialisasi" 
                            value={employee.spesialisasi || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Contoh: Jantung Anak"
                            title="Spesialisasi karyawan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Masuk *</label>
                        <input 
                            type="date" 
                            name="hireDate" 
                            value={employee.hireDate || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            title="Tanggal masuk kerja"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Shift Kontrak *</label>
                        <p className="text-xs text-gray-500 mb-2">Shift default sesuai kontrak. Penugasan shift aktif dikelola Kepala Unit.</p>
                        <select 
                            name="shift" 
                            value={employee.shift || 'Pagi'} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            title="Pilih tipe shift kontrak"
                        >
                            <option value="Pagi">Pagi (Shift Tetap Pagi)</option>
                            <option value="Siang">Siang (Shift Tetap Siang)</option>
                            <option value="Malam">Malam (Shift Tetap Malam)</option>
                            <option value="Rotating">Rotating (3 Shift Bergantian)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status Karyawan *</label>
                        <select 
                            name="status" 
                            value={employee.status} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            title="Pilih status karyawan"
                        >
                            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sisa Cuti</label>
                        <input 
                            type="number" 
                            name="sisaCuti" 
                            value={employee.sisaCuti || 12} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            min="0"
                            title="Sisa cuti karyawan"
                        />
                        <p className="mt-1 text-xs text-gray-500">Default: 12 hari per tahun</p>
                    </div>
                </div>
            </div>

            {/* STR Section */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">STR/SIP (Khusus Tenaga Medis)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nomor STR</label>
                        <input 
                            type="text" 
                            name="nomorSTR" 
                            value={employee.nomorSTR || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Nomor Surat Tanda Registrasi"
                            title="Nomor STR"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Kadaluarsa STR</label>
                        <input 
                            type="date" 
                            name="tanggalKadaluarsaSTR" 
                            value={employee.tanggalKadaluarsaSTR || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Tanggal kedaluwarsa STR"
                        />
                    </div>
                </div>
            </div>

            {/* Competencies Section */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Kompetensi & Sertifikasi</h3>
                
                <div className="grid grid-cols-1 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sertifikasi</label>
                        <input 
                            type="text" 
                            value={sertifikasiInput} 
                            onChange={(e) => setSertifikasiInput(e.target.value)} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Pisahkan dengan koma, contoh: BLS, ACLS, ATLS"
                            title="Daftar sertifikasi"
                        />
                        <p className="mt-1 text-xs text-gray-500">Sertifikasi profesional yang dimiliki</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kompetensi</label>
                        <input 
                            type="text" 
                            value={kompetensiInput} 
                            onChange={(e) => setKompetensiInput(e.target.value)} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Pisahkan dengan koma, contoh: Perawatan Luka, Injeksi IV"
                            title="Daftar kompetensi"
                        />
                        <p className="mt-1 text-xs text-gray-500">Keahlian teknis yang dikuasai</p>
                    </div>
                </div>
            </div>

            {/* Compensation Section */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Kompensasi</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gaji Pokok (Rp) *</label>
                        <input 
                            type="number" 
                            name="gajiPokok" 
                            value={employee.compensation?.gajiPokok || ''} 
                            onChange={handleCompensationChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            required
                            min="0"
                            placeholder="5000000"
                            title="Gaji pokok"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tunjangan Profesi (Rp)</label>
                        <input 
                            type="number" 
                            name="tunjanganProfesi" 
                            value={employee.compensation?.tunjanganProfesi || ''} 
                            onChange={handleCompensationChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            min="0"
                            placeholder="1000000"
                            title="Tunjangan profesi"
                        />
                    </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <span className="font-medium">Total Kompensasi: </span>
                        Rp {((employee.compensation?.gajiPokok || 0) + (employee.compensation?.tunjanganProfesi || 0)).toLocaleString('id-ID')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EmploymentInfoTab;

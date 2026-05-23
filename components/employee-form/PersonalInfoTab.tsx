import React from 'react';
import { Employee, Address, EmergencyContact, BankAccount } from '../../types';
import { PlusIcon } from '../icons';

interface PersonalInfoTabProps {
    employee: Employee;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleAddressChange: (field: keyof Address, value: string) => void;
    handleAddEmergencyContact: () => void;
    handleUpdateEmergencyContact: (index: number, field: keyof EmergencyContact, value: string) => void;
    handleDeleteEmergencyContact: (index: number) => void;
}

const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
    employee,
    handleChange,
    handleAddressChange,
    handleAddEmergencyContact,
    handleUpdateEmergencyContact,
    handleDeleteEmergencyContact,
}) => {
    return (
        <div className="space-y-6">
            {/* Identitas & Status */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Identitas & Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nomor KTP</label>
                        <input 
                            type="text" 
                            name="ktpNumber" 
                            value={employee.ktpNumber || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="16 digit nomor KTP"
                            maxLength={16}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NPWP</label>
                        <input 
                            type="text" 
                            name="npwp" 
                            value={employee.npwp || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="XX.XXX.XXX.X-XXX.XXX"
                            maxLength={20}
                        />
                        <p className="mt-1 text-xs text-gray-500">Untuk keperluan perpajakan</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Kesehatan</label>
                        <input 
                            type="text" 
                            name="bpjsKesehatan" 
                            value={employee.bpjsKesehatan || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Nomor BPJS Kesehatan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Ketenagakerjaan</label>
                        <input 
                            type="text" 
                            name="bpjsKetenagakerjaan" 
                            value={employee.bpjsKetenagakerjaan || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            placeholder="Nomor BPJS Ketenagakerjaan"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status Pernikahan</label>
                        <select 
                            name="maritalStatus" 
                            value={employee.maritalStatus || 'Single'} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Pilih status pernikahan"
                        >
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Agama</label>
                        <select 
                            name="agama" 
                            value={employee.agama || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            title="Pilih agama"
                        >
                            <option value="">Pilih Agama</option>
                            <option value="Islam">Islam</option>
                            <option value="Kristen Protestan">Kristen Protestan</option>
                            <option value="Kristen Katolik">Kristen Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                            <option value="Konghucu">Konghucu</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Tanggungan</label>
                        <input 
                            type="number" 
                            name="dependents" 
                            value={employee.dependents || 0} 
                            onChange={handleChange} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            min="0"
                            placeholder="0"
                        />
                        <p className="mt-1 text-xs text-gray-500">Untuk perhitungan PTKP pajak</p>
                    </div>
                </div>
            </div>

            {/* Alamat */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg text-[#06736a]">Alamat</h3>
                
                <div className="grid grid-cols-1 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alamat KTP</label>
                        <textarea 
                            value={employee.address?.ktp || ''} 
                            onChange={(e) => handleAddressChange('ktp', e.target.value)} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            rows={2}
                            placeholder="Jl. Contoh No. 123, RT/RW 001/002"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Domisili</label>
                        <textarea 
                            value={employee.address?.domisili || ''} 
                            onChange={(e) => handleAddressChange('domisili', e.target.value)} 
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                            rows={2}
                            placeholder="Sama dengan KTP atau alamat berbeda"
                        />
                        <button 
                            type="button" 
                            onClick={() => handleAddressChange('domisili', employee.address?.ktp || '')} 
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                            Sama dengan alamat KTP
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Provinsi</label>
                            <input 
                                type="text" 
                                value={employee.address?.province || ''} 
                                onChange={(e) => handleAddressChange('province', e.target.value)} 
                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                placeholder="DKI Jakarta"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kota/Kabupaten</label>
                            <input 
                                type="text" 
                                value={employee.address?.city || ''} 
                                onChange={(e) => handleAddressChange('city', e.target.value)} 
                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                placeholder="Jakarta Selatan"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kode Pos</label>
                            <input 
                                type="text" 
                                value={employee.address?.postalCode || ''} 
                                onChange={(e) => handleAddressChange('postalCode', e.target.value)} 
                                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-3"
                                placeholder="12345"
                                maxLength={5}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-5 p-6 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-[#06736a]">Kontak Darurat</h3>
                    <button 
                        type="button" 
                        onClick={handleAddEmergencyContact} 
                        className="px-4 py-2 bg-[#06736a] text-white rounded-lg hover:bg-[#054f46] text-sm flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Tambah Kontak
                    </button>
                </div>

                {(employee.emergencyContacts || []).map((contact, index) => (
                    <div key={index} className="p-4 bg-white border rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Kontak #{index + 1}</h4>
                            <button 
                                type="button" 
                                onClick={() => handleDeleteEmergencyContact(index)} 
                                className="text-red-500 hover:text-red-700 text-sm"
                            >
                                Hapus
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Nama</label>
                                <input 
                                    type="text" 
                                    value={contact.name} 
                                    onChange={(e) => handleUpdateEmergencyContact(index, 'name', e.target.value)} 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Nama kontak darurat"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Hubungan</label>
                                <input 
                                    type="text" 
                                    value={contact.relationship} 
                                    onChange={(e) => handleUpdateEmergencyContact(index, 'relationship', e.target.value)} 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Istri, Suami, Ayah, dll"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">No. Telepon</label>
                                <input 
                                    type="text" 
                                    value={contact.phone} 
                                    onChange={(e) => handleUpdateEmergencyContact(index, 'phone', e.target.value)} 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="08xxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Alamat (Opsional)</label>
                                <input 
                                    type="text" 
                                    value={contact.address || ''} 
                                    onChange={(e) => handleUpdateEmergencyContact(index, 'address', e.target.value)} 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-[#06736a] focus:border-[#06736a] p-2 text-sm"
                                    placeholder="Alamat"
                                />
                            </div>
                        </div>
                    </div>
                ))}
                
                {(!employee.emergencyContacts || employee.emergencyContacts.length === 0) && (
                    <div className="text-center py-6 text-gray-500 bg-white border border-dashed rounded-lg">
                        Belum ada kontak darurat ditambahkan.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonalInfoTab;

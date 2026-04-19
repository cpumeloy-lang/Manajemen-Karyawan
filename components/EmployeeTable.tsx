import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Employee, SortKey, SortDirection } from '../types.ts';
import { PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon } from './icons.tsx';
import { createEmployeeImportTemplate, EMPLOYEE_XLSX_COL_WIDTHS, EMPLOYEE_XLSX_HEADERS } from '../services/excelTemplateService.ts';

interface EmployeeTableProps {
    employees: Employee[];
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onView: (employee: Employee) => void;
    onImport?: (employeesData: any[]) => Promise<void>;
    sortKey: SortKey;
    sortDirection: SortDirection;
    onSort: (key: SortKey) => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({ employees, onEdit, onDelete, onView, onImport, sortKey, sortDirection, onSort }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return employees.slice(startIndex, endIndex);
    }, [employees, currentPage, pageSize]);

    const startRow = employees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRow = Math.min(currentPage * pageSize, employees.length);

    const handlePageSizeChange = (value: number) => {
        setPageSize(value);
        setCurrentPage(1);
    };

    const goToPrevPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // Export data karyawan ke XLSX (dengan kolom baru)
    const handleExportXLSX = () => {
        const data = employees.map(emp => {
            const raw = emp as any;
            const address = emp.address || raw.address || {};
            const bankAccount = emp.bankAccount || raw.bank_account || {};

            return {
                NIK: emp.nik || raw.nik || '',
                Nama: emp.nama || '',
                Email: emp.email || '',
                Telepon: emp.telepon || '',
                Tanggal_Lahir: emp.birthDate || raw.birthDate || '',
                Jabatan: emp.jabatan || '',
                Departemen: emp.departemen || '',
                Status: emp.status || 'Aktif',
                Tanggal_Masuk: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
                Gaji_Pokok: emp.compensation?.gajiPokok ?? raw.gajiPokok ?? 0,
                Tunjangan_Profesi: emp.compensation?.tunjanganProfesi ?? raw.tunjanganProfesi ?? 0,
                KTP: emp.ktpNumber || raw.ktp_number || '',
                NPWP: emp.npwp || raw.npwp || '',
                BPJS_Kesehatan: emp.bpjsKesehatan || raw.bpjs_kesehatan || '',
                BPJS_Ketenagakerjaan: emp.bpjsKetenagakerjaan || raw.bpjs_ketenagakerjaan || '',
                Status_Nikah: emp.maritalStatus || raw.marital_status || 'Single',
                Jumlah_Tanggungan: emp.dependents ?? raw.dependents ?? 0,
                Alamat_KTP: address.ktp || '',
                Alamat_Domisili: address.domisili || '',
                Provinsi: address.province || '',
                Kota: address.city || '',
                Kode_Pos: address.postalCode || '',
                Bank: bankAccount.bankName || '',
                No_Rekening: bankAccount.accountNumber || '',
                Nama_Rekening: bankAccount.accountHolder || emp.nama || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data, { header: [...EMPLOYEE_XLSX_HEADERS] });
        worksheet['!cols'] = EMPLOYEE_XLSX_COL_WIDTHS;
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Karyawan');
        XLSX.writeFile(workbook, `data_karyawan_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Import data karyawan dari XLSX
    const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const imported: any[] = XLSX.utils.sheet_to_json(worksheet);

                    if (imported.length === 0) {
                        alert('File Excel kosong atau tidak memiliki data.');
                        return;
                    }

                    // Validasi kolom yang diperlukan
                    const requiredColumns = ['Nama', 'Email'];
                    const firstRow = imported[0];
                    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
                    
                    if (missingColumns.length > 0) {
                        alert(`Kolom berikut tidak ditemukan: ${missingColumns.join(', ')}\n\nPastikan file Excel memiliki kolom: Nama, Email, Telepon, Jabatan, Departemen, Status, Tanggal_Masuk, Gaji_Pokok, Tunjangan_Profesi`);
                        return;
                    }

                    // Konfirmasi import
                    if (!window.confirm(`Akan mengimport ${imported.length} data karyawan. Lanjutkan?`)) {
                        return;
                    }

                    // Kirim data ke parent component untuk disimpan
                    if (onImport) {
                        await onImport(imported);
                    } else {
                        alert('Fungsi import belum tersedia. Hubungi administrator.');
                    }

                } catch (error: any) {
                    console.error('Error parsing Excel:', error);
                    alert(`Gagal membaca file Excel: ${error.message}`);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error: any) {
            console.error('Error reading file:', error);
            alert(`Gagal membaca file: ${error.message}`);
        } finally {
            // Reset input file
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    
    const SortableHeader: React.FC<{ columnKey: SortKey; title: string }> = ({ columnKey, title }) => {
        const isSorting = sortKey === columnKey;
        const icon = isSorting ? (sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />) : <span className="w-4"/>;

        return (
            <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                onClick={() => onSort(columnKey)}
            >
                <div className="flex items-center gap-1">
                    {title}
                    {icon}
                </div>
            </th>
        );
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-primary">Daftar Karyawan</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={createEmployeeImportTemplate} 
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors" 
                        aria-label="Download template Excel untuk import"
                        title="Download Template"
                    >
                        📄 Template
                    </button>
                    <button 
                        onClick={handleExportXLSX} 
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors" 
                        aria-label="Export data karyawan ke Excel"
                        title="Export ke Excel"
                    >
                        📥 Export XLSX
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors" 
                        aria-label="Import data karyawan dari Excel"
                        title="Import dari Excel"
                    >
                        📤 Import XLSX
                    </button>
                    <input 
                        type="file" 
                        accept=".xlsx,.xls" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleImportXLSX}
                        aria-label="Pilih file Excel untuk import"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIK</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karyawan</th>
                            <SortableHeader columnKey="jabatan" title="Jabatan" />
                            <SortableHeader columnKey="departemen" title="Departemen" />
                            <SortableHeader columnKey="status" title="Status" />
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validasi</th>
                            <SortableHeader columnKey="hireDate" title="Tgl Masuk" />
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEmployees.map(employee => (
                            <tr key={employee.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {employee.nik || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <img className="h-10 w-10 rounded-full object-cover" src={employee.foto || `https://ui-avatars.com/api/?name=${employee.nama.replace(/\s/g, '+')}&background=random`} alt={employee.nama} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{employee.nama}</div>
                                            <div className="text-sm text-gray-500">{employee.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.jabatan}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.departemen}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        employee.status === 'Aktif' ? 'bg-green-100 text-green-800' : 
                                        employee.status === 'Cuti' ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-red-100 text-red-800'
                                     }`}>
                                        {employee.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        {employee.isProfileCompleted && (
                                            <span className="px-2 py-1 text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-700">
                                                ✓ Lengkap
                                            </span>
                                        )}
                                        {!employee.isProfileCompleted && (
                                            <span className="px-2 py-1 text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-600">
                                                ⚠ Belum Lengkap
                                            </span>
                                        )}
                                        {employee.isVerified && (
                                            <span className="px-2 py-1 text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-700">
                                                ✓ Verified
                                            </span>
                                        )}
                                        {employee.isLocked && (
                                            <span className="px-2 py-1 text-xs leading-4 font-semibold rounded-full bg-red-100 text-red-700">
                                                🔒 Locked
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(employee.hireDate).toLocaleDateString('id-ID')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                        onClick={() => onView(employee)} 
                                        className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2]"
                                        aria-label={`Lihat detail ${employee.nama}`}
                                        title="Lihat Detail"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => onEdit(employee)} 
                                        className="p-2 text-gray-400 hover:text-[#06736a] rounded-full hover:bg-[#e6f3f2] ml-2"
                                        aria-label={`Edit ${employee.nama}`}
                                        title="Edit Karyawan"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => onDelete(employee.id)} 
                                        className="p-2 text-gray-400 hover:text-danger rounded-full hover:bg-red-50 ml-2"
                                        aria-label={`Hapus ${employee.nama}`}
                                        title="Hapus Karyawan"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {employees.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                        Menampilkan {startRow}-{endRow} dari {employees.length} karyawan
                    </p>
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600" htmlFor="employee-page-size">Baris:</label>
                        <select
                            id="employee-page-size"
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                            value={pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <button
                            onClick={goToPrevPage}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>
                        <span className="text-sm text-gray-700">Halaman {currentPage} / {totalPages}</span>
                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
            {employees.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    Tidak ada data karyawan yang cocok dengan filter.
                </div>
            )}
        </div>
    );
};

export default EmployeeTable;
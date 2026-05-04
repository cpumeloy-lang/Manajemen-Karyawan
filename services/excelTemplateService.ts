import * as XLSX from 'xlsx';

export const EMPLOYEE_XLSX_HEADERS = [
    'NIK',
    'Nama',
    'Email',
    'Telepon',
    'Tanggal_Lahir',
    'Jabatan',
    'Departemen',
    'Unit_Kerja',
    'Status',
    'Tanggal_Masuk',
    'Gaji_Pokok',
    'Tunjangan_Profesi',
    'KTP',
    'NPWP',
    'BPJS_Kesehatan',
    'BPJS_Ketenagakerjaan',
    'Agama',
    'Status_Nikah',
    'Jumlah_Tanggungan',
    'Alamat_KTP',
    'Alamat_Domisili',
    'Provinsi',
    'Kota',
    'Kode_Pos',
    'Bank',
    'No_Rekening',
    'Nama_Rekening'
] as const;

export const EMPLOYEE_XLSX_COL_WIDTHS = [
    { wch: 15 }, // NIK
    { wch: 25 }, // Nama
    { wch: 25 }, // Email
    { wch: 15 }, // Telepon
    { wch: 15 }, // Tanggal_Lahir
    { wch: 25 }, // Jabatan
    { wch: 30 }, // Departemen
    { wch: 25 }, // Unit_Kerja
    { wch: 12 }, // Status
    { wch: 15 }, // Tanggal_Masuk
    { wch: 15 }, // Gaji_Pokok
    { wch: 20 }, // Tunjangan_Profesi
    { wch: 18 }, // KTP
    { wch: 20 }, // NPWP
    { wch: 18 }, // BPJS_Kesehatan
    { wch: 20 }, // BPJS_Ketenagakerjaan
    { wch: 18 }, // Agama
    { wch: 15 }, // Status_Nikah
    { wch: 10 }, // Jumlah_Tanggungan
    { wch: 35 }, // Alamat_KTP
    { wch: 35 }, // Alamat_Domisili
    { wch: 15 }, // Provinsi
    { wch: 15 }, // Kota
    { wch: 10 }, // Kode_Pos
    { wch: 15 }, // Bank
    { wch: 15 }, // No_Rekening
    { wch: 25 }  // Nama_Rekening
];

// Fungsi untuk membuat template Excel untuk import data karyawan
export const createEmployeeImportTemplate = () => {
    // Data contoh untuk template (dengan kolom baru)
    const templateData = [
        {
            NIK: '2024-MED-001',
            Nama: 'Dr. Ahmad Wijaya',
            Email: 'ahmad@hospital.com',
            Telepon: '08123456789',
            Tanggal_Lahir: '1985-05-15',
            Jabatan: 'Dokter Umum',
            Departemen: 'Departemen Medis',
            Unit_Kerja: 'IGD',
            Status: 'Aktif',
            Tanggal_Masuk: '2024-01-15',
            Gaji_Pokok: 15000000,
            Tunjangan_Profesi: 5000000,
            // Kolom baru
            KTP: '3201051505850001',
            NPWP: '12.345.678.9-012.345',
            BPJS_Kesehatan: '0001234567890',
            BPJS_Ketenagakerjaan: '1234567890123',
            Agama: 'Islam',
            Status_Nikah: 'Married',
            Jumlah_Tanggungan: 2,
            Alamat_KTP: 'Jl. Merdeka No. 123, Jakarta',
            Alamat_Domisili: 'Jl. Merdeka No. 123, Jakarta',
            Provinsi: 'DKI Jakarta',
            Kota: 'Jakarta Pusat',
            Kode_Pos: '10110',
            Bank: 'BCA',
            No_Rekening: '1234567890',
            Nama_Rekening: 'Dr. Ahmad Wijaya'
        },
        {
            NIK: '2024-NUR-001',
            Nama: 'Siti Nurhaliza',
            Email: 'siti@hospital.com',
            Telepon: '08198765432',
            Tanggal_Lahir: '1990-08-20',
            Jabatan: 'Perawat',
            Departemen: 'Departemen Keperawatan',
            Unit_Kerja: 'Rawat Inap',
            Status: 'Aktif',
            Tanggal_Masuk: '2024-02-01',
            Gaji_Pokok: 8000000,
            Tunjangan_Profesi: 2000000,
            // Kolom baru
            KTP: '3201052008900002',
            NPWP: '23.456.789.0-123.456',
            BPJS_Kesehatan: '0002345678901',
            BPJS_Ketenagakerjaan: '2345678901234',
            Agama: 'Kristen Protestan',
            Status_Nikah: 'Single',
            Jumlah_Tanggungan: 0,
            Alamat_KTP: 'Jl. Sudirman No. 456, Jakarta',
            Alamat_Domisili: 'Jl. Sudirman No. 456, Jakarta',
            Provinsi: 'DKI Jakarta',
            Kota: 'Jakarta Selatan',
            Kode_Pos: '12190',
            Bank: 'Mandiri',
            No_Rekening: '9876543210',
            Nama_Rekening: 'Siti Nurhaliza'
        }
    ];

    // Buat worksheet dari data
    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: [...EMPLOYEE_XLSX_HEADERS] });
    worksheet['!cols'] = EMPLOYEE_XLSX_COL_WIDTHS;

    // Buat workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Karyawan');

    // Download file
    XLSX.writeFile(workbook, 'template_import_export_karyawan.xlsx');
};

// Fungsi untuk membuat template kosong
export const createEmptyEmployeeTemplate = () => {
    const emptyData = [
        {
            NIK: '',
            Nama: '',
            Email: '',
            Telepon: '',
            Tanggal_Lahir: '',
            Jabatan: '',
            Departemen: '',
            Unit_Kerja: '',
            Status: 'Aktif',
            Tanggal_Masuk: '',
            Gaji_Pokok: 0,
            Tunjangan_Profesi: 0,
            // Kolom baru
            KTP: '',
            NPWP: '',
            BPJS_Kesehatan: '',
            BPJS_Ketenagakerjaan: '',
            Agama: '',
            Status_Nikah: 'Single',
            Jumlah_Tanggungan: 0,
            Alamat_KTP: '',
            Alamat_Domisili: '',
            Provinsi: '',
            Kota: '',
            Kode_Pos: '',
            Bank: '',
            No_Rekening: '',
            Nama_Rekening: ''
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(emptyData, { header: [...EMPLOYEE_XLSX_HEADERS] });
    worksheet['!cols'] = EMPLOYEE_XLSX_COL_WIDTHS;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Kosong');
    XLSX.writeFile(workbook, 'template_kosong_karyawan.xlsx');
};

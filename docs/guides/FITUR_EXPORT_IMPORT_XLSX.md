# Panduan Export dan Import Data Karyawan (.XLSX)

## Deskripsi
Aplikasi HRMS Pro sekarang mendukung fitur export dan import data karyawan menggunakan file Excel (.xlsx). Fitur ini memudahkan admin untuk:
- **Export**: Mengunduh seluruh data karyawan ke file Excel
- **Import**: Mengunggah data karyawan dalam jumlah banyak sekaligus dari file Excel

Dokumen ini sudah disesuaikan dengan implementasi terbaru, termasuk dukungan kolom data lengkap dan mode kompatibilitas untuk database schema lama.

## Fitur Export XLSX

### Cara Menggunakan
1. Login sebagai Admin
2. Buka halaman "Karyawan"
3. Klik tombol **📥 Export XLSX**
4. File Excel akan otomatis terunduh dengan nama: `data_karyawan_YYYY-MM-DD.xlsx`

### Kolom yang Diekspor
File Excel hasil export akan berisi kolom-kolom berikut:
- **NIK**
- **Nama**: Nama lengkap karyawan
- **Email**: Email karyawan
- **Telepon**: Nomor telepon
- **Tanggal_Lahir**
- **Jabatan**: Jabatan karyawan
- **Departemen**: Departemen karyawan
- **Status**: Status karyawan (Aktif/Cuti/Non-Aktif)
- **Tanggal_Masuk**: Tanggal bergabung (format YYYY-MM-DD)
- **Gaji_Pokok**: Gaji pokok (angka)
- **Tunjangan_Profesi**: Tunjangan profesi (angka)
- **KTP**
- **NPWP**
- **BPJS_Kesehatan**
- **BPJS_Ketenagakerjaan**
- **Status_Nikah**
- **Jumlah_Tanggungan**
- **Alamat_KTP**
- **Alamat_Domisili**
- **Provinsi**
- **Kota**
- **Kode_Pos**
- **Bank**
- **No_Rekening**
- **Nama_Rekening**

## Fitur Import XLSX

### Cara Menggunakan
1. Login sebagai Admin
2. Buka halaman "Karyawan"
3. Klik tombol **📤 Import XLSX**
4. Pilih file Excel (.xlsx atau .xls)
5. Sistem akan memvalidasi data
6. Konfirmasi jumlah data yang akan diimport
7. Data akan disimpan ke database

### Format File Excel

#### Kolom Wajib
- **Nama** (wajib)
- **Email** (wajib, harus unik)

#### Kolom Opsional
- **NIK** (opsional)
  - Jika kolom `nik` tersedia di database: divalidasi format `YYYY-XXX-NNN` dan dicek duplikasi.
  - Jika kolom `nik` belum ada di database: nilai NIK diabaikan (import tetap berjalan).
- **Telepon** (opsional)
- **Tanggal_Lahir** (opsional, format: YYYY-MM-DD, DD/MM/YYYY, atau serial date Excel)
- **Jabatan** (opsional)
- **Departemen** (opsional)
- **Status** (opsional, default: Aktif)
  - Nilai yang valid: `Aktif`, `Cuti`, `Non-Aktif`
- **Tanggal_Masuk** (opsional, format: YYYY-MM-DD, DD/MM/YYYY, atau serial date Excel)
- **Gaji_Pokok** (opsional, angka)
- **Tunjangan_Profesi** (opsional, angka)
- **KTP, NPWP, BPJS_Kesehatan, BPJS_Ketenagakerjaan** (opsional)
- **Status_Nikah, Jumlah_Tanggungan** (opsional)
- **Alamat_KTP, Alamat_Domisili, Provinsi, Kota, Kode_Pos** (opsional)
- **Bank, No_Rekening, Nama_Rekening** (opsional)

#### Kompatibilitas Schema Database
- Jika database sudah memiliki kolom profil lengkap (misalnya `ktp_number`, `bank_account`, dll), data kolom extended akan disimpan.
- Jika database masih schema lama, sistem otomatis fallback ke kolom inti agar import tetap berhasil.
- Artinya, import tidak gagal total hanya karena perbedaan versi schema.

#### Contoh Header Template

Gunakan urutan header berikut agar paling aman:

`NIK, Nama, Email, Telepon, Tanggal_Lahir, Jabatan, Departemen, Status, Tanggal_Masuk, Gaji_Pokok, Tunjangan_Profesi, KTP, NPWP, BPJS_Kesehatan, BPJS_Ketenagakerjaan, Status_Nikah, Jumlah_Tanggungan, Alamat_KTP, Alamat_Domisili, Provinsi, Kota, Kode_Pos, Bank, No_Rekening, Nama_Rekening`

### Validasi Import

Sistem akan melakukan validasi berikut:
1. **Kolom Wajib**: Nama dan Email harus diisi
2. **Email Unik**: Email tidak boleh duplikat dengan data yang sudah ada
3. **Format NIK**: Dicek hanya bila kolom NIK tersedia di database
4. **Format Status**: Status dinormalisasi ke Aktif/Cuti/Non-Aktif
5. **Format Angka**: Gaji_Pokok dan Tunjangan_Profesi diparse sebagai angka
6. **Format Tanggal**: Mendukung serial date Excel dan teks tanggal umum

### Pesan Error Import

Jika terjadi error saat import, sistem akan menampilkan:
- Jumlah data yang berhasil diimport
- Jumlah data yang gagal
- Detail error untuk setiap baris yang gagal (maksimal 5 error pertama)

Contoh pesan error:
```
Import selesai!

✅ Berhasil: 8 karyawan
❌ Gagal: 2 karyawan

Detail error:
Baris 3: Email ahmad@hospital.com sudah terdaftar
Baris 5: Nama dan Email wajib diisi
```

## Tips Penggunaan

### Best Practices Export
1. **Backup Rutin**: Export data secara berkala sebagai backup
2. **Penamaan File**: File otomatis diberi nama dengan tanggal untuk memudahkan tracking
3. **Template Import**: Gunakan hasil export sebagai template untuk import data baru

### Best Practices Import
1. **Siapkan Template**: Download file export sebagai template
2. **Validasi Data**: Pastikan semua email unik sebelum import
3. **Import Bertahap**: Untuk data banyak (>100 baris), lakukan import bertahap
4. **Backup Sebelum Import**: Export data existing sebelum melakukan import besar
5. **Cek Format Tanggal**: Prioritaskan format YYYY-MM-DD untuk konsistensi
6. **Cek Format Angka**: Pastikan Gaji_Pokok dan Tunjangan_Profesi berupa angka (tanpa titik atau koma pemisah ribuan)

## Catatan Penting

1. **File Format**: Hanya mendukung file Excel (.xlsx, .xls)
2. **Ukuran File**: Tidak ada batasan ukuran file, namun untuk performa optimal disarankan maksimal 1000 baris per file
3. **Encoding**: File harus menggunakan encoding UTF-8 untuk karakter khusus (Indonesia)
4. **Baris Header**: Baris pertama Excel harus berisi nama kolom (header)
5. **Data Mulai Baris 2**: Data karyawan dimulai dari baris kedua
6. **Role Default**: Semua karyawan yang diimport akan memiliki role "karyawan" (bukan admin)
7. **Akun Login**: Import tidak otomatis membuat akun login, hanya menyimpan data profil karyawan
8. **Schema Lama**: Pada database lama, kolom extended mungkin tidak tersimpan meski import dinyatakan berhasil

## Troubleshooting

### File Excel tidak terbaca
- Pastikan file berformat .xlsx atau .xls
- Coba buka dan save ulang file di Excel/LibreOffice

### Error "Kolom tidak ditemukan"
- Pastikan baris pertama Excel berisi nama kolom yang benar
- Periksa ejaan kolom (huruf kapital sensitif)
- Gunakan nama kolom seperti contoh: `Nama`, `Email`, `Telepon`, dll.

### Import berhasil tapi data tidak muncul
- Cek ringkasan hasil import: pastikan jumlah **Berhasil** > 0
- Periksa filter/search dan pagination di halaman karyawan
- Refresh browser (F5)
- Logout dan login kembali
- Jika ada error terkait kolom database, jalankan migration schema terbaru

### Data salah setelah import
- Gunakan fitur delete untuk menghapus data yang salah
- Perbaiki data di Excel dan import ulang

## Pengembangan Selanjutnya

Fitur yang dapat ditambahkan:
- Import foto karyawan dari URL
- Import dokumen karyawan
- Update data existing (saat ini hanya insert)
- Import dengan mapping kolom custom
- Export dengan filter (departemen, jabatan, status, dll)
- Export template kosong untuk import
- Validasi lebih detail (nomor telepon, format email, dll)

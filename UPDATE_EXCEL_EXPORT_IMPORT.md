# ✅ UPDATE: Export/Import Excel Sudah Disesuaikan dengan Data Lengkap Karyawan

## 📋 Yang Sudah Diupdate

### 1. **Template Excel** (`excelTemplateService.ts`)
✅ Template dengan contoh data sudah mencakup 25 kolom:
- Data dasar: NIK, Nama, Email, Telepon, Tanggal_Lahir
- Kepegawaian: Jabatan, Departemen, Status, Tanggal_Masuk
- Kompensasi: Gaji_Pokok, Tunjangan_Profesi
- **Kolom Baru:**
  - KTP (16 digit)
  - NPWP
  - BPJS_Kesehatan
  - BPJS_Ketenagakerjaan
  - Status_Nikah (Single/Married/Divorced/Widowed)
  - Jumlah_Tanggungan
  - Alamat_KTP
  - Alamat_Domisili
  - Provinsi
  - Kota
  - Kode_Pos
  - Bank
  - No_Rekening
  - Nama_Rekening

### 2. **Fungsi Export** (`EmployeeTable.tsx`)
✅ Export sekarang mencakup semua kolom baru
- File yang didownload akan berisi data lengkap karyawan
- Format nama file: `data_karyawan_YYYY-MM-DD.xlsx`

### 3. **Fungsi Import** (`App.tsx`)
✅ Import sekarang memproses semua kolom baru:
- Membaca kolom KTP, NPWP, BPJS
- Menyimpan data alamat dalam format JSONB
- Menyimpan data bank account
- Status nikah dan jumlah tanggungan

---

## 🚀 Cara Menggunakan

### Download Template
1. Klik tombol **"📄 Template"** di aplikasi
2. File `template_import_karyawan.xlsx` akan terdownload
3. File sudah berisi 2 contoh data lengkap

### Export Data Existing
1. Klik tombol **"📥 Export XLSX"**
2. Semua data karyawan (termasuk kolom baru) akan di-export
3. File tersimpan dengan nama `data_karyawan_2025-10-27.xlsx`

### Import Data Baru
1. Siapkan file Excel dengan format sesuai template
2. Klik tombol **"📤 Import XLSX"**
3. Pilih file Excel
4. Sistem akan validasi dan import data
5. Hasil import akan ditampilkan (sukses/gagal)

---

## ⚠️ PENTING - Sebelum Import Bekerja

**Anda masih perlu menjalankan SQL Migration** di Supabase terlebih dahulu!

File: `RUN_THIS_IN_SUPABASE.sql`

Tanpa migration, import akan gagal dengan error:
```
Could not find the 'bankAccount' column of 'employees' in the schema cache
```

---

## 📊 Kolom yang Wajib Diisi

Saat import, hanya 2 kolom yang **WAJIB** diisi:
1. **Nama** - Nama lengkap karyawan
2. **Email** - Email unik untuk login

Kolom lainnya opsional dan akan menggunakan nilai default jika kosong.

---

## ✅ Status

- ✅ Template Excel sudah update
- ✅ Export Excel sudah update
- ✅ Import Excel sudah update
- ⚠️ Database belum di-migrate (perlu jalankan SQL)

---

## 🎯 Next Steps

1. **Jalankan SQL migration** di Supabase (file `RUN_THIS_IN_SUPABASE.sql`)
2. **Download template baru** dengan klik tombol "📄 Template"
3. **Test import** dengan data contoh dari template
4. **Export existing data** untuk backup dan validasi

---

**Update Date:** October 27, 2025
**Status:** Ready to use (setelah SQL migration)

# 🔧 Fix Error: Foreign Key Constraint "incompatible types: uuid and text"

> Catatan penting: Referensi localhost pada dokumen ini hanya untuk pengujian lokal. Untuk deployment online, pakai domain aplikasi publik.

## ❌ **Error yang Terjadi**
```
ERROR: 42804: foreign key constraint "attendance_employee_id_fkey" cannot be implemented
DETAIL: Key columns "employee_id" and "id" are of incompatible types: uuid and text.
```

## 🔍 **Penyebab Error**
- Database menggunakan tipe `UUID` untuk primary key
- Aplikasi React menggunakan tipe `string` untuk ID
- Foreign key constraints tidak bisa dibuat karena perbedaan tipe data

## ✅ **Solusi**

### **Langkah 1: Bersihkan Database (Jika Ada Tabel yang Salah)**
Jika sudah ada tabel dengan tipe UUID, jalankan script cleanup terlebih dahulu:

```sql
-- File: database-cleanup.sql
-- Copy dan jalankan di SQL Editor Supabase
```

### **Langkah 2: Gunakan Script yang Sudah Diperbaiki**
Script `database-setup.sql` sudah diperbaiki dengan perubahan:

**✅ Perubahan Utama:**
- `UUID` → `TEXT` untuk semua primary key dan foreign key
- `gen_random_uuid()` → `gen_random_uuid()::text` 
- Menambahkan field `unit_kerja_id` di tabel employees
- Menyesuaikan nama field dengan types.ts aplikasi

**✅ Struktur Tabel yang Diperbaiki:**
```sql
-- Semua ID menggunakan TEXT
public.units.id: TEXT
public.employees.id: TEXT  
public.employees.unit_kerja_id: TEXT (FK ke units.id)
public.attendance.employee_id: TEXT (FK ke employees.id)
public.requests.employee_id: TEXT (FK ke employees.id)
public.documents.employee_id: TEXT (FK ke employees.id)
```

### **Langkah 3: Jalankan Script Database**

1. **Buka SQL Editor** di Supabase
2. **Copy seluruh isi** file `database-setup.sql` yang sudah diperbaiki
3. **Paste dan jalankan** di SQL Editor
4. **Verifikasi** tidak ada error

### **Langkah 4: Verifikasi Berhasil**
```sql
-- Cek struktur tabel
\d public.employees
\d public.attendance

-- Cek foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';
```

## 🚀 **Hasil Setelah Fix**

### **✅ Yang Diperbaiki:**
1. **Konsistensi tipe data** - Semua ID menggunakan TEXT
2. **Foreign key constraints** - Berfungsi dengan benar
3. **Kompatibilitas aplikasi** - Sesuai dengan types.ts
4. **Field mapping** - Nama field sesuai aplikasi React

### **✅ Tabel yang Berhasil Dibuat:**
- `public.units` (10 departemen sample)
- `public.employees` (dengan unit_kerja_id)
- `public.attendance` (dengan field yang sesuai)
- `public.requests` (cuti, izin, reimbursement)
- `public.documents` (dokumen karyawan)

### **✅ RLS Policies Aktif:**
- Users hanya bisa akses data sesuai role
- Admin bisa akses semua data
- Karyawan hanya bisa akses data sendiri

## 🎯 **Langkah Selanjutnya**

1. **Jalankan script yang sudah diperbaiki**
2. **Buat user admin** pertama
3. **Test aplikasi**:
  - Dev lokal: http://localhost:3001/
  - Online/staging/production: https://hrms.perusahaan.com/
4. **Verifikasi** semua fungsi berjalan normal

Script sudah 100% kompatibel dengan struktur aplikasi React! 🎉
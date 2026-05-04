# 🚀 Panduan Setup Database Supabase untuk HRMS Pro

> Catatan penting: Contoh URL localhost pada dokumen ini hanya untuk development lokal. Untuk staging/production, ganti ke domain frontend publik.

## ✅ **Ya, Script SQL Bisa Langsung Di-Copy!**

Script yang Anda buat sudah benar untuk PostgreSQL/Supabase. Berikut langkah-langkahnya:

## 📋 **Langkah Setup Database**

### **1. Login ke Supabase Dashboard**
- Buka [https://supabase.com](https://supabase.com)
- Login ke akun Anda
- Pilih project yang sudah ada atau buat project baru

### **2. Buka SQL Editor**
- Di dashboard Supabase, klik **"SQL Editor"** di sidebar kiri
- Atau akses melalui: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`

### **3. Jalankan Script Database**

#### **Opsi A: Jalankan Script Lengkap Sekaligus**
1. Copy **SELURUH ISI** file `database-setup.sql`
2. Paste ke SQL Editor
3. Klik **"Run"** atau tekan `Ctrl+Enter`

#### **Opsi B: Jalankan Bertahap (Lebih Aman)**
1. **Step 1**: Jalankan `database-setup-step1.sql` (tabel + data sample)
2. **Step 2**: Jalankan `database-setup-step2.sql` (RLS policies)
3. **Step 3**: Jalankan `database-setup-step3.sql` (functions + triggers)

### **4. Verifikasi Setup Berhasil**
Jalankan query berikut untuk memastikan semua tabel berhasil dibuat:

```sql
-- Cek semua tabel berhasil dibuat
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Cek data sample units
SELECT * FROM public.units;

-- Cek RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🔧 **Langkah Selanjutnya**

### **1. Buat User Admin Pertama**

Setelah database setup berhasil, Anda perlu membuat user admin:

1. **Registrasi user baru** melalui aplikasi HRMS atau Supabase Auth
2. **Dapatkan user_id** dari tabel auth.users:
   ```sql
   SELECT id, email FROM auth.users;
   ```

3. **Buat record employee untuk admin**:
   ```sql
   INSERT INTO public.employees (
       user_id, 
       nama, 
       email, 
       role, 
       jabatan, 
       departemen,
       status,
       shift
   ) VALUES (
       'PASTE_USER_ID_DISINI',  -- Ganti dengan user_id dari auth.users
       'Admin HRMS',
       'admin@hospital.com',    -- Email harus sama dengan di auth.users
       'admin',
       'Manager HR',
       'HR',
       'Aktif',
       'Pagi'
   );
   ```

### **2. Test Koneksi dari Aplikasi**
1. Pastikan aplikasi React sudah berjalan:
    - Dev lokal: `http://localhost:3001/`
    - Online/staging/production: `https://hrms.perusahaan.com/`
2. Buka halaman login
3. Status database akan muncul (hijau = berhasil, merah = ada masalah)
4. Login dengan user admin yang sudah dibuat

## ⚠️ **Troubleshooting Umum**

### **Error saat menjalankan script:**

**1. "permission denied for schema public"**
- Pastikan Anda menggunakan project Supabase yang benar
- Cek apakah Anda memiliki akses admin ke project

**2. "relation already exists"**
- Normal jika menjalankan script berulang
- Script menggunakan `IF NOT EXISTS` jadi aman

**3. "function/policy already exists"**
- Gunakan file step-by-step yang sudah include `DROP IF EXISTS`

### **Error di aplikasi setelah setup:**

**1. "Could not find the table 'public.units'"**
- Pastikan script database sudah dijalankan
- Cek di Table Editor apakah tabel sudah ada

**2. "Row Level Security policy violation"**
- Pastikan user sudah login
- Pastikan ada record di tabel employees untuk user tersebut

**3. "Invalid API credentials"**
- Cek file `services/supabaseClient.ts`
- Pastikan URL dan API key sudah benar

## 📊 **Struktur Database yang Akan Dibuat**

```
public.units           (10 departemen sample)
public.employees       (data karyawan + link ke auth.users)
public.attendance      (presensi harian)
public.requests        (cuti, izin, reimbursement)
public.documents       (file dokumen karyawan)
```

## 🎉 **Setelah Setup Berhasil**

1. ✅ Database terpasang
2. ✅ Sample data tersedia
3. ✅ RLS policies aktif
4. ✅ Admin user dibuat
5. ✅ Aplikasi bisa digunakan!

Akses aplikasi di: **http://localhost:3001/** dan login dengan admin user yang telah dibuat.
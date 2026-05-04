# 🔧 Langkah-langkah Setup Database Supabase

> Catatan penting: Jika ada instruksi localhost di bawah, itu khusus development lokal. Untuk deployment online, gunakan domain publik frontend.

## 📋 **Checklist Setup Database**

### **Step 1: Verifikasi Project Supabase**

1. **Buka browser** dan akses: [https://supabase.com](https://supabase.com)
2. **Login** ke akun Supabase Anda
3. **Pastikan project sudah aktif**: `qszceobtohrlcdirvqtt.supabase.co`
4. **Jika belum ada project**, buat project baru

### **Step 2: Setup Database Schema**

1. **Buka SQL Editor** di dashboard Supabase:
   - Klik **"SQL Editor"** di sidebar kiri
   - Atau akses: `https://supabase.com/dashboard/project/qszceobtohrlcdirvqtt/sql`

2. **Copy & Paste Script Database**:
   ```sql
   -- Copy SELURUH isi file database-setup.sql
   -- Paste ke SQL Editor
   -- Klik "Run" atau Ctrl+Enter
   ```

3. **Tunggu hingga selesai** (sekitar 30-60 detik)

### **Step 3: Verifikasi Tabel Berhasil Dibuat**

Jalankan query verifikasi ini di SQL Editor:

```sql
-- 1. Cek apakah semua tabel berhasil dibuat
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Cek data sample units
SELECT * FROM public.units;

-- 3. Cek struktur tabel employees
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' AND table_schema = 'public';
```

**✅ Expected Result:**
```
table_name
----------
attendance
documents  
employees
requests
units
```

### **Step 4: Buat User Admin Pertama**

1. **Registrasi user baru** (jika belum ada):
   - Dev lokal: melalui aplikasi React di http://localhost:3002/
   - Online/staging/production: melalui domain frontend publik (contoh: https://hrms.perusahaan.com/)
   - Atau manual di Supabase Auth dashboard

2. **Dapatkan user_id**:
   ```sql
   SELECT id, email, created_at 
   FROM auth.users 
   ORDER BY created_at DESC;
   ```

3. **Buat record employee untuk admin**:
   ```sql
   INSERT INTO public.employees (
       "user_id", 
       nama, 
       email, 
       role, 
       jabatan, 
       departemen,
       status,
       shift
   ) VALUES (
       'PASTE_USER_ID_DISINI',  -- Ganti dengan user_id dari query di atas
       'Admin HRMS',
       'admin@hospital.com',    -- Email HARUS sama dengan di auth.users
       'admin',
       'Manager HR',
       'HR',
       'Aktif',
       'Pagi'
   );
   ```

### **Step 5: Test Koneksi dari Aplikasi**

1. **Refresh halaman aplikasi**: http://localhost:3002/
2. **Cek status database** di halaman login
3. **Login dengan user admin** yang sudah dibuat

## 🚨 **Troubleshooting Error Umum**

### **Error: "permission denied"**
**Solusi:**
- Pastikan menggunakan project Supabase yang benar
- Cek apakah Anda owner/admin project

### **Error: "relation already exists"**
**Solusi:**
- Normal jika menjalankan script berulang
- Script menggunakan `IF NOT EXISTS`

### **Error: "invalid API key"**
**Solusi:**
1. Buka Project Settings > API di dashboard Supabase
2. Copy URL dan anon key yang baru
3. Update file `services/supabaseClient.ts`

### **Error: "network error"**
**Solusi:**
- Cek koneksi internet
- Coba akses dashboard Supabase di browser
- Matikan VPN/firewall sementara

## 📞 **Jika Masih Bermasalah**

1. **Screenshot error message** lengkap
2. **Cek Network tab** di Developer Tools (F12)
3. **Cek Console tab** untuk error JavaScript
4. **Pastikan project Supabase aktif** dan tidak di-pause

## ✅ **Setelah Setup Berhasil**

Status di aplikasi akan berubah menjadi:
```
✅ Database terhubung dengan baik
```

Dan Anda bisa login menggunakan:
- **Email**: admin@hospital.com (atau sesuai yang dibuat)
- **Password**: password yang diset saat registrasi

**Aplikasi siap digunakan!** 🎉
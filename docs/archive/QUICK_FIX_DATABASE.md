# 🎯 SOLUSI CEPAT: Error Koneksi Database

> Catatan penting: Jika ada contoh akses localhost pada panduan ini, itu khusus development lokal. Environment online wajib menggunakan domain publik.

## ❌ **Error Saat Ini:**
```
❌ Koneksi Database Bermasalah
Error: Could not find the table 'public.units' in the schema cache
```

## ✅ **Solusi 3 Langkah:**

### **🔥 LANGKAH 1: Buka Supabase Dashboard**

1. **Buka browser** dan akses: https://supabase.com
2. **Login** ke akun Anda
3. **Pilih project**: `qszceobtohrlcdirvqtt`
4. **Klik "SQL Editor"** di sidebar kiri

### **🔥 LANGKAH 2: Jalankan Script Database**

1. **Copy SELURUH isi** file `database-setup.sql` (yang sudah Anda buka)
2. **Paste ke SQL Editor** Supabase
3. **Klik "Run"** atau tekan `Ctrl+Enter`
4. **Tunggu** hingga muncul pesan "Success"

### **🔥 LANGKAH 3: Verifikasi & Test**

**Jalankan query ini** di SQL Editor untuk memastikan setup berhasil:

```sql
-- Quick verification
SELECT COUNT(*) as unit_count FROM public.units;
```

**Expected result:** `unit_count: 10`

## 🚀 **Setelah Setup Berhasil:**

1. **Refresh aplikasi** di browser:
    - Dev lokal: http://localhost:3002/
    - Online/staging/production: https://hrms.perusahaan.com/
2. **Status akan berubah** menjadi: ✅ Database terhubung dengan baik
3. **Buat user admin** dengan langkah berikut:

### **Buat User Admin:**

1. **Registrasi user baru** melalui aplikasi (jika ada halaman registrasi)
2. **Atau jalankan query ini** di SQL Editor:

```sql
-- Cek user yang sudah ada
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Insert admin employee (ganti USER_ID_DISINI dengan ID dari query di atas)
INSERT INTO public.employees (
    "user_id", nama, email, role, jabatan, departemen
) VALUES (
    'USER_ID_DISINI',
    'Admin HRMS', 
    'admin@hospital.com', 
    'admin', 
    'Manager HR', 
    'HR'
);
```

## 🔍 **Debugging Jika Masih Error:**

### **Cek Project Settings:**
1. Buka **Project Settings > API** di Supabase
2. Pastikan **URL** dan **anon key** sama dengan di file `supabaseClient.ts`

### **Current Config (dari kode Anda):**
```
URL: https://qszceobtohrlcdirvqtt.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Jika Berbeda:**
Update file `services/supabaseClient.ts` dengan credentials yang benar.

## ⚡ **Quick Fix Commands:**

**Copy dan jalankan satu per satu di SQL Editor:**

```sql
-- 1. Create units table
CREATE TABLE IF NOT EXISTS public.units (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    nama VARCHAR(255) NOT NULL
);

-- 2. Insert sample data
INSERT INTO public.units (nama) VALUES 
    ('HR'), ('IT'), ('Finance'), ('Medical')
ON CONFLICT DO NOTHING;

-- 3. Test
SELECT * FROM public.units;
```

## 🎉 **Setelah Selesai:**

Status aplikasi akan berubah menjadi:
```
✅ Database terhubung dengan baik
```

**Dan aplikasi siap digunakan!**

---

💡 **Tips:** Jika masih ada masalah, screenshot error message dan Network tab di Developer Tools (F12) untuk debugging lebih lanjut.
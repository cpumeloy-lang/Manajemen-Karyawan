# Setup Autentikasi Mudah - HRMS Pro

> Catatan penting: Jika dokumen ini menyebut localhost, itu hanya untuk development lokal. Untuk staging/production, gunakan domain frontend publik.

## 🚀 Setup Sekali Jalan (One-time Setup)

### 1. Jalankan Database Trigger (WAJIB!)

Buka **Supabase SQL Editor** dan jalankan file:
```
database-trigger-auto-employee.sql
```

Trigger ini akan:
- ✅ **Auto-create** profil employee saat user baru signup
- ✅ **Auto-sync** email jika berubah di auth
- ✅ **Fix** existing users yang belum punya profil
- ✅ **Set admin** untuk user admin@hospital.com

### 2. Clear Browser Data

Di browser:
1. Tekan **F12** → **Console**
2. Jalankan:
```javascript
localStorage.clear();
location.reload();
```

---

## 👤 Cara Penggunaan

### Login Pertama Kali

1. **Buka aplikasi**:
    - Dev lokal: http://localhost:3030/
    - Online/staging/production: https://hrms.perusahaan.com/
2. **Login** dengan email yang sudah ada di Supabase Auth
3. **Profil employee otomatis dibuat** dengan role **"karyawan"** (default)

### Membuat Admin

**Opsi 1: Via SQL (Recommended)**
```sql
-- Set user menjadi admin
UPDATE public.employees 
SET 
  role = 'admin',
  jabatan = 'Manager HR',
  departemen = 'Administrasi'
WHERE email = 'admin@hospital.com';
```

**Opsi 2: Via Aplikasi (setelah ada 1 admin)**
- Login sebagai admin
- Buka menu **Karyawan**
- Edit karyawan yang ingin dijadikan admin
- Ubah **Role** menjadi "admin"

---

## 🎯 Role & Permission

### Role: **Admin**
✅ Akses penuh ke semua menu:
- Dashboard
- Kelola Karyawan (CRUD)
- Kelola Unit Kerja
- Kehadiran
- Penggajian
- Permohonan (Approve/Reject)
- Self Service

### Role: **Karyawan**
✅ Akses terbatas:
- Self Service (lihat data sendiri, ajukan cuti/reimbursement)

❌ Tidak bisa:
- Kelola karyawan lain
- Approve permohonan
- Akses dashboard admin

---

## 🔧 Troubleshooting

### Problem: "Profil karyawan tidak ditemukan"

**Solusi:**
```sql
-- Cek apakah user ada di auth.users
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Jika ada, tapi tidak ada di employees, buat manual:
INSERT INTO public.employees (
    user_id, nama, email, role, jabatan, departemen, status, shift, "hireDate", "birthDate", "sisaCuti"
) VALUES (
    'USER_ID_DARI_QUERY_ATAS',
    'Nama Lengkap',
    'your@email.com',
    'karyawan',  -- atau 'admin'
    'Staff',
    'Umum',
    'Aktif',
    'Pagi',
    CURRENT_DATE,
    '1990-01-01',
    12
);
```

### Problem: "Stuck di Loading"

**Solusi:**
1. Clear browser cache: Ctrl + Shift + Delete
2. Clear local storage: F12 → Application → Clear All
3. Hard refresh: Ctrl + Shift + R

### Problem: Email sudah terdaftar tapi user_id berbeda

**Solusi:**
```sql
-- Update user_id yang benar
UPDATE public.employees 
SET user_id = 'CORRECT_USER_ID_FROM_AUTH_USERS'
WHERE email = 'your@email.com';
```

---

## 📊 Cek Status Database

```sql
-- Lihat semua user dan profil mereka
SELECT 
    u.id as auth_user_id,
    u.email as auth_email,
    e.id as employee_id,
    e.nama,
    e.role,
    e.jabatan
FROM auth.users u
LEFT JOIN public.employees e ON e.user_id = u.id
ORDER BY u.created_at DESC;
```

**Hasil yang baik:**
- Setiap user di `auth.users` punya 1 record di `employees`
- `user_id` di employees match dengan `id` di auth.users
- Email sama di kedua tabel

---

## 🎉 Keuntungan Sistem Baru

✅ **Auto-create profil** saat signup → tidak perlu manual lagi!
✅ **Auto-sync email** jika berubah
✅ **Clear error messages** jika ada masalah
✅ **Role-based access** yang jelas
✅ **Fix existing users** otomatis

---

## 📝 Catatan Penting

1. **Trigger sudah dijalankan?** Cek dengan:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. **Backup database** sebelum migrasi production!

3. **Admin pertama** harus di-set manual via SQL

4. **User baru** otomatis jadi "karyawan", upgrade ke admin manual

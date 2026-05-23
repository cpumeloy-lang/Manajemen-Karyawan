# Setup Database HRMS Pro

> Untuk migrasi penuh dari local Supabase ke Supabase online (schema + data + cutover), gunakan dokumen `SUPABASE_ONLINE_FULL_MIGRATION.md`.

## Langkah-langkah Setup Database di Supabase

### 1. Login ke Supabase Dashboard
- Buka [https://supabase.com](https://supabase.com)
- Login ke akun Anda
- Pilih project yang sudah ada atau buat project baru

### 2. Jalankan Script Database
- Buka **SQL Editor** di dashboard Supabase
- Copy seluruh isi file `database-setup.sql`
- Paste dan jalankan script tersebut
- Script akan membuat:
  - Tabel `units` (unit kerja/departemen)
  - Tabel `employees` (data karyawan)
  - Tabel `attendance` (presensi)
  - Tabel `requests` (permintaan cuti/izin)
  - Tabel `documents` (dokumen karyawan)
  - Row Level Security policies
  - Sample data untuk units

### 3. Buat User Admin Pertama
Setelah menjalankan script utama, buat user admin dengan langkah berikut:

1. **Registrasi user baru** melalui aplikasi atau Supabase Auth
2. **Dapatkan user_id** dari tabel `auth.users`
3. **Jalankan query berikut** (ganti `YOUR_USER_ID` dengan user_id yang sebenarnya):

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
    'YOUR_USER_ID',
    'Admin HRMS',
    'admin@hospital.com',
    'admin',
    'Manager HR',
    'HR',
    'Aktif',
    'Pagi'
);
```

### 4. Verifikasi Setup
Jalankan query berikut untuk memastikan setup berhasil:

```sql
-- Cek tabel units
SELECT * FROM public.units;

-- Cek user admin
SELECT * FROM public.employees WHERE role = 'admin';
```

### 5. Storage Setup (Opsional)
Jika aplikasi menggunakan upload file (foto karyawan, dokumen):

1. Buka **Storage** di dashboard Supabase
2. Buat bucket baru bernama `hrms-files`
3. Set permissions sesuai kebutuhan

### 6. Test Koneksi
Restart aplikasi dan coba login dengan user admin yang telah dibuat.

## Troubleshooting

### Error "Could not find the table 'public.units'"
- Pastikan script database sudah dijalankan
- Cek apakah tabel berhasil dibuat di **Table Editor**

### Error "Row Level Security"
- Pastikan RLS policies sudah dibuat
- User harus sudah login untuk mengakses data

### Error "Foreign Key Constraint"
- Pastikan user_id di tabel employees sesuai dengan id di auth.users
- Buat data karyawan setelah user terdaftar di auth

## Konfigurasi Environment

Pastikan file konfigurasi Supabase sudah benar:
- URL project
- Anonymous key
- Service role key (jika diperlukan)

Lihat file `services/supabaseClient.ts` untuk konfigurasi koneksi.
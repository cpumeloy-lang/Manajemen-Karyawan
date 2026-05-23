# Panduan Menambahkan Fitur Departemen dan Jabatan

## 🎯 Fitur Baru yang Ditambahkan

1. **Departemen** - Struktur organisasi berdasarkan fungsi (Medis, Keperawatan, dll)
2. **Jabatan** - Posisi/peran karyawan (Dokter, Perawat, Apoteker, dll)
3. **Menu Pengaturan Organisasi** - Menggabungkan Unit Kerja, Departemen, dan Jabatan

## 📋 Langkah-langkah Implementasi

### 1. Jalankan SQL di Supabase

1. Buka dashboard Supabase Anda
2. Pergi ke **SQL Editor**
3. Copy dan paste isi file `database-add-departments-positions.sql`
4. Klik **Run** untuk menjalankan query

### 2. Struktur Tabel yang Dibuat

#### Tabel `departments`:
- `id` (UUID) - Primary key
- `nama` (TEXT) - Nama departemen (unique)
- `created_at` (TIMESTAMP) - Waktu pembuatan

#### Tabel `positions`:
- `id` (UUID) - Primary key
- `nama` (TEXT) - Nama jabatan (unique)
- `created_at` (TIMESTAMP) - Waktu pembuatan

### 3. Data Default

**Departemen yang ditambahkan:**
- Departemen Medis
- Departemen Keperawatan
- Departemen Penunjang Medis
- Departemen Administrasi
- Departemen Keuangan
- Departemen SDM

**Jabatan yang ditambahkan:**
- Dokter Umum
- Dokter Spesialis
- Perawat
- Bidan
- Apoteker
- Analis Laboratorium
- Radiografer
- Tenaga Administrasi
- Staf Keuangan
- Manajer
- Direktur

## 🔐 Keamanan (Row Level Security)

- **Admin**: Dapat melakukan semua operasi (CREATE, READ, UPDATE, DELETE)
- **Karyawan**: Hanya dapat membaca (READ)

## 🎨 Perubahan UI

### Menu Baru: **Pengaturan Organisasi**
Menggantikan menu "Unit Kerja" dengan 3 tab:
1. **Departemen** - Kelola departemen
2. **Jabatan** - Kelola jabatan
3. **Unit Kerja** - Kelola unit kerja (tetap ada)

### Cara Mengakses:
1. Login sebagai **Admin**
2. Klik menu **"Pengaturan Organisasi"** di sidebar
3. Pilih tab yang ingin dikelola (Departemen / Jabatan / Unit Kerja)

## ✅ Checklist

- [ ] Jalankan file SQL `database-add-departments-positions.sql` di Supabase
- [ ] Refresh aplikasi
- [ ] Login sebagai admin
- [ ] Buka menu "Pengaturan Organisasi"
- [ ] Cek apakah data default muncul di tab Departemen dan Jabatan
- [ ] Coba tambah/edit/hapus departemen
- [ ] Coba tambah/edit/hapus jabatan

## 🐛 Troubleshooting

**Jika menu tidak muncul:**
- Pastikan Anda login sebagai admin (role = 'admin')
- Hard refresh browser (Ctrl + Shift + R atau Cmd + Shift + R)

**Jika data tidak muncul:**
- Cek di Supabase apakah tabel `departments` dan `positions` sudah terbuat
- Cek apakah RLS (Row Level Security) policy sudah aktif
- Lihat console browser untuk error

**Jika tidak bisa menambah/edit:**
- Pastikan user Anda memiliki role 'admin' di tabel employees
- Cek policy di Supabase

## 📝 Catatan

- Field `jabatan` dan `departemen` di tabel `employees` saat ini masih berupa TEXT
- Untuk fitur lebih lanjut, bisa diubah menjadi foreign key ke tabel `positions` dan `departments`
- Ini akan memberikan referential integrity dan dropdown otomatis di form karyawan

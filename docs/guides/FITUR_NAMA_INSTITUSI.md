# Fitur Pengaturan Nama Institusi

## Deskripsi
Aplikasi HRMS Pro sekarang mendukung kustomisasi nama institusi yang dapat disesuaikan dengan rumah sakit atau klinik yang menggunakannya. Nama institusi akan ditampilkan di sidebar aplikasi menggantikan "HRMS Pro" sebagai nama default.

## Fitur yang Ditambahkan

### 1. Tabel Database `system_settings`
Tabel baru untuk menyimpan pengaturan sistem aplikasi:
- `id`: UUID primary key
- `institution_name`: Nama institusi (default: "HRMS Pro")
- `institution_type`: Jenis institusi (Rumah Sakit/Klinik/Puskesmas)
- `logo_url`: URL logo institusi (opsional)
- `address`: Alamat lengkap institusi
- `phone`: Nomor telepon institusi
- `updated_at`: Timestamp update terakhir

### 2. Komponen `SystemSettings.tsx`
Komponen baru untuk mengelola pengaturan sistem dengan fitur:
- Menampilkan pengaturan sistem saat ini
- Mode edit untuk mengubah pengaturan
- Form validasi untuk data yang diperlukan
- Update otomatis timestamp saat data diubah

### 3. Menu "Pengaturan Sistem"
Menu baru di sidebar admin untuk mengakses pengaturan sistem.

### 4. Dynamic Institution Name
Nama institusi di sidebar sekarang dinamis dan akan menampilkan:
- Nama institusi yang dikonfigurasi (jika sudah diatur)
- "HRMS Pro" sebagai default (jika belum diatur)

## Cara Menggunakan

### Setup Database

1. **Jalankan file SQL** `database-add-system-settings.sql` di Supabase Query Editor:
   - Login ke Supabase Dashboard
   - Pilih project Anda
   - Buka "SQL Editor"
   - Copy isi file `database-add-system-settings.sql`
   - Paste dan klik "Run"

2. **Verifikasi tabel berhasil dibuat**:
   ```sql
   SELECT * FROM system_settings;
   ```
   Anda akan melihat satu baris dengan data default.

### Mengatur Nama Institusi

1. **Login sebagai Admin**
   - Pastikan Anda login dengan akun yang memiliki role "admin"

2. **Buka Menu Pengaturan Sistem**
   - Klik menu "Pengaturan Sistem" di sidebar
   - Anda akan melihat pengaturan sistem saat ini

3. **Edit Pengaturan**
   - Klik tombol "Edit"
   - Isi form dengan data institusi Anda:
     - **Nama Institusi** (wajib): Contoh "RS Harapan Sehat"
     - **Jenis Institusi** (wajib): Pilih Rumah Sakit/Klinik/Puskesmas
     - **Alamat**: Alamat lengkap institusi
     - **Telepon**: Nomor telepon institusi

4. **Simpan Perubahan**
   - Klik tombol "Simpan"
   - Nama institusi di sidebar akan langsung berubah

## Struktur File

### File Baru
- `components/SystemSettings.tsx` - Komponen pengaturan sistem
- `database-add-system-settings.sql` - Script SQL untuk tabel system_settings
- `FITUR_NAMA_INSTITUSI.md` - Dokumentasi fitur (file ini)

### File yang Dimodifikasi
- `types.ts` - Menambahkan interface `SystemSettings`
- `App.tsx` - Menambahkan:
  - Import `SystemSettings` type dan component
  - State `systemSettings`
  - Function `handleUpdateSystemSettings()`
  - View case `'system'`
  - Menu "Pengaturan Sistem" di sidebar
  - Dynamic institution name di header sidebar
- `components/icons.tsx` - Menambahkan `CheckIcon`

## Security (RLS Policies)

### Admin Policy
Admin dapat melakukan semua operasi (SELECT, INSERT, UPDATE, DELETE) pada tabel `system_settings`.

### User Policy
Semua pengguna yang terautentikasi dapat membaca (SELECT) pengaturan sistem untuk menampilkan nama institusi di UI.

## Default Values

Saat tabel pertama kali dibuat, akan terisi dengan data default:
- **Nama Institusi**: "HRMS Pro"
- **Jenis Institusi**: "Rumah Sakit"
- **Alamat**: "" (kosong)
- **Telepon**: "" (kosong)

## Catatan Penting

1. **Hanya ada satu baris** di tabel `system_settings` yang merepresentasikan pengaturan untuk seluruh sistem
2. **Admin harus mengupdate** data default dengan informasi institusi yang sebenarnya
3. **Nama institusi akan langsung terlihat** di sidebar setelah disimpan (tanpa perlu refresh browser)
4. **Update timestamp** akan otomatis diperbarui setiap kali ada perubahan pengaturan

## Pengembangan Selanjutnya

Fitur yang bisa ditambahkan di masa mendatang:
- Upload dan tampilkan logo institusi
- Kustomisasi warna tema sesuai branding institusi
- Pengaturan format tanggal dan mata uang
- Pengaturan email dan notifikasi
- Multi-tenancy untuk mendukung beberapa institusi dalam satu aplikasi

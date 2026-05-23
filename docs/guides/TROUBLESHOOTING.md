# Troubleshooting HRMS Pro

## Error: "Could not find the table 'public.units'"

### Penyebab
Tabel database belum dibuat di Supabase.

### Solusi
1. **Pastikan project Supabase sudah dibuat**
   - Login ke [supabase.com](https://supabase.com)
   - Pastikan project sudah ada dan aktif

2. **Jalankan script database**
   - Buka SQL Editor di dashboard Supabase
   - Copy dan paste isi file `database-setup.sql`
   - Klik "Run" untuk menjalankan script

3. **Verifikasi tabel berhasil dibuat**
   ```sql
   SELECT * FROM public.units;
   ```

4. **Buat user admin pertama**
   - Daftar user baru melalui aplikasi atau auth Supabase
   - Catat user_id dari tabel auth.users
   - Jalankan query untuk membuat employee admin:
   ```sql
   INSERT INTO public.employees (user_id, nama, email, role, jabatan, departemen)
   VALUES ('USER_ID_DARI_AUTH', 'Admin', 'admin@hospital.com', 'admin', 'Manager', 'HR');
   ```

## Error: "Row Level Security"

### Penyebab
User tidak memiliki permission untuk mengakses data.

### Solusi
1. **Pastikan RLS policies sudah dibuat** (sudah ada di script database)
2. **Pastikan user sudah login** sebelum mengakses data
3. **Cek apakah employee record ada** untuk user yang login

## Error: "Invalid API Key"

### Penyebab
Konfigurasi Supabase tidak benar.

### Solusi
1. **Update file `services/supabaseClient.ts`**
   ```typescript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

2. **Dapatkan credentials dari dashboard Supabase**
   - Project Settings > API
   - Copy URL dan anon/public key

## Error: "Network Error"

### Penyebab
Masalah koneksi internet atau firewall.

### Solusi
1. **Cek koneksi internet**
2. **Pastikan tidak ada firewall yang memblokir**
3. **Coba akses dashboard Supabase di browser**

## Aplikasi Tidak Memuat Data

### Debugging Steps
1. **Buka Developer Tools (F12)**
2. **Cek Console tab untuk error messages**
3. **Cek Network tab untuk failed requests**

### Common Issues
1. **Database belum di-setup** → Ikuti langkah setup database
2. **User belum dibuat di tabel employees** → Buat record employee
3. **RLS blocking access** → Pastikan policies sudah benar

## Login Berhasil Tapi Tidak Ada Data

### Penyebab
Employee record tidak ada untuk user yang login.

### Solusi
```sql
-- Cek apakah employee record ada
SELECT * FROM public.employees WHERE user_id = 'USER_ID';

-- Jika tidak ada, buat record baru
INSERT INTO public.employees (user_id, nama, email, role, jabatan, departemen)
VALUES ('USER_ID', 'Nama User', 'email@hospital.com', 'karyawan', 'Staff', 'Departemen');
```

## Performance Issues

### Optimisasi
1. **Index yang diperlukan** (sudah ada di script)
2. **Limit query results** jika data banyak
3. **Pagination** untuk tabel besar

## Backup & Recovery

### Backup Database
```sql
-- Export data penting
SELECT * FROM public.employees;
SELECT * FROM public.units;
SELECT * FROM public.attendance;
```

### Recovery
1. **Restore dari backup Supabase**
2. **Re-run database setup script**
3. **Import data dari export**

## Contact & Support

Jika masalah masih berlanjut:
1. **Cek logs di Supabase dashboard**
2. **Screenshot error messages**
3. **Dokumentasikan langkah-langkah yang menyebabkan error**
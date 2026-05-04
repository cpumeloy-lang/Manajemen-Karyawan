# Setup Dashboard Kepala Ruangan

## Arsitektur Aktif

Dokumen ini mengikuti arsitektur aktif aplikasi:

- Tabel master unit: `public.units`
- Relasi unit karyawan: `employees."unitKerjaId" -> units.id`
- Kepala ruangan diarahkan ke unit yang sama melalui `unitKerjaId`
- `managed_unit_id` bersifat kompatibilitas lama (opsional), bukan sumber data utama

## Persyaratan Database

Jalankan SQL berikut di Supabase SQL Editor jika belum tersedia:

```sql
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'));

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS role VARCHAR(20)
CHECK (role IN ('admin', 'hrd', 'kepala_ruangan', 'karyawan'))
DEFAULT 'karyawan';

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS "unitKerjaId" TEXT REFERENCES public.units(id);
```

## Penugasan Kepala Ruangan

Set role dan unit kelola pada kolom utama `unitKerjaId`:

```sql
UPDATE employees
SET
    role = 'kepala_ruangan',
    "unitKerjaId" = (SELECT id FROM units WHERE nama = 'IGD' LIMIT 1)
WHERE nama = 'Dr. Budi Santoso';
```

Verifikasi:

```sql
SELECT nama, role, "unitKerjaId"
FROM employees
WHERE role = 'kepala_ruangan';
```

## Fitur Dashboard Kepala Ruangan

- Ringkasan unit: total karyawan, kehadiran hari ini, distribusi shift
- Statistik kehadiran: hadir/tidak hadir/cuti-sakit
- Quick actions: jadwal unit, kehadiran, monitoring tim
- Alert operasional: peringatan kehadiran rendah

## Cara Penggunaan

1. Login sebagai user role `kepala_ruangan`.
2. Pastikan user memiliki `unitKerjaId` yang valid ke tabel `units`.
3. Buka menu `Jadwal Unit` untuk mengatur shift tim pada unit tersebut.
4. Buka menu `Kehadiran` untuk memantau presensi unit.

## Catatan Penting

- Jangan membuat tabel `work_units` baru untuk fitur ini.
- Jika Anda masih memiliki script lama berbasis `work_units`, anggap sebagai legacy dan jangan dipakai untuk instalasi baru.
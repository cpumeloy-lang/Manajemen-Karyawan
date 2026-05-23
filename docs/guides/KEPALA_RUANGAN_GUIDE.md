# Panduan Kepala Ruangan (Arsitektur Terkini)

## Tujuan

Fitur kepala ruangan digunakan untuk mengelola jadwal shift dan monitoring kehadiran karyawan pada unit yang sama.

## Model Data Aktif

Gunakan model berikut untuk instalasi baru:

- Tabel unit: `public.units`
- Unit karyawan/kepala ruangan: `employees."unitKerjaId"`
- Role: `employees.role` dengan nilai: `admin`, `hrd`, `kepala_ruangan`, `karyawan`

Catatan:
- `managed_unit_id` adalah kolom kompatibilitas lama. Bisa dipertahankan, tetapi bukan sumber utama.
- Jangan membuat tabel `work_units` baru untuk fitur ini.

## SQL Setup Minimum

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

## Menetapkan Kepala Ruangan

```sql
UPDATE employees
SET
  role = 'kepala_ruangan',
  "unitKerjaId" = (SELECT id FROM units WHERE nama = 'IGD' LIMIT 1)
WHERE email = 'kepala.igd@hospital.com';
```

Verifikasi:

```sql
SELECT nama, role, "unitKerjaId"
FROM employees
WHERE role = 'kepala_ruangan';
```

## Alur Penggunaan

1. Login sebagai user dengan role `kepala_ruangan`.
2. Sistem membaca unit dari `unitKerjaId`.
3. Halaman dashboard kepala ruangan menampilkan statistik unit tersebut.
4. Halaman jadwal unit memungkinkan update shift anggota unit.

## Troubleshooting

### Menu jadwal unit tidak muncul
- Pastikan `role = 'kepala_ruangan'`.
- Pastikan user sudah login ulang setelah perubahan role.

### Dashboard kepala ruangan kosong
- Cek `unitKerjaId` kepala ruangan valid ke `units.id`.
- Cek anggota unit memiliki `unitKerjaId` yang sama.

### Gagal simpan jadwal
- Periksa koneksi Supabase dan RLS policy.
- Periksa error detail di browser console.

## Checklist

- [ ] Role kepala ruangan sudah di-set
- [ ] `unitKerjaId` kepala ruangan terisi valid
- [ ] Data unit tersedia di `units`
- [ ] Anggota unit memiliki `unitKerjaId` yang sama
- [ ] Uji ubah shift berhasil tersimpan

# Implementasi Role Kepala Ruangan - Ringkasan Terkini

## Status

Model unit untuk fitur kepala ruangan sudah disederhanakan menjadi satu sumber data:

- Master unit: `public.units`
- Relasi unit pengguna: `employees."unitKerjaId"`
- Dashboard dan jadwal kepala ruangan membaca unit dari `units`
- Referensi `work_units` dianggap legacy dan tidak dipakai untuk setup baru

## Dampak Perubahan

1. Konsistensi frontend
- Komponen kepala ruangan tidak lagi bergantung pada tabel unit ganda
- Perubahan shift dan statistik unit bekerja pada ID unit yang sama (`unitKerjaId`)

2. Konsistensi setup database
- Setup DB di UI tidak lagi mengeksekusi SQL langsung via RPC
- Setup diarahkan ke download/copy SQL untuk dieksekusi manual di SQL Editor

3. Konsistensi data operasional
- Import karyawan dan CRUD mengikuti mapper kolom DB yang sama
- Service dokumen menulis kolom sesuai schema aktif

## SQL Penetapan Kepala Ruangan (Direkomendasikan)

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

## Catatan Kompatibilitas

Kolom `managed_unit_id` boleh tetap ada untuk kompatibilitas lama, tetapi jangan dijadikan sumber data utama pada implementasi baru.

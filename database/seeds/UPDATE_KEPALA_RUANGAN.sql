-- ============================================
-- UPDATE ROLE KEPALA RUANGAN - Contoh Penggunaan
-- ============================================
-- File ini berisi contoh cara mengupdate role karyawan menjadi kepala_ruangan
-- dan menghubungkan mereka dengan unit kerja yang mereka kelola
-- ============================================

-- 1. Lihat daftar unit kerja yang tersedia
SELECT id, nama FROM units ORDER BY nama;

-- 2. Lihat karyawan yang bisa dijadikan kepala ruangan
-- (Biasanya yang memiliki jabatan supervisor, manager, atau kepala)
SELECT 
    id, 
    nama, 
    jabatan, 
    departemen,
    role,
    "unitKerjaId" as unit_kerja_saat_ini
FROM employees
WHERE jabatan ILIKE '%kepala%' 
   OR jabatan ILIKE '%supervisor%' 
   OR jabatan ILIKE '%manager%'
ORDER BY nama;

-- 3. Update role karyawan menjadi kepala_ruangan dan assign unit yang dikelola
-- CONTOH: Mengubah karyawan dengan ID 'xxx' menjadi kepala ruangan untuk unit 'yyy'
-- Ganti 'EMPLOYEE_ID_HERE' dengan ID karyawan yang sebenarnya
-- Ganti 'UNIT_ID_HERE' dengan ID unit kerja yang sebenarnya

-- Uncomment dan edit query di bawah ini:
/*
UPDATE employees
SET 
    role = 'kepala_ruangan',
    "unitKerjaId" = 'UNIT_ID_HERE'
WHERE id = 'EMPLOYEE_ID_HERE';
*/

-- 4. Verifikasi perubahan
-- Uncomment untuk melihat kepala ruangan yang sudah diset:
/*
SELECT 
    e.id,
    e.nama,
    e.jabatan,
    e.role,
    u.nama as unit_yang_dikelola
FROM employees e
LEFT JOIN units u ON e."unitKerjaId" = u.id
WHERE e.role = 'kepala_ruangan';
*/

-- ============================================
-- CATATAN PENTING:
-- ============================================
-- 1. Satu unit kerja bisa memiliki lebih dari satu kepala ruangan (shift berbeda)
-- 2. Kepala ruangan tetap bisa mengakses fitur Self-Service seperti karyawan biasa
-- 3. Kepala ruangan hanya bisa mengatur jadwal untuk unit yang di-assign ke mereka
-- 4. Role yang tersedia: 'admin', 'hrd', 'kepala_ruangan', 'karyawan'
-- 5. Untuk mengembalikan ke karyawan biasa, set role = 'karyawan' dan "unitKerjaId" sesuai unit kerja normal
-- ============================================

-- Contoh lengkap untuk beberapa kepala ruangan:
/*
-- Kepala Ruangan IGD
UPDATE employees
SET 
    role = 'kepala_ruangan',
    "unitKerjaId" = (SELECT id FROM units WHERE nama = 'IGD' LIMIT 1)
WHERE nama = 'Dr. Budi Santoso';

-- Kepala Ruangan Rawat Inap
UPDATE employees
SET 
    role = 'kepala_ruangan',
    "unitKerjaId" = (SELECT id FROM units WHERE nama = 'Rawat Inap' LIMIT 1)
WHERE nama = 'Ns. Siti Nurjanah';

-- Kepala Ruangan Radiologi
UPDATE employees
SET 
    role = 'kepala_ruangan',
    "unitKerjaId" = (SELECT id FROM units WHERE nama = 'Radiologi' LIMIT 1)
WHERE nama = 'Ahmad Radiografer';
*/

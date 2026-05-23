-- Script untuk membersihkan tabel yang sudah ada dengan tipe UUID
-- Jalankan ini HANYA jika sudah ada tabel dengan tipe UUID yang salah

-- Drop semua tabel dalam urutan yang benar (karena foreign key constraints)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;

-- Drop policies jika ada
DROP POLICY IF EXISTS "Units dapat dibaca oleh user yang login" ON public.units;
DROP POLICY IF EXISTS "Units dapat diubah oleh admin" ON public.units;
DROP POLICY IF EXISTS "Employees dapat dibaca oleh user yang login" ON public.employees;
DROP POLICY IF EXISTS "Employees dapat diubah oleh admin atau diri sendiri" ON public.employees;
DROP POLICY IF EXISTS "Attendance dapat dibaca oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Attendance dapat diinput oleh admin atau karyawan sendiri" ON public.attendance;
DROP POLICY IF EXISTS "Requests dapat dibaca oleh admin atau karyawan sendiri" ON public.requests;
DROP POLICY IF EXISTS "Requests dapat dibuat oleh karyawan sendiri" ON public.requests;
DROP POLICY IF EXISTS "Requests dapat diupdate oleh admin" ON public.requests;
DROP POLICY IF EXISTS "Documents dapat dibaca oleh admin atau karyawan sendiri" ON public.documents;
DROP POLICY IF EXISTS "Documents dapat diupload oleh admin atau karyawan sendiri" ON public.documents;

-- Drop function dan triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Setelah menjalankan script ini, jalankan database-setup.sql yang sudah diperbaiki
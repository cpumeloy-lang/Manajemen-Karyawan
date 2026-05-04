# Fix: Error "entity_id is of type uuid but expression is of type text"

## 🔴 Problem
Saat karyawan mengajukan permohonan cuti, muncul error:
```
Gagal mengajukan permohonan: column "entity_id" is of type uuid but expression is of type text
```

## 🔍 Root Cause
1. Tabel `requests` menggunakan kolom `id` dengan tipe **TEXT**
2. Tabel `audit_logs` menggunakan kolom `entity_id` dengan tipe **UUID**
3. Ada trigger `audit_requests_trigger` yang otomatis mencatat aktivitas ke audit_logs
4. Saat trigger berjalan, ia mencoba insert `NEW.id` (TEXT) ke `entity_id` (UUID) → **TYPE MISMATCH ERROR**

## ✅ Solution
Ubah tipe kolom `entity_id` di tabel `audit_logs` dari **UUID** menjadi **TEXT** agar kompatibel dengan semua tabel (employees, requests, attendance, dll) yang menggunakan TEXT sebagai ID.

## 🔧 Langkah Perbaikan

### 1. Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Ubah tipe kolom entity_id dari UUID ke TEXT
ALTER TABLE public.audit_logs 
    ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

-- Recreate index
DROP INDEX IF EXISTS public.idx_audit_logs_entity_id;
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
```

**ATAU gunakan file yang sudah disediakan:**
- Buka file: `fix-audit-log-entity-id.sql`
- Copy semua isinya
- Paste dan jalankan di Supabase SQL Editor

### 2. Verifikasi
Setelah SQL dijalankan:
1. Coba ajukan permohonan cuti dari dashboard karyawan
2. Permohonan seharusnya berhasil terkirim
3. Audit log akan tercatat dengan benar

## 📊 Perubahan Schema

**BEFORE:**
```sql
CREATE TABLE public.audit_logs (
    ...
    entity_id UUID,  -- ❌ UUID tidak cocok dengan tabel lain
    ...
);
```

**AFTER:**
```sql
CREATE TABLE public.audit_logs (
    ...
    entity_id TEXT,  -- ✅ TEXT cocok dengan semua tabel
    ...
);
```

## 📝 File Terkait
- `database-audit-log.sql` - File original yang membuat tabel audit_logs
- `fix-audit-log-entity-id.sql` - **File fix yang harus dijalankan**
- `App.tsx` - Sudah diperbaiki status request dari 'Diajukan' → 'Pending'

## ✨ Status
- ✅ Kode frontend sudah diperbaiki (status: 'Pending')
- ⏳ Menunggu eksekusi SQL fix di Supabase

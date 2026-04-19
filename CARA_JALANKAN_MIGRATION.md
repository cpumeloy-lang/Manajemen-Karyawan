# 🚀 CARA MENJALANKAN DATABASE MIGRATION

## ❗ ERROR YANG TERJADI
```
Could not find the 'bankAccount' column of 'employees' in the schema cache
```

**Penyebab:** Kolom-kolom baru belum ditambahkan ke database Supabase.

---

## ✅ SOLUSI - Jalankan SQL Migration

### LANGKAH 1: Buka Supabase Dashboard
1. Buka browser ke **https://supabase.com**
2. Login ke project Anda
3. Pilih project HRMS Pro

### LANGKAH 2: Buka SQL Editor
1. Di sidebar kiri, klik **"SQL Editor"**
2. Klik **"New Query"** atau tombol **"+"**

### LANGKAH 3: Copy-Paste SQL Script
Buka file: **`RUN_THIS_IN_SUPABASE.sql`** (ada di folder root project)

Atau copy script ini:

```sql
-- Tambah kolom personal & contact
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ktp_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS npwp VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_kesehatan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0;

-- Tambah kolom JSONB untuk data kompleks
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account JSONB;
```

### LANGKAH 4: Jalankan Script
1. Paste script di SQL Editor
2. Klik tombol **"Run"** atau tekan **Ctrl + Enter**
3. Tunggu sampai muncul pesan sukses

### LANGKAH 5: Verifikasi (Opsional)
Jalankan query ini untuk memastikan kolom sudah ada:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN (
    'ktp_number', 'npwp', 'bpjs_kesehatan', 'bank_account', 'address'
)
ORDER BY column_name;
```

Harusnya muncul 5 rows (ktp_number, npwp, bpjs_kesehatan, bank_account, address).

---

## ✅ SETELAH MIGRATION BERHASIL

1. **Refresh aplikasi** di browser (F5)
2. **Coba tambah karyawan baru**
3. **Error "Could not find column" seharusnya hilang**

---

## 📝 CATATAN

- Script ini **aman dijalankan berkali-kali** (menggunakan `IF NOT EXISTS`)
- Jika kolom sudah ada, script akan skip tanpa error
- Data existing tidak akan hilang
- Script lengkap ada di file: `database-employee-complete-data.sql`

---

## 🆘 JIKA MASIH ERROR

1. Cek apakah Anda login ke project Supabase yang benar
2. Pastikan table `employees` ada di database
3. Cek error message di Supabase SQL Editor
4. Screenshot error dan tanyakan ke saya

---

## ⏱️ ESTIMASI WAKTU: 3-5 menit

Good luck! 🚀

# 📋 AUDIT LOG / HISTORY AKTIVITAS

## 🎯 Fitur Audit Log

Sistem **Audit Log** mencatat **semua aktivitas** yang dilakukan oleh admin, termasuk:

- ✅ **CREATE** - Penambahan data baru (karyawan, departemen, unit kerja, dll)
- ✏️ **UPDATE** - Perubahan data (edit karyawan, ubah status, dll)
- 🗑️ **DELETE** - Penghapusan data

### Informasi yang Dicatat:
- 👤 **Siapa** yang melakukan perubahan (nama, email)
- 📝 **Apa** yang diubah (tipe data, nama data)
- 🔄 **Detail perubahan** (data lama → data baru)
- 🕐 **Kapan** perubahan dilakukan (tanggal & waktu)
- 📊 **Ringkasan** perubahan (field mana saja yang berubah)

---

## 🚀 Cara Setup Audit Log

### **Langkah 1: Jalankan Script Database**

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com
   - Pilih project Anda

2. **Buka SQL Editor**
   - Klik menu **"SQL Editor"** di sidebar kiri
   - Klik **"New Query"**

3. **Copy & Paste Script**
   - Buka file `database-audit-log.sql`
   - Copy **SEMUA** isi file
   - Paste ke SQL Editor

4. **Run Script**
   - Klik tombol **"Run"** (atau Ctrl + Enter)
   - Tunggu hingga selesai (biasanya 2-3 detik)
   - Pastikan muncul "Success. No rows returned"

---

## ✅ Verifikasi Setup

### **Cek Tabel audit_logs:**

```sql
-- Lihat struktur tabel
SELECT * FROM audit_logs LIMIT 10;

-- Cek jika trigger sudah aktif
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%';
```

Seharusnya muncul triggers:
- `audit_employees_trigger`
- `audit_attendance_trigger`
- `audit_requests_trigger`
- `audit_units_trigger`
- `audit_departments_trigger`
- `audit_positions_trigger`

---

## 🎨 Cara Menggunakan

### **1. Akses Audit Log (Admin Only)**

Setelah login sebagai **admin**:
1. Lihat sidebar kiri
2. Klik tombol **"📋 History Aktivitas"** (di atas tombol Logout)
3. Modal Audit Log akan terbuka

### **2. Filter Audit Log**

Anda bisa filter berdasarkan:

- **Aksi:** CREATE / UPDATE / DELETE
- **Tipe Data:** Karyawan, Absensi, Pengajuan, Unit Kerja, dll
- **User:** Email admin tertentu
- **Tanggal:** Dari tanggal - Sampai tanggal
- **Cari:** Cari kata kunci di deskripsi

### **3. Lihat Detail Perubahan**

- Klik pada log untuk **expand** detail
- Untuk **UPDATE**: Akan muncul field yang berubah (nilai lama → nilai baru)
- Untuk **DELETE**: Akan muncul data yang dihapus
- Untuk **CREATE**: Akan muncul data yang ditambahkan

---

## 📊 Contoh Use Case

### **Use Case 1: Cek Siapa yang Menghapus Karyawan**

1. Buka History Aktivitas
2. Filter:
   - Aksi: `DELETE`
   - Tipe Data: `Karyawan`
3. Lihat hasil: Siapa admin yang menghapus, kapan, dan data apa yang dihapus

### **Use Case 2: Track Perubahan Gaji Karyawan**

1. Buka History Aktivitas
2. Filter:
   - Aksi: `UPDATE`
   - Tipe Data: `Karyawan`
   - Cari: Nama karyawan
3. Expand log → Lihat field `gajiPokok` atau `tunjanganProfesi`
4. Akan terlihat:
   ```
   gajiPokok:
     Lama: 5000000
     Baru: 6000000
   ```

### **Use Case 3: Audit Aktivitas Admin Baru**

1. Buka History Aktivitas
2. Filter:
   - User: Email admin baru
3. Lihat semua aktivitas yang dilakukan admin tersebut

### **Use Case 4: Lihat Aktivitas Hari Ini**

1. Buka History Aktivitas
2. Filter:
   - Dari Tanggal: Hari ini
   - Sampai Tanggal: Hari ini
3. Lihat semua perubahan hari ini

---

## 🔐 Keamanan & RLS

### **Row Level Security (RLS):**

- ✅ **Admin dapat melihat** semua audit logs
- ✅ **Admin dapat membuat** audit logs (otomatis via trigger)
- ❌ **Tidak ada yang bisa UPDATE** audit logs (immutable)
- ❌ **Tidak ada yang bisa DELETE** audit logs (permanent record)
- ❌ **Karyawan biasa TIDAK bisa akses** audit logs

### **Otomatis Logging:**

Audit log **otomatis tercatat** via database triggers, jadi:
- Admin **tidak perlu manual** mencatat
- **Tidak bisa dimanipulasi** (langsung dari database)
- **Tidak bisa dihapus** (permanent)

---

## 🛠️ Query Manual (Advanced)

Jika perlu query langsung di Supabase SQL Editor:

### **Lihat semua aktivitas:**
```sql
SELECT * FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 100;
```

### **Lihat aktivitas user tertentu:**
```sql
SELECT * FROM audit_logs 
WHERE user_email = 'admin@example.com' 
ORDER BY created_at DESC;
```

### **Lihat perubahan pada karyawan tertentu:**
```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'employees' 
  AND entity_id = 'xxx-xxx-xxx-xxx' 
ORDER BY created_at DESC;
```

### **Lihat aktivitas hari ini:**
```sql
SELECT * FROM audit_logs 
WHERE created_at >= CURRENT_DATE 
ORDER BY created_at DESC;
```

### **Lihat aktivitas dalam 7 hari terakhir:**
```sql
SELECT * FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '7 days' 
ORDER BY created_at DESC;
```

### **Lihat hanya DELETE actions:**
```sql
SELECT * FROM audit_logs 
WHERE action = 'DELETE' 
ORDER BY created_at DESC;
```

### **Hitung jumlah aktivitas per user:**
```sql
SELECT 
  user_name,
  user_email,
  COUNT(*) as total_activities,
  COUNT(*) FILTER (WHERE action = 'CREATE') as creates,
  COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
  COUNT(*) FILTER (WHERE action = 'DELETE') as deletes
FROM audit_logs
GROUP BY user_name, user_email
ORDER BY total_activities DESC;
```

---

## 🧹 Maintenance

### **Clean Up Old Logs (Optional):**

Jika audit log sudah terlalu banyak (> 100,000 records), bisa hapus yang lama:

```sql
-- HATI-HATI! Hapus logs lebih dari 1 tahun
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

⚠️ **WARNING:** Hanya lakukan ini jika benar-benar perlu!

---

## 🎯 Best Practices

1. **Review Audit Log Secara Berkala**
   - Setiap minggu/bulan, review aktivitas admin
   - Cari aktivitas mencurigakan (banyak DELETE, perubahan gaji besar, dll)

2. **Export Audit Log untuk Archiving**
   - Download CSV dari Supabase Table Editor
   - Simpan di file server untuk compliance

3. **Set Retention Policy**
   - Tentukan berapa lama audit log disimpan (1 tahun? 2 tahun?)
   - Setup job untuk hapus otomatis logs lama

4. **Monitor Storage Usage**
   - Audit logs bisa memakan banyak space
   - Monitor storage di Supabase Dashboard
   - Upgrade plan jika perlu

---

## 🐛 Troubleshooting

### **Audit Log tidak muncul:**

1. **Cek apakah script sudah dijalankan:**
   ```sql
   SELECT * FROM audit_logs LIMIT 1;
   ```
   Jika error "relation does not exist" → Script belum dijalankan

2. **Cek apakah trigger aktif:**
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name LIKE 'audit_%';
   ```
   Jika kosong → Trigger belum dibuat

3. **Cek RLS Policy:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'audit_logs';
   ```
   Harus ada policy untuk admin

### **User tidak bisa melihat audit log:**

1. Pastikan user adalah **admin** (role = 'admin' di tabel employees)
2. Pastikan RLS policy sudah dibuat dengan benar
3. Try manual query di SQL Editor sebagai test

### **Audit log tidak tercatat otomatis:**

1. Cek apakah trigger ada dan aktif
2. Pastikan ada session auth (auth.uid() tidak null)
3. Cek function `create_audit_log()` tidak error

---

## 📚 Referensi

- **Supabase Triggers:** https://supabase.com/docs/guides/database/triggers
- **PostgreSQL Triggers:** https://www.postgresql.org/docs/current/trigger-definition.html
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security

---

**✅ Setup selesai! Sekarang semua aktivitas admin akan tercatat otomatis!** 🎉

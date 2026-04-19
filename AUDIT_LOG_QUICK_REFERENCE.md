# 🚀 AUDIT LOG - QUICK REFERENCE

## 📋 Setup (One-time)

1. **Buka Supabase Dashboard** → SQL Editor
2. **Copy** isi file `database-audit-log.sql`
3. **Paste & Run** di SQL Editor
4. **Done!** ✅

---

## 👀 Cara Lihat Audit Log

1. Login sebagai **Admin**
2. Sidebar → Klik **"📋 History Aktivitas"**
3. Modal terbuka dengan semua logs

---

## 🎯 Apa Saja yang Tercatat?

### **Otomatis (Tanpa Kode):**
- ✅ Tambah/Edit/Hapus **Karyawan**
- ✅ Tambah/Edit/Hapus **Absensi**
- ✅ Tambah/Edit/Hapus **Pengajuan** (Cuti/Reimbursement)
- ✅ Tambah/Edit/Hapus **Unit Kerja**
- ✅ Tambah/Edit/Hapus **Departemen**
- ✅ Tambah/Edit/Hapus **Jabatan**

### **Manual (Perlu Kode):**
```typescript
import { createAuditLog } from './services/auditLogService';

await createAuditLog({
    action: 'UPDATE',
    entityType: 'request',
    entityId: id,
    entityName: name,
    description: 'Menyetujui pengajuan cuti',
    oldData: { status: 'pending' },
    newData: { status: 'approved' }
});
```

---

## 🔍 Filter & Search

- **Aksi:** CREATE / UPDATE / DELETE
- **Tipe:** Karyawan, Absensi, Pengajuan, dll
- **User:** Email admin tertentu
- **Tanggal:** Range tanggal
- **Cari:** Keyword di deskripsi

---

## 📊 Informasi yang Tampil

| Field | Keterangan |
|-------|------------|
| 👤 User | Nama & email admin yang melakukan |
| 📝 Action | CREATE / UPDATE / DELETE |
| 🏷️ Type | Tipe data yang diubah |
| 📄 Description | Deskripsi human-readable |
| 🕐 Time | Kapan dilakukan |
| 🔄 Changes | Detail perubahan (expand) |

---

## 💡 Contoh Query Manual

```typescript
// Get history karyawan tertentu
const history = await getEntityHistory('employees', employeeId);

// Get aktivitas admin tertentu
const activity = await getUserActivity('admin@example.com');

// Get 50 aktivitas terakhir
const recent = await getRecentActivity(50);

// Get dengan filter
const logs = await getAuditLogs({
    action: 'DELETE',
    dateFrom: '2025-01-01',
    limit: 100
});
```

---

## 🔐 Security

- ✅ Hanya **Admin** bisa lihat
- ✅ Audit logs **immutable** (tidak bisa diubah/dihapus)
- ✅ Logging via **database trigger** (tidak bisa dimanipulasi)

---

## 📁 Files

| File | Purpose |
|------|---------|
| `database-audit-log.sql` | Database setup |
| `components/AuditLogViewer.tsx` | UI component |
| `services/auditLogService.ts` | Helper functions |
| `AUDIT_LOG_SETUP.md` | Full setup guide |
| `AUDIT_LOG_USAGE.md` | Code examples |

---

## ✅ Checklist

- [ ] Run `database-audit-log.sql` di Supabase
- [ ] Test buka "History Aktivitas" sebagai admin
- [ ] Coba tambah/edit/hapus data → Cek audit log
- [ ] Test filter & search
- [ ] Expand log untuk lihat detail perubahan

---

**🎉 READY TO USE!**

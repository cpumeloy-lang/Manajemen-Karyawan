# Alur Pengajuan Cuti Karyawan ke Dashboard Admin

## 🔄 Alur Lengkap

### 1️⃣ Karyawan Mengajukan Cuti
**Dari Dashboard Karyawan (Employee Self Service)**

```
Karyawan Login → Employee Self Service → Tab "Permohonan Cuti"
↓
Isi Form:
- Tanggal Mulai
- Tanggal Selesai
- Alasan Cuti
↓
Klik "Ajukan Cuti"
↓
handleNewRequest() dipanggil
↓
Insert ke database:
- employeeId: [ID karyawan]
- type: 'Cuti'
- startDate, endDate, reason
- status: 'Pending' ✅
- requestedAt: timestamp sekarang
↓
Jika berhasil → Data ditambahkan ke state allRequests
```

### 2️⃣ Muncul di Dashboard Admin
**OTOMATIS tanpa refresh!**

```
State allRequests diupdate (React state)
↓
Component RequestManagement menerima allRequests
↓
Tabel di Admin → Manajemen Permohonan Karyawan
↓
Menampilkan:
- Nama Karyawan
- Jabatan
- Tipe: Cuti
- Detail: Tanggal Mulai - Tanggal Selesai
- Tgl Diajukan
- Status: "Menunggu" (badge kuning) 🟡
- Aksi: [✓ Setujui] [✗ Tolak]
```

### 3️⃣ Admin Approve/Reject
```
Admin klik tombol:
- ✓ Setujui → Status: 'Approved' (hijau) 🟢
  → Sisa cuti karyawan berkurang otomatis
- ✗ Tolak → Status: 'Rejected' (merah) 🔴
```

## 📊 Status Badge

| Status Database | Label Tampilan | Warna | Aksi Admin |
|----------------|---------------|-------|-----------|
| `Pending` | Menunggu | Kuning 🟡 | ✓ Setujui / ✗ Tolak |
| `Approved` | Disetujui | Hijau 🟢 | (Selesai) |
| `Rejected` | Ditolak | Merah 🔴 | (Selesai) |

## 🔧 Perubahan Teknis

### File yang Diupdate:
1. **types.ts**
   - `RequestStatus.Diajukan` → `RequestStatus.Pending`
   - `RequestStatus.Disetujui` → `RequestStatus.Approved`
   - `RequestStatus.Ditolak` → `RequestStatus.Rejected`

2. **App.tsx**
   - `handleNewRequest()`: Insert dengan status `'Pending'`
   - `handleUpdateRequestStatus()`: Cek `RequestStatus.Approved` untuk kurangi sisa cuti

3. **RequestManagement.tsx**
   - Status badge dengan label Indonesia
   - Tombol aksi hanya muncul jika status `Pending`

## ✅ Verifikasi Alur

### Cara Testing:
1. ✅ **Jalankan SQL fix** (`fix-audit-log-entity-id.sql`) di Supabase
2. ✅ Login sebagai **Karyawan**
3. ✅ Ajukan cuti dari Employee Self Service
4. ✅ Logout, login sebagai **Admin**
5. ✅ Buka menu "Manajemen Permohonan"
6. ✅ Cuti karyawan **muncul otomatis** dengan status "Menunggu"
7. ✅ Klik "Setujui" atau "Tolak"
8. ✅ Status berubah dan sisa cuti berkurang (jika disetujui)

## 🚨 Catatan Penting

### Sebelum Testing:
- **WAJIB** jalankan `fix-audit-log-entity-id.sql` di Supabase
- Jika tidak, pengajuan cuti akan error: "entity_id type mismatch"

### Real-time Update:
- Data muncul **OTOMATIS** tanpa perlu refresh browser
- Menggunakan React state management
- Admin langsung melihat pengajuan karyawan

### Audit Log:
- Setiap pengajuan cuti tercatat di tabel `audit_logs`
- Mencatat siapa mengajukan, kapan, dan perubahan status

## 📱 Screenshot Flow

```
┌─────────────────────────────────────────┐
│ KARYAWAN - Employee Self Service        │
├─────────────────────────────────────────┤
│ Tab: Permohonan Cuti                    │
│ ┌─────────────────────────────────────┐ │
│ │ Tanggal Mulai: 2025-11-01          │ │
│ │ Tanggal Selesai: 2025-11-03        │ │
│ │ Alasan: Liburan keluarga           │ │
│ │ [Ajukan Cuti]                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                 ⬇️
┌─────────────────────────────────────────┐
│ ADMIN - Manajemen Permohonan            │
├─────────────────────────────────────────┤
│ Karyawan  │ Tipe │ Detail      │ Status │
│ John Doe  │ Cuti │ 01-03 Nov   │🟡Menunggu│
│ Staff IT  │      │             │ [✓][✗]│
└─────────────────────────────────────────┘
```

## 🎯 Kesimpulan

✅ **YA, pengajuan cuti karyawan AKAN MUNCUL di dashboard admin secara otomatis!**

Alurnya:
1. Karyawan ajukan → Database
2. Database → React State (allRequests)
3. React State → Component RequestManagement
4. Admin langsung lihat di tabel
5. Admin approve/reject → Update status
6. Status update → Sisa cuti berkurang (jika approved)

Semua terjadi **real-time** tanpa perlu refresh! 🚀

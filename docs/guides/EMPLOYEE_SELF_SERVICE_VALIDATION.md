# Fitur Self-Service Registration & Validasi HRD

## 📋 Overview

Fitur ini memungkinkan karyawan untuk melengkapi data profil mereka sendiri setelah diberikan akun login, dengan sistem validasi dan penguncian data oleh HRD untuk memastikan integritas data.

## 🎯 Tujuan

1. **Efisiensi**: Karyawan bisa melengkapi data mereka sendiri tanpa perlu HRD menginput semua data
2. **Akurasi**: Data diinput langsung oleh karyawan yang bersangkutan
3. **Validasi**: HRD memverifikasi kelengkapan dan kebenaran data
4. **Keamanan**: Data yang sudah terverifikasi bisa dikunci agar tidak bisa diubah sembarangan

## 🔄 Workflow

### 1. Pembuatan Akun Karyawan (oleh HRD)
- HRD membuat akun karyawan baru dengan data minimal (nama, email, password)
- Sistem membuat user di Supabase Auth
- Karyawan menerima kredensial login

### 2. Melengkapi Profil (oleh Karyawan)
- Karyawan login ke sistem
- Klik tab "Profil Saya" di Employee Self Service
- Klik tombol "✏️ Lengkapi/Edit Profil"
- Mengisi data:
  - **Data Wajib untuk Verifikasi**: Ditandai dengan tanda * (bintang)
    - Nama, Email, Tanggal Lahir, No. KTP, Alamat KTP, Rekening Bank
  - **Data Opsional**: NPWP, BPJS, Status Pernikahan, Tanggungan, dll.
- **Fitur Partial Save**: 
  - ✅ Karyawan bisa menyimpan data meskipun belum lengkap
  - ✅ Data yang sudah diisi akan tersimpan
  - ✅ Bisa dilengkapi nanti di waktu yang berbeda
  - ✅ Tidak ada timeout atau batas waktu
  - ℹ️ Info banner biru menjelaskan fitur ini di form
- Simpan data (minimal `nama` dan `email` sudah terisi)
- Status profil otomatis menjadi "✓ Lengkap" jika semua data wajib* terisi

### 3. Validasi Data (oleh HRD)
- HRD melihat status profil karyawan di tabel (kolom "Validasi")
- Status badge yang muncul:
  - **⚠ Belum Lengkap**: Profil belum memenuhi kriteria lengkap
  - **✓ Lengkap**: Semua data wajib sudah diisi
  - **✓ Verified**: Data sudah diverifikasi HRD
  - **🔒 Locked**: Data sudah dikunci, tidak bisa diubah

- HRD membuka detail karyawan untuk validasi
- Klik tombol "✓ Verifikasi Data" untuk memverifikasi
- Status: `isVerified = true`, `verifiedAt = timestamp sekarang`

### 4. Penguncian Data (oleh HRD)
- Setelah data terverifikasi dan valid
- HRD klik tombol "🔒 Kunci Data"
- Status: `isLocked = true`
- Karyawan tidak bisa lagi mengedit profil mereka
- Banner muncul di form: "🔒 Profil Anda telah dikunci oleh HRD"

### 5. Buka Kunci (jika diperlukan)
- Jika ada perubahan data yang perlu dilakukan
- HRD klik tombol "🔓 Buka Kunci"
- Karyawan bisa kembali mengedit profil
- Setelah selesai, HRD bisa kunci lagi

## 🗄️ Database Schema

### Kolom Baru di Table `employees`

```sql
-- Status kelengkapan profil
is_profile_completed BOOLEAN DEFAULT FALSE

-- Status verifikasi HRD
is_verified BOOLEAN DEFAULT FALSE
verified_by UUID REFERENCES employees(id)  -- ID HRD yang verifikasi
verified_at TIMESTAMP WITH TIME ZONE       -- Waktu verifikasi

-- Status penguncian data
is_locked BOOLEAN DEFAULT FALSE
```

## 💻 Implementasi Frontend

### 1. EmployeeForm.tsx
**Fitur yang ditambahkan:**
- Badge status di header (Profil Lengkap, Terverifikasi, Terkunci)
- Warning banner jika data terkunci
- **Info banner biru** untuk menjelaskan fitur partial save
- Fieldset disabled jika `isLocked = true`
- Tombol validasi HRD: "✓ Verifikasi Data"
- Tombol toggle lock: "🔒 Kunci Data" / "🔓 Buka Kunci"
- Auto-check kelengkapan profil saat submit
- **Validasi fleksibel**: Hanya `nama` dan `email` yang wajib, field lain opsional

### 2. EmployeeSelfService.tsx
**Fitur yang ditambahkan:**
- Tab baru: "👤 Profil Saya"
- Display semua data profil karyawan (read-only)
- Status banner (lengkap/belum, verified, locked)
- Tombol "✏️ Lengkapi/Edit Profil" (disabled jika locked)
- Callback `onEditProfile` untuk membuka EmployeeForm

### 3. EmployeeTable.tsx
**Fitur yang ditambahkan:**
- Kolom baru: "Validasi"
- Badge status untuk setiap karyawan:
  - ✓ Lengkap / ⚠ Belum Lengkap
  - ✓ Verified
  - 🔒 Locked

### 4. types.ts
**Properti baru di interface Employee:**
```typescript
isProfileCompleted?: boolean;
isVerified?: boolean;
verifiedBy?: string;
verifiedAt?: string;
isLocked?: boolean;
```

## 🔐 Aturan Akses

| Aksi | Karyawan | HRD/Admin |
|------|----------|-----------|
| Lihat profil sendiri | ✅ | ✅ |
| Edit profil sendiri | ✅ (jika tidak locked) | ✅ |
| Lihat profil karyawan lain | ❌ | ✅ |
| Edit profil karyawan lain | ❌ | ✅ |
| Verifikasi data | ❌ | ✅ |
| Lock/Unlock data | ❌ | ✅ |

## 📊 Status Flow

```
[Baru Dibuat]
    ↓
[Belum Lengkap] → Karyawan melengkapi data
    ↓
[Profil Lengkap] → HRD verifikasi
    ↓
[Terverifikasi] → HRD kunci data
    ↓
[Terkunci]
    ↓
[Buka Kunci] → Jika perlu edit
    ↓
[Kembali ke Profil Lengkap/Terverifikasi]
```

## ✅ Kriteria Profil Lengkap

Profil dianggap lengkap jika field berikut terisi:
1. ✅ Nama
2. ✅ Email
3. ✅ Tanggal Lahir
4. ✅ No. KTP
5. ✅ Alamat KTP (address.ktp)
6. ✅ Nomor Rekening Bank (bankAccount.accountNumber)

Field lain bersifat opsional.

## 🚀 Cara Penggunaan

### Untuk Karyawan:
1. Login dengan kredensial yang diberikan HRD
2. Klik "Employee Self Service"
3. Klik tab "Profil Saya"
4. Klik "✏️ Lengkapi/Edit Profil"
5. Isi semua data yang diperlukan
6. Klik "💾 Simpan Perubahan"
7. Tunggu verifikasi dari HRD

### Untuk HRD:
1. Login sebagai admin/HRD
2. Buka menu "Manajemen Karyawan"
3. Lihat kolom "Validasi" untuk status setiap karyawan
4. Klik icon "👁️" atau "✏️" untuk buka detail karyawan
5. Periksa kelengkapan data
6. Klik "✓ Verifikasi Data" jika data sudah benar
7. Klik "🔒 Kunci Data" untuk mengunci agar tidak bisa diubah
8. Jika perlu edit, klik "🔓 Buka Kunci" terlebih dahulu

## 🎨 UI/UX Features

### Badge Colors:
- 🔵 **Biru** (Profil Lengkap): bg-blue-100 text-blue-700
- 🟢 **Hijau** (Terverifikasi): bg-green-100 text-green-700
- 🔴 **Merah** (Terkunci): bg-red-100 text-red-700
- 🟡 **Kuning** (Belum Lengkap): bg-yellow-100 text-yellow-700
- ⚫ **Abu-abu** (Belum Lengkap): bg-gray-100 text-gray-600

### Banner Notifications:
- **Red Border**: Data terkunci (untuk karyawan)
- **Yellow Border**: Profil belum lengkap
- **Blue Border**: Menunggu verifikasi
- **Green Border**: Profil terverifikasi

## 📝 Catatan Penting

1. **Jalankan SQL Migration**: Pastikan file `RUN_THIS_IN_SUPABASE.sql` sudah dijalankan di Supabase SQL Editor untuk menambahkan kolom baru.

2. **Update Backend Logic**: Pastikan logic di App.tsx/backend untuk handle field baru (isProfileCompleted, isVerified, isLocked).

3. **Verifikasi Manual**: HRD harus memverifikasi data secara manual, sistem tidak auto-verifikasi.

4. **Audit Trail**: Field `verifiedBy` dan `verifiedAt` menyimpan siapa dan kapan verifikasi dilakukan.

5. **Reversible Lock**: Penguncian data bersifat reversible - HRD bisa buka kunci kapan saja.

## 🔄 Update App.tsx

Pastikan App.tsx sudah di-update untuk:
- Handle callback `onEditProfile` di EmployeeSelfService
- Mapping field baru saat fetch data dari Supabase
- Update field validasi saat save employee
- Set `verifiedBy` dengan current user ID saat verifikasi

```typescript
// Di App.tsx, tambahkan callback ini:
const handleEmployeeEditProfile = () => {
    setEmployeeToEdit(currentUser.profile); // Set profil user sendiri
    setIsEmployeeFormOpen(true);
};

// Pass ke EmployeeSelfService:
<EmployeeSelfService
    user={currentUser.profile}
    // ... props lain ...
    onEditProfile={handleEmployeeEditProfile}
/>
```

## 🎯 Manfaat

1. ✅ **Efisiensi Waktu HRD**: Tidak perlu input semua data karyawan
2. ✅ **Akurasi Data**: Karyawan input data mereka sendiri
3. ✅ **Data Integrity**: System validasi dan lock mencegah perubahan tidak sah
4. ✅ **Audit Trail**: Tercatat siapa dan kapan data diverifikasi
5. ✅ **User Experience**: Karyawan merasa dilibatkan dalam proses onboarding
6. ✅ **Compliance**: Data personal diinput langsung oleh yang bersangkutan

---

**Dokumentasi dibuat:** 27 Oktober 2025
**Versi:** 1.0
**Status:** Implemented & Ready to Use

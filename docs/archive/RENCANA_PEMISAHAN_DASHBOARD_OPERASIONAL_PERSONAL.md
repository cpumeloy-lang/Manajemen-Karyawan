# Rencana Pemisahan Dashboard Operasional dan Akun Personal Karyawan

## 1. Tujuan
- Memisahkan pengalaman pengguna operasional (HR, Kepala Ruangan, Admin) dari pengalaman personal karyawan.
- Mencegah kebocoran data lintas konteks melalui pemisahan route, API, state, dan policy data.
- Menjaga kompatibilitas bertahap tanpa menghentikan fitur existing.

## 2. Kondisi Saat Ini (Ringkas)
- Routing dan navigasi masih berada dalam satu shell aplikasi di App.tsx.
- Menu personal dan operasional tampil dalam sidebar yang sama.
- Render dashboard dibedakan berdasarkan role, tetapi tetap dalam satu konteks aplikasi.

## 3. Target Arsitektur
### 3.1 Portal Personal
- Fokus: data milik karyawan sendiri.
- Fitur: Dashboard pribadi, ESS, absensi pribadi, permohonan pribadi, profil.

### 3.2 Portal Operasional
- Fokus: manajemen unit/organisasi.
- Fitur: dashboard operasional, karyawan, absensi unit, payroll, approval, audit, anomaly.

### 3.3 Context Switch (untuk dual-role)
- Pengguna dual-role masuk ke halaman pemilih konteks setelah login.
- Setiap perpindahan konteks dicatat ke audit log.

## 4. Mapping File dan Perubahan
## 4.1 File existing yang diubah
- App.tsx
  - Pisahkan route tree personal dan operasional.
  - Sidebar dibagi berdasarkan konteks aktif, bukan campur role.
  - Tambah guard untuk mencegah akses lintas konteks.
- stores/appStore.ts
  - Tambah state activePortal: personal | operational.
  - Tambah action setActivePortal.
- hooks/useAuthHandlers.ts
  - Setelah login, arahkan ke pemilih konteks jika dual-role.
  - Jika single-role, set context default otomatis.
- utils/roleUtils.ts
  - Tambah helper untuk pengecekan capability per portal.

## 4.2 File baru yang disarankan
- components/PortalSelector.tsx
  - Halaman pemilihan konteks saat user punya akses personal + operasional.
- components/guards/OperationalGuard.tsx
  - Guard komponen untuk semua route operasional.
- components/guards/PersonalGuard.tsx
  - Guard komponen untuk semua route personal.
- services/auditContextService.ts
  - Util pencatatan perpindahan konteks portal.
- docs/ACCESS_MATRIX_PORTAL.md
  - Matriks role x fitur x portal sebagai acuan QA dan audit.

## 5. Desain Hak Akses
## 5.1 Personal portal
- Hanya boleh melihat dan mengubah data milik sendiri.
- Tidak boleh mengakses daftar karyawan global, payroll lintas user, atau audit operasional.

## 5.2 Operational portal
- HR/Admin/Kepala Ruangan sesuai scope unit kerja dan mandat role.
- Fitur sensitif (audit log, system setting) hanya role tertentu.

## 5.3 Segregation of duties
- Role approval dan role konfigurasi sistem tidak disatukan tanpa alasan bisnis.
- Semua aksi sensitif wajib jejak audit.

## 6. Rencana Implementasi Bertahap
## Fase A: Foundation (1 sprint)
- Tambahkan activePortal ke store.
- Buat PortalSelector.
- Pisahkan sidebar personal vs operasional.

## Fase B: Route Guard Split (1 sprint)
- Implement PersonalGuard dan OperationalGuard.
- Pindahkan render view agar strict per portal.
- Tambahkan redirect aman untuk akses tidak sah.

## Fase C: Service dan API Split (1 sprint)
- Pisahkan service call personal dan operasional.
- Tambahkan portal_type ke audit metadata untuk endpoint penting.

## Fase D: Policy Data Hardening (1 sprint)
- Review RLS untuk semua query personal vs operasional.
- Tambah test unauthorized untuk setiap endpoint sensitif.

## Fase E: UAT dan Go-Live (1 sprint)
- UAT role-based end-to-end.
- Audit sampling untuk memastikan tidak ada data leakage lintas portal.

## 7. Acceptance Criteria
- User personal tidak pernah melihat menu operasional.
- User operasional tidak memakai shell personal kecuali memilih context switch.
- Endpoint lintas portal mengembalikan 403 secara konsisten.
- Log audit menyertakan portal_type dan role actor.
- QA lulus untuk seluruh skenario role matrix.

## 8. Risiko dan Mitigasi
- Risiko: komponen lama masih memanggil endpoint operasional dari personal view.
  - Mitigasi: enforce guard di UI dan server, plus test contract endpoint.
- Risiko: dual-role bypass context.
  - Mitigasi: wajib context di session state, validasi di middleware API.
- Risiko: cache data lama bocor antar portal.
  - Mitigasi: reset cache saat context switch.

## 9. Checklist Eksekusi Cepat
- Definisikan role matrix final.
- Implement activePortal di store.
- Buat PortalSelector + Guard.
- Split menu dan route.
- Tambah audit event context switch.
- Uji akses silang dan perbaiki policy.
- Go-live bertahap dengan monitoring.

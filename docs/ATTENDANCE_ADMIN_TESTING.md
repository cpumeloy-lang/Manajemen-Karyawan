# Attendance Admin Testing Checklist

Dokumen ini untuk verifikasi alur absensi setelah pemisahan handler:

- Portal `operational` -> `handleSaveOperationalAttendance`
- Portal `personal` -> `handleSavePersonalAttendance`

## Tujuan Pengujian

1. Memastikan admin/HR/kepala ruangan dapat input absensi operasional.
2. Memastikan akses non-operasional hanya mode baca.
3. Memastikan ESS tetap hanya bisa absensi akun sendiri.
4. Memastikan audit log menyimpan konteks portal yang benar.

## Prasyarat

1. Database migration terbaru sudah dijalankan, terutama `database-setup-step5-audit-log.sql`.
2. Jalankan `database-setup-step6-attendance-governance.sql` untuk mengaktifkan maker-checker workflow.
3. Tabel `attendance` dapat diakses aplikasi.
4. Tabel `audit_logs` sudah memiliki kolom `portal_type`.
5. Tabel `attendance_change_requests` dan `attendance_revision_history` sudah tersedia.
6. Minimal tersedia 3 akun uji:

- Akun admin/hr/kepala ruangan
- Akun karyawan personal A
- Akun karyawan personal B

7. Minimal tersedia 2 data karyawan aktif.

## Skenario A - Input Absensi Operasional Berhasil

Role: `admin` atau `hrd` atau `kepala_ruangan`
Portal: `operational`

Langkah:
1. Login menggunakan akun operasional.
2. Pastikan portal aktif `operational`.
3. Buka menu `Kehadiran` dari sidebar.
4. Pada panel `Input Manual`, pilih karyawan lain (bukan akun login bila memungkinkan).
5. Isi tanggal, jam masuk, jam pulang, lokasi, catatan.
6. Pilih `Reason Code` dan isi detail alasan.
7. Ambil GPS (atau isi koordinat valid) lalu pastikan lokasi terverifikasi.
8. Klik `Kirim Request Perubahan`.

Ekspektasi:
1. Muncul pesan sukses bahwa request menunggu approval checker.
2. Data belum langsung mengubah record attendance final.
3. Request muncul pada panel `Maker-Checker Queue` dengan status `Pending`.

## Skenario A2 - Approval Request oleh Checker

Role: checker operasional (bukan pembuat request)

Langkah:
1. Login checker operasional.
2. Buka menu `Kehadiran`.
3. Pada panel `Maker-Checker Queue`, pilih request pending.
4. Klik `Approve` dan isi catatan opsional.

Ekspektasi:
1. Request berubah menjadi approved.
2. Record attendance final ter-update.
3. Muncul revision history untuk action `APPROVE`.
4. Maker tidak dapat menjadi checker pada request miliknya.

## Skenario B - Operasional Tanpa Izin Menjadi Read-Only

Role: non-operasional (contoh `perawat`/`karyawan biasa`)
Portal: coba akses layar kehadiran operasional

Langkah:
1. Login menggunakan akun non-operasional.
2. Coba navigasi ke halaman kehadiran operasional (jika tersedia route/menu dari role tersebut).

Ekspektasi:
1. Form input manual tidak bisa dipakai (disabled).
2. Muncul informasi mode baca saja.
3. Tombol submit tidak aktif.
4. Jika submit dipaksa, sistem menolak dengan pesan akses ditolak.

## Skenario C - ESS Hanya untuk Diri Sendiri

Role: akun personal
Portal: `personal`

Langkah:
1. Login akun karyawan A.
2. Buka ESS dan lakukan check-in/check-out normal.
3. Coba simulasi submit dengan `employeeId` milik karyawan B (misalnya via devtools/request manipulation).

Ekspektasi:
1. Check-in/check-out untuk diri sendiri berhasil.
2. Submit dengan `employeeId` akun lain ditolak.
3. Pesan error menyatakan hanya boleh input absensi akun sendiri.

## Verifikasi Audit Log

Jalankan query berikut setelah skenario A dan C:

```sql
SELECT
  action,
  entity_type,
  portal_type,
  user_email,
  description,
  created_at
FROM public.audit_logs
WHERE entity_type = 'attendance'
ORDER BY created_at DESC
LIMIT 20;
```

Ekspektasi:
1. Aktivitas dari menu operasional tercatat dengan `portal_type = 'operational'`.
2. Aktivitas dari ESS tercatat dengan `portal_type = 'personal'`.
3. Tabel `attendance_change_requests` menyimpan status, reason code, dan verifikasi lokasi.
4. Tabel `attendance_revision_history` terisi saat approve/reject.

## Catatan Hasil Uji

Isi tabel berikut saat eksekusi:

| Skenario | Status (Pass/Fail) | Bukti (screenshot/log) | Catatan |
| --- | --- | --- | --- |
| A - Operasional sukses |  |  |  |
| B - Read-only non-operasional |  |  |  |
| C - ESS self-only |  |  |  |
| Audit log portal_type |  |  |  |

## Troubleshooting Cepat

1. Jika muncul error schema `employeeId/tanggal`:
- Sistem sudah punya fallback snake_case/camelCase, tetapi pastikan kolom attendance konsisten.

2. Jika audit log gagal menulis:
- Cek RLS dan policy `audit_logs_insert_policy`.
- Cek kolom `portal_type` sudah ada di `public.audit_logs`.

3. Jika user operasional tetap ditolak:
- Cek role pada profil employee.
- Cek portal aktif harus `operational`.

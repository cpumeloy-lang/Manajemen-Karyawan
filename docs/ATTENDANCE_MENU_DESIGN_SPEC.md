# Attendance Menu Design Spec

## Purpose

Menu **Kehadiran** tetap menjadi satu workspace utama untuk HR/Admin, bukan dipisah menjadi menu laporan terpisah. Tujuannya adalah menjaga alur kerja tetap natural: cari karyawan, lihat history absensi, lakukan review/approval, lalu export bila diperlukan.

## Design Principles

1. **Single workspace, multiple views**
   - Semua aktivitas absensi berada di satu halaman.
   - User tidak perlu pindah konteks untuk monitoring, review, approval, atau reporting.

2. **Operational first**
   - Ringkasan dan antrian approval harus tampil paling atas.
   - Detail history karyawan tersedia sebagai drill-down.

3. **Compliance aware**
   - Setiap perubahan manual harus melewati maker-checker.
   - Reason code, lokasi, dan jejak revisi wajib terlihat.

4. **Fast lookup**
   - HR/Admin biasanya mencari nama karyawan terlebih dahulu.
   - Fitur search harus menjadi entry point utama untuk report history.

5. **Layered depth**
   - Overview untuk monitoring cepat.
   - History untuk investigasi.
   - Approval queue untuk validasi.
   - Export untuk pelaporan formal.

## Page Structure

### 1. Header Area

Content:
- Judul halaman: `Kehadiran`
- Subjudul: ringkasan operasional absensi dan approval
- Filter global:
  - rentang tanggal
  - unit kerja / department
  - status absensi
  - status approval
- Action buttons:
  - Export Excel
  - Export PDF
  - Refresh Data

Behavior:
- Filter berlaku ke seluruh panel di halaman.
- Export mengikuti filter aktif.

### 2. KPI Summary Strip

Tampilkan kartu ringkas:
- Total karyawan aktif
- Total record absensi hari ini
- Tepat waktu
- Terlambat
- Pending approval
- Request rejected

Purpose:
- Memberi gambaran kondisi operasional dalam 5 detik.

### 3. Search & Drill-down Panel

This is the main entry point for HR.

Content:
- Search input nama karyawan
- Optional filter:
  - NIK
  - unit kerja
  - status aktif
- Hasil pencarian sebagai daftar karyawan
- Tombol `Lihat Detail`

Behavior:
- Ketika user memilih satu karyawan, panel detail di bawah atau di sisi kanan langsung berubah menampilkan history absensi karyawan tersebut.
- Jika search kosong, tampilkan daftar karyawan populer / terakhir dilihat.

### 4. Employee Attendance History Panel

This is the core report view.

Content per record:
- tanggal
- jam masuk
- jam pulang
- status hadir / terlambat / cuti / sakit / pending
- overtime
- lokasi
- source data
- reason code bila ada koreksi
- approval status
- maker / checker name

Actions per record:
- View detail
- View revision history
- Open audit trail

Behavior:
- Klik satu record membuka drawer/modal detail.
- Record yang sudah dikoreksi menampilkan badge khusus.
- Record dengan pending approval tampil dengan warna yang berbeda.

### 5. Maker-Checker Queue Panel

Content:
- daftar request absensi manual yang masih pending
- reason code
- employee target
- maker
- lokasi verified / unverified
- timestamp request
- tombol Approve / Reject

Behavior:
- Approve hanya tersedia untuk checker yang berwenang.
- Maker tidak boleh memproses request miliknya sendiri.
- Setelah approval, record final attendance harus langsung ter-update.
- Setelah rejection, request tetap tersimpan untuk audit.

### 6. Manual Correction Form

This is not a direct-save form; it is a request form.

Required fields:
- employee
- attendance date
- check-in
- check-out
- location text
- latitude
- longitude
- reason code
- reason detail

System assistance:
- tombol ambil GPS perangkat saat ini
- indikator jarak ke kantor
- indikator lokasi terverifikasi / belum terverifikasi

Behavior:
- Submit menghasilkan request pending approval, bukan update final.
- Jika lokasi tidak sesuai geofence, sistem tetap dapat menyimpan request tetapi harus diberi status/verifikasi yang jelas.
- Form harus disabled jika user tidak punya hak operasional.

### 7. Revision History Drawer

Content:
- before data
- after data
- action: approve/reject/system
- reason code
- reason detail
- changed by
- reviewed at
- linked request id

Purpose:
- Menjadi bukti audit untuk setiap perubahan absensi.

### 8. Export Section

Content:
- export current filtered history to Excel
- export summary PDF
- export approval queue

Behavior:
- Export harus mengikuti filter aktif.
- Export format harus menyertakan portal context, reason code, dan approval status.

## User Flow

### Flow A: HR mencari history karyawan
1. Open menu Kehadiran.
2. Review summary.
3. Search nama karyawan.
4. Open detail history.
5. Inspect record atau revision history.
6. Export if needed.

### Flow B: Admin input koreksi absensi
1. Open menu Kehadiran.
2. Fill manual correction form.
3. Choose reason code.
4. Capture GPS / verify location.
5. Submit as request.
6. Request appears in queue.
7. Checker reviews and approves/rejects.

### Flow C: Checker approve request
1. Open queue panel.
2. Review request and evidence.
3. Approve or reject.
4. System writes revision history and audit log.

## Data Rules

1. Semua koreksi manual harus punya reason code.
2. Semua request harus punya maker identity.
3. Semua approval/rejection harus punya checker identity.
4. Semua perubahan final harus punya revision history.
5. Semua audit event harus punya `portal_type`.

## Permission Rules

### Personal Portal
- hanya bisa absensi diri sendiri
- tidak bisa lihat queue operasional
- tidak bisa membuat request koreksi operasional

### Operational Portal
- admin/hr/kepala_ruangan bisa lihat ringkasan dan history
- hanya role tertentu bisa membuat request koreksi
- checker harus berbeda dari maker

## Recommended Layout

Desktop layout:
- Top: header + filter + action buttons
- Row 2: KPI summary cards
- Left column: search + employee list + manual request form
- Main column: employee history + revision history
- Right sidebar or lower section: approval queue

Mobile layout:
- Collapse into stacked sections
- Summary first
- Search second
- History and queue as tabs or accordions
- Export at bottom or sticky action bar

## Strategic Recommendation

Untuk tahap berikutnya, menu Kehadiran sebaiknya dipertahankan sebagai satu module utama dengan sub-view internal:
- Overview
- History Karyawan
- Approval Queue
- Revision History
- Export

Ini menjaga UX tetap sederhana, namun tetap cukup kuat untuk kebutuhan enterprise.

## Implementation Notes

- Komponen history detail dapat memanfaatkan `EmployeeAttendanceDetail`.
- Komponen queue approval sebaiknya terintegrasi dalam `AttendanceManagement`.
- Form koreksi manual harus memanggil workflow request, bukan langsung update attendance.
- Query laporan harus membaca data final attendance + revision history + audit log.

# HRMS Absensi Mobile

Mobile app khusus absensi karyawan. Web app tetap dipakai untuk HR/admin, sementara mobile fokus pada check-in, check-out, riwayat absensi, dan profil karyawan.

## Struktur

- `src/shell` - shell aplikasi dan orkestrasi layar (`AppShell`)
- `src/features/auth` - login dan session
- `src/features/attendance` - check-in, check-out, history
- `src/features/profile` - profil karyawan
- `src/components` - komponen UI reusable
- `src/services` - akses API, auth, attendance, lokasi
- `src/hooks` - hook utilitas
- `src/lib` - helper storage dan HTTP
- `src/theme` - warna dan spacing
- `src/types` - tipe domain

## Fokus fase awal

1. Login karyawan
2. Check-in / check-out
3. Riwayat absensi
4. Sinkronisasi ke backend Supabase online

## Menjalankan di HP fisik (Android)

Rekomendasi terbaik: install development build di HP lewat USB, bukan membuka lewat browser dan bukan Expo Go.

- Hubungkan HP ke laptop dengan USB.
- Aktifkan Developer Options dan USB Debugging di HP.
- Pastikan `adb devices` menampilkan perangkat dengan status `device`.
- Buat file `.env` di folder `mobile-absensi` dengan isi:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=isi_dengan_anon_key_supabase_online
```

- Jalankan build dan instal ke HP:

```bash
npm run android:dev
```

- Setelah build terpasang, jalankan Metro khusus dev client lewat localhost:

```bash
npm run start:dev:usb
```

- Buka aplikasi `HRMS Absensi` yang terpasang di HP, lalu connect ke Metro dari app tersebut.
- Jika build gagal, periksa Android Studio SDK / USB debugging / kabel USB, bukan browser.

Alternatif sementara jika Anda belum siap install build:

- Pakai Expo Go dan buka `exp://192.168.0.101:8082`.
- Jangan buka `http://192.168.0.101:8082` di browser karena itu hanya endpoint Metro.

Catatan:

- Untuk production/staging, gunakan Supabase hosted agar tidak tergantung IP laptop.
- Mode lokal tetap bisa dipakai dengan `EXPO_PUBLIC_SUPABASE_URL=auto` (khusus development lokal, bukan deployment online).

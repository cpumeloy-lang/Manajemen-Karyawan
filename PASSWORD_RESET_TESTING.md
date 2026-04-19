# 🔐 Testing Password Reset Feature

> Catatan penting: Panduan ini memakai `http://localhost:3030` sebagai contoh dev lokal. Jika aplikasi diakses online, gunakan domain frontend publik pada seluruh konfigurasi redirect Supabase.

## Persiapan
1. Pastikan aplikasi sudah running: `npm run dev`
2. Buka browser console (F12) untuk melihat debug logs

## Flow Testing

### Step 1: Kirim Email Reset
1. Buka aplikasi:
   - Dev lokal: http://localhost:3030
   - Online/staging/production: https://hrms.perusahaan.com
2. Klik tombol **"Lupa Password?"**
3. Masukkan email karyawan (contoh: `admin@rs-sehat.com`)
4. Klik **"Kirim Email Reset"**
5. **Expected:** Muncul pesan sukses "Email reset password telah dikirim!"

### Step 2: Cek Email
1. Buka inbox email yang Anda gunakan
2. Cari email dari Supabase dengan subject tentang password reset
3. Klik link reset password di email tersebut

### Step 3: Reset Password
1. **Expected:** Browser redirect ke aplikasi dan muncul halaman **"Reset Password"**
2. **Console logs yang harus muncul:**
   ```
   🔔 Auth event: PASSWORD_RECOVERY Session: true
   🔐 PASSWORD_RECOVERY event detected!
   🔑 Reset Password - Current hash: #access_token=...
   ✅ PASSWORD_RECOVERY event - valid session
   ✅ Valid recovery session found for: xxx@xxx.com
   ```
3. Masukkan password baru (minimal 6 karakter)
4. Ulangi password baru di kolom konfirmasi
5. Klik **"Reset Password"**
6. **Expected:** Muncul pesan "Password berhasil direset!"
7. Otomatis redirect ke halaman login setelah 2 detik

### Step 4: Login dengan Password Baru
1. Masukkan email dan password baru
2. Klik **"Login"**
3. **Expected:** Berhasil login dan masuk ke dashboard

## Debug Console Logs

### Saat Klik Link Email (Expected):
```
🌐 App - Current hash: #access_token=xxx&type=recovery
🔔 Auth event: PASSWORD_RECOVERY Session: true
🔐 PASSWORD_RECOVERY event detected!
⏭️ Skipping session check - on reset password page
🔑 Reset Password - Current hash: #access_token=...
🔔 ResetPassword - Auth event: PASSWORD_RECOVERY
✅ PASSWORD_RECOVERY event - valid session
📋 Session check result: { hasSession: true, error: null, user: 'xxx@xxx.com' }
✅ Valid recovery session found for: xxx@xxx.com
```

### Jika Masih Redirect ke Login (Troubleshooting):
1. **Cek console logs** - apakah `PASSWORD_RECOVERY` event terdeteksi?
2. **Cek Supabase Dashboard:**
   - Authentication → Email Templates → Reset Password
   - Pastikan template aktif
3. **Cek redirect URL di Supabase:**
   - Authentication → URL Configuration
   - Tambahkan `http://localhost:3030` ke Redirect URLs
4. **Clear browser cache dan cookies**
5. **Coba kirim ulang email reset password**

## Konfigurasi Supabase (PENTING!)

### Email Auth Settings
1. Buka **Supabase Dashboard**
2. Pilih project Anda
3. Ke **Authentication** → **Providers** → **Email**
4. Pastikan **Enable Email provider** = ON
5. **Confirm email** bisa OFF untuk development

### URL Configuration
1. Ke **Authentication** → **URL Configuration**
2. **Site URL:** `http://localhost:3030`
3. **Redirect URLs:** Tambahkan:
   - `http://localhost:3030`
   - `http://localhost:3030/`
   - URL production jika ada

### Email Templates
1. Ke **Authentication** → **Email Templates**
2. Pilih **Reset Password**
3. Pastikan template aktif
4. (Opsional) Customize template sesuai kebutuhan

## Troubleshooting

### Email tidak terkirim
- Cek inbox dan spam folder
- Pastikan email provider settings di Supabase sudah benar
- Untuk development, bisa gunakan email testing tools

### Link expired/invalid
- Default link valid 1 jam
- Jika kadaluarsa, kirim ulang email reset
- Bisa ubah expiry time di Supabase settings

### Password tidak ter-update
- Pastikan password minimal 6 karakter
- Cek password policy di Supabase settings
- Pastikan kedua input password sama

## Expected Behavior

✅ **BERHASIL jika:**
- Klik link email → langsung muncul form "Reset Password"
- Console log menunjukkan `PASSWORD_RECOVERY` event
- Form reset password bisa diisi
- Setelah submit → redirect ke login
- Bisa login dengan password baru

❌ **GAGAL jika:**
- Klik link email → langsung ke halaman login (bukan form reset)
- Console log tidak ada `PASSWORD_RECOVERY` event
- Muncul error "Link tidak valid"

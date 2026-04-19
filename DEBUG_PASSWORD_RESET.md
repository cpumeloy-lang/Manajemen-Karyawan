# 🔍 DEBUG: Password Reset Not Showing

> Catatan penting: Referensi `http://localhost:3030` di bawah adalah skenario development lokal. Untuk environment online, gunakan URL frontend publik Anda.

## Langkah Debug Step-by-Step

### 1. Buka Browser Console (F12)
Sebelum klik link email, buka dulu console browser

### 2. Refresh Aplikasi
- Buka aplikasi:
  - Dev lokal: http://localhost:3030
  - Online/staging/production: https://hrms.perusahaan.com
- Perhatikan log yang muncul di console:
  ```
  🚀 App mounted, checking for password recovery...
  🔍 Checking session...
  ❌ No valid session
  🔓 App rendering: LOGIN PAGE (no auth user)
  ```

### 3. Klik Link Reset dari Email
Setelah klik link di email, yang HARUS muncul di console:
```
🔔 Auth State Change: PASSWORD_RECOVERY Has Session: true
✅ PASSWORD_RECOVERY detected! Showing reset password page...
🔐 App rendering: RESET PASSWORD PAGE
🔑 Reset Password - Current hash: #access_token=...
🔔 ResetPassword - Auth event: PASSWORD_RECOVERY
✅ PASSWORD_RECOVERY event - valid session
```

### 4. Cek Apa yang Sebenarnya Muncul

**Skenario A: Langsung ke Login**
Jika yang muncul:
```
🔍 Checking session...
✅ Valid session found, fetching profile...
```
Berarti: App detect sebagai normal login, bukan password recovery

**Skenario B: Error/No Log**
Jika tidak ada log sama sekali → ada masalah di Supabase config

**Skenario C: Reset Page Muncul** ✅
Jika muncul "🔐 App rendering: RESET PASSWORD PAGE" → BERHASIL!

## Troubleshooting

### Jika Masih Ke Login Page:

#### Cek 1: Supabase Redirect URL
1. Buka Supabase Dashboard
2. Authentication → URL Configuration
3. **PASTIKAN** Redirect URLs berisi EXACT match:
   ```
   http://localhost:3030
   ```
   (TANPA trailing slash atau path tambahan)

#### Cek 2: Link Email
Copy link dari email dan paste di notepad. Cek formatnya:
- Harus ada `access_token=...`
- Harus ada `type=recovery`
- URL harus start dengan `http://localhost:3030`

Contoh format yang BENAR:
```
http://localhost:3030#access_token=eyJhbGc...&type=recovery&...
```

Format yang SALAH (tidak akan work):
```
https://your-project.supabase.co/auth/v1/verify?token=...
```

#### Cek 3: Clear Session
Sebelum klik link email:
1. Logout dari aplikasi jika sedang login
2. Clear browser cache
3. Close semua tab aplikasi
4. Buka tab baru → klik link email

#### Cek 4: Email Template Settings
Di Supabase Dashboard:
1. Authentication → Email Templates → Reset Password
2. Pastikan menggunakan template default atau custom yang benar
3. **Confirm Action URL** harus mengarah ke Site URL yang sudah diset

## Copy Console Logs

Jika masih gagal, copy SEMUA console logs yang muncul mulai dari:
1. Saat pertama buka aplikasi
2. Saat klik link email
3. Sampai halaman selesai load

Paste logs tersebut untuk analisa lebih lanjut.

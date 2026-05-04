# 🔧 PENTING: Konfigurasi Supabase untuk Password Reset

> Catatan penting: Nilai `http://localhost:3030` pada dokumen ini hanya untuk development lokal. Untuk production/staging, Site URL dan Redirect URLs wajib menggunakan domain frontend publik Anda.

## ⚠️ MASALAH SAAT INI

Berdasarkan console log, `PASSWORD_RECOVERY` event **TIDAK MUNCUL**.
Yang muncul hanya:
```
🔔 Auth State Change: SIGNED_OUT
🔔 Auth State Change: INITIAL_SESSION
```

Ini berarti **EMAIL TEMPLATE DI SUPABASE SALAH**.

---

## ✅ SOLUSI: Konfigurasi Supabase Dashboard

### **STEP 1: Buka Supabase Dashboard**

1. Login ke https://supabase.com
2. Pilih project: **ahwgiwzppyfzejzgddag**
3. Klik **Authentication** di sidebar kiri

### **STEP 2: Set Redirect URL**

1. Klik **URL Configuration**
2. **Site URL:** Isi sesuai environment:
   ```
   # Dev lokal
   http://localhost:3030

   # Online/staging/production
   https://hrms.perusahaan.com
   ```
3. **Redirect URLs:** Klik **"Add URL"** dan tambahkan sesuai environment:
   ```
   # Dev lokal
   http://localhost:3030
   http://localhost:3030/**

   # Online/staging/production
   https://hrms.perusahaan.com
   https://hrms.perusahaan.com/**
   ```
4. Klik **Save**

### **STEP 3: Perbaiki Email Template (PENTING!)**

1. Klik **Email Templates**
2. Pilih **"Reset Password"** atau **"Change Password"**
3. Pastikan template HTML berisi **`{{ .ConfirmationURL }}`**

#### Template yang BENAR:

```html
<h2>Reset Password</h2>
<p>Ikuti link ini untuk mereset password Anda:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

#### ❌ Template SALAH (JANGAN PAKAI):
```html
<p><a href="{{ .SiteURL }}">Reset Password</a></p>
```

### **STEP 4: Cek Email Settings**

1. Masih di **Authentication**
2. Klik **Providers**
3. Klik **Email**
4. Pastikan:
   - ✅ **Enable Email provider** = ON
   - ✅ **Confirm email** = OFF (untuk development) atau ON (untuk production)
   - ✅ **Secure email change** = ON

### **STEP 5: Test Lagi**

Setelah konfigurasi di atas:

1. **Logout** dari aplikasi (jika sedang login)
2. **Close semua tab** browser
3. **Clear cache** browser (Ctrl+Shift+Delete)
4. **Buka tab baru** → http://localhost:3030
5. **Klik "Lupa Password?"**
6. **Masukkan email** dan kirim
7. **Cek inbox** email
8. **Klik link** di email
9. **Perhatikan console** - HARUS muncul:
   ```
   🔔 Auth State Change: PASSWORD_RECOVERY Has Session: true
   ✅ PASSWORD_RECOVERY detected! Showing reset password page...
   🔐 App rendering: RESET PASSWORD PAGE
   ```

---

## 🔍 Cara Cek Template Email di Supabase

### Via Dashboard:
1. **Authentication** → **Email Templates** → **Reset Password**
2. Lihat bagian **HTML Template**
3. Pastikan ada `{{ .ConfirmationURL }}`

### Contoh Template Lengkap yang BENAR:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Password</title>
</head>
<body>
    <h2>Reset Password Request</h2>
    <p>Halo,</p>
    <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
    <p>Klik tombol di bawah untuk mereset password:</p>
    <p>
        <a href="{{ .ConfirmationURL }}" 
           style="background-color: #06736a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
        </a>
    </p>
    <p>Atau copy link berikut ke browser:</p>
    <p>{{ .ConfirmationURL }}</p>
    <p>Link ini akan kadaluarsa dalam 1 jam.</p>
    <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
</body>
</html>
```

---

## 🚨 Jika Masih Gagal

### Cek Link Email:
Setelah terima email, **klik kanan pada tombol/link** → **Copy Link Address**

Format link yang BENAR harus seperti:
```
http://localhost:3030#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&type=recovery&...
```

**HARUS ADA:**
- ✅ `access_token=...`
- ✅ `type=recovery`
- ✅ Dimulai dengan `http://localhost:3030`

Format link yang SALAH:
```
https://ahwgiwzppyfzejzgddag.supabase.co/auth/v1/verify?token=...
```

---

## 📝 Checklist

Sebelum test lagi, pastikan:

- [ ] Site URL di Supabase = `http://localhost:3030`
- [ ] Redirect URLs berisi `http://localhost:3030`
- [ ] Email template menggunakan `{{ .ConfirmationURL }}`
- [ ] Email provider enabled
- [ ] User sudah logout dari aplikasi
- [ ] Browser cache sudah di-clear
- [ ] Kirim email reset BARU (jangan pakai link lama)

---

## 🎯 Expected Flow

1. User klik "Lupa Password"
2. Input email → kirim
3. Cek inbox → ada email dari Supabase
4. Klik link di email
5. Browser redirect ke `http://localhost:3030#access_token=...&type=recovery`
6. Supabase trigger event `PASSWORD_RECOVERY`
7. App detect event → show ResetPassword component
8. User input password baru → submit
9. Redirect ke login → login dengan password baru ✅

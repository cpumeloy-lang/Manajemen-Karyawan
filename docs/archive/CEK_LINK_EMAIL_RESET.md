# 🔍 CARA CEK LINK EMAIL RESET PASSWORD

> Catatan penting: Semua contoh `http://localhost:3030` pada dokumen ini hanya untuk development lokal. Untuk server online/production, ganti dengan domain frontend publik Anda (contoh: `https://hrms.perusahaan.com`).

## Masalah: Link Email Langsung Masuk Dashboard

Jika klik link email langsung ke dashboard, ada 2 kemungkinan:

### 1. Link Email SALAH (Tidak Ada Recovery Token)
Link seharusnya seperti:
```
http://localhost:3030#access_token=eyJhbGc...&type=recovery&...
```
Atau untuk environment online:
```
https://hrms.perusahaan.com#access_token=eyJhbGc...&type=recovery&...
```

Tapi jika link email Anda seperti ini, **SALAH**:
```
http://localhost:3030
https://ahwgiwzppyfzejzgddag.supabase.co/auth/v1/verify?token=...
```

### 2. Email Template di Supabase Salah

---

## ✅ CARA CEK LINK EMAIL

### Step 1: Buka Email
Setelah kirim reset password, buka inbox email

### Step 2: JANGAN KLIK LINK DULU!
Klik kanan pada tombol/link reset password → **Copy Link Address**

### Step 3: Paste di Notepad
Paste link tersebut di notepad dan lihat formatnya

### Step 4: Cek Format Link

#### ✅ Format BENAR (Ada recovery token):
```
http://localhost:3030#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzMwMDQ4NzI0LCJpYXQiOjE3MzAwNDUxMjQsImlzcyI6Imh0dHBzOi8vYWh3Z2l3enBweWZ6ZWp6Z2RkYWcuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsImVtYWlsIjoiYWRtaW5AcnMtc2VoYXQuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzMwMDQ1MTI0fV0sInNlc3Npb25faWQiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwMTIifQ.abc123xyz...&type=recovery&expires_at=1730048724&expires_in=3600&refresh_token=def456uvw...
```

**Ciri-ciri link BENAR:**
- ✅ Dimulai dengan `http://localhost:3030#`
- ✅ Ada `access_token=` (token panjang)
- ✅ Ada `&type=recovery`
- ✅ Ada `&expires_at=`
- ✅ Ada `&refresh_token=`

#### ❌ Format SALAH:

**Salah 1: Redirect ke Supabase Dashboard**
```
https://ahwgiwzppyfzejzgddag.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=http://localhost:3030
```
❌ Ini akan redirect dulu ke Supabase, baru ke localhost

**Salah 2: Link Polos Tanpa Token**
```
http://localhost:3030
```
❌ Tidak ada token sama sekali

**Salah 3: Site URL Saja**
```
http://localhost:3030?message=Check+your+email
```
❌ Hanya redirect ke homepage

---

## 🔧 FIX: Perbaiki Email Template di Supabase

Jika link Anda **SALAH** (tidak ada `#access_token=...&type=recovery`), berarti **Email Template di Supabase salah konfigurasi**.

### Cara Perbaiki:

1. **Login ke Supabase Dashboard**
   - https://supabase.com
   - Pilih project

2. **Authentication → Email Templates**
   - Klik **"Reset Password"** atau **"Magic Link"**

3. **Cari bagian HTML Template**
   Pastikan template menggunakan **{{ .ConfirmationURL }}**:

```html
<h2>Reset Your Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

4. **JANGAN menggunakan {{ .SiteURL }}**:
```html
<!-- ❌ SALAH - JANGAN PAKAI INI -->
<p><a href="{{ .SiteURL }}">Reset Password</a></p>
```

5. **Save Template**

6. **Test Lagi:**
   - Kirim email reset password BARU
   - Copy link dari email
   - Paste di notepad
   - Cek apakah sekarang ada `#access_token=...&type=recovery`

---

## 🧪 TEST MANUAL

Jika Anda ingin test tanpa email, bisa buat link manual:

```
http://localhost:3030#access_token=YOUR_TOKEN&type=recovery&expires_in=3600
```

Ganti `YOUR_TOKEN` dengan token valid dari Supabase.

**Cara dapat token:**
1. Buka Console browser (F12)
2. Jalankan:
```javascript
supabase.auth.resetPasswordForEmail('admin@rs-sehat.com').then(console.log)
```
3. Cek email, copy token dari link

---

## 📋 CHECKLIST

Sebelum test lagi:

- [ ] Copy link dari email (jangan klik dulu)
- [ ] Paste di notepad
- [ ] Cek ada `#access_token=...`
- [ ] Cek ada `&type=recovery`
- [ ] Jika TIDAK ada → perbaiki Email Template di Supabase
- [ ] Jika ADA → test klik link tersebut
- [ ] Buka Console browser (F12)
- [ ] Perhatikan log yang muncul

---

## 🎯 Console Log yang Harus Muncul

Saat klik link yang BENAR:

```
🔍 INITIAL CHECK - URL hash: #access_token=...&type=recovery&...
🔐 RECOVERY URL DETECTED! Setting reset password mode...
🔔 Setting up auth state listener...
🔔 Auth event: PASSWORD_RECOVERY Has session: true
✅ PASSWORD_RECOVERY event received!
⏭️ SKIPPING session check - reset password mode active
🔐 App rendering: RESET PASSWORD PAGE
🎨 ResetPassword component mounted/rendered
```

Jika yang muncul:
```
🔍 INITIAL CHECK - URL hash: (kosong atau hanya #)
📝 Normal page load - no recovery detected
🔍 Starting normal session check...
✅ Valid session found, fetching profile...
```
Berarti **link email SALAH** (tidak ada recovery token).

---

## 💡 Solusi Sementara

Jika Email Template sulit diperbaiki, gunakan alternatif:

### Opsi 1: Copy Link Manual
1. Kirim email reset
2. Copy link dari email
3. Cek apakah ada `#access_token=...&type=recovery`
4. Jika ada, paste di browser
5. Jika tidak ada, perbaiki Email Template

### Opsi 2: Test dengan Magic Link
Di Supabase Dashboard:
1. Authentication → Users
2. Pilih user
3. Klik **"Send Magic Link"**
4. Cek email
5. Link magic link biasanya formatnya lebih reliable

---

## ⚠️ PENTING

**Link email hanya valid 1 jam!**

Jika sudah expired, akan muncul error. Kirim ulang email reset password baru.

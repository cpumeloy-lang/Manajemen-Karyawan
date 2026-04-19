# 🔐 Troubleshooting: Tidak Bisa Login Setelah Ubah Password

## ❓ Masalah
Password sudah berhasil diubah di dashboard karyawan, tapi **tidak bisa login** dengan password baru.

---

## 🔍 Langkah Debugging

### **1. Buka Browser Console (F12)**
Sebelum mencoba login, buka Console untuk melihat logs:

```
F12 → Console Tab
```

### **2. Coba Login dengan Password Baru**
Masukkan:
- Email karyawan
- Password BARU yang baru saja diubah
- Klik Login

### **3. Lihat Console Logs**

Anda akan melihat logs seperti ini:

#### **Jika Login BERHASIL:**
```
🔐 Attempting login...
📧 Email: karyawan@example.com
🔑 Password length: 10
🔐 Login result: { data: {...}, error: null }
✅ Login successful!
User: karyawan@example.com
```

#### **Jika Login GAGAL:**
```
🔐 Attempting login...
📧 Email: karyawan@example.com
🔑 Password length: 10
🔐 Login result: { data: null, error: {...} }
❌ Login error: AuthApiError: Invalid login credentials
Error message: Invalid login credentials
Error status: 400
```

---

## 🛠️ Solusi Berdasarkan Error

### **Error 1: "Invalid login credentials"**

**Penyebab:**
- Email salah (typo, huruf besar/kecil)
- Password salah (belum benar-benar berubah)
- Session cache issue

**Solusi:**

#### **A. Pastikan Email Benar**
1. Cek di database Supabase → Auth → Users
2. Lihat email yang terdaftar
3. Gunakan email PERSIS seperti di database (case-sensitive)

#### **B. Pastikan Password Benar-Benar Berubah**
1. Saat ubah password di dashboard, lihat console:
   ```
   🔐 Attempting to update password...
   🔐 Password update result: { data: {...}, error: null }
   ✅ Password successfully updated in database!
   ```
2. Jika ada error di sini, password TIDAK berubah!

#### **C. Clear Browser Cache & Cookies**
```
1. Tekan Ctrl + Shift + Delete
2. Pilih:
   - Cookies and other site data
   - Cached images and files
3. Time range: All time
4. Klik "Clear data"
5. Restart browser
6. Coba login lagi
```

#### **D. Hard Refresh**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

### **Error 2: Session Conflict**

**Penyebab:** Session lama masih aktif setelah ubah password

**Solusi:**

#### **Logout Paksa:**
1. Buka Console (F12)
2. Ketik:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
3. Coba login lagi

---

### **Error 3: Password Tidak Berubah di Database**

**Penyebab:** Proses update password gagal di backend

**Solusi:**

#### **Cek Console Saat Ubah Password:**
Saat klik "Ubah Password", harus muncul:
```
🔐 Attempting to update password...
🔐 Password update result: { data: {...}, error: null }
✅ Password successfully updated in database!
📧 User email: karyawan@example.com
```

**Jika ada error:**
```
❌ Change password error: [error message]
```
→ Password TIDAK berubah, ulangi proses ubah password!

---

## ✅ Cara Test yang Benar

### **Langkah 1: Ubah Password**
1. Login dengan password LAMA
2. Buka Dashboard → Klik "🔒 Ubah Password"
3. Input:
   - Password Baru: `TestPassword123`
   - Konfirmasi: `TestPassword123`
4. Klik "Ubah Password"
5. **Lihat console** → Pastikan muncul "✅ Password successfully updated"
6. **Tunggu message** → "✅ Password berhasil diubah!"

### **Langkah 2: Logout**
1. Klik tombol "Logout" di sidebar
2. Tunggu sampai redirect ke halaman login
3. **Optional:** Clear cache/cookies

### **Langkah 3: Login dengan Password Baru**
1. Masukkan email yang SAMA
2. Masukkan password BARU: `TestPassword123`
3. Klik "Login"
4. **Lihat console** → Harus ada "✅ Login successful!"
5. Seharusnya berhasil login ✅

---

## 🔧 Jika Masih Gagal

### **Reset Password via Email (Alternatif):**

1. **Logout** dari aplikasi
2. Di halaman login, klik **"Lupa Password?"**
3. Masukkan **email karyawan**
4. Klik **"Kirim Link Reset"**
5. **Buka email** → Cari email dari Supabase
6. **Klik link** di email (link valid 1 jam)
7. Akan redirect ke form reset password
8. Masukkan **password baru**
9. Klik **"Reset Password"**
10. Coba **login** dengan password baru

---

## 📊 Checklist Debugging

- [ ] Console logs saat ubah password menunjukkan "✅ Password successfully updated"
- [ ] Message "✅ Password berhasil diubah!" muncul
- [ ] Logout berhasil (redirect ke login page)
- [ ] Email yang digunakan PERSIS sama (tidak typo)
- [ ] Password minimal 6 karakter
- [ ] Browser cache sudah di-clear
- [ ] Console logs saat login menunjukkan error spesifik
- [ ] Tidak ada session conflict (localStorage/sessionStorage clear)

---

## 🆘 Informasi untuk Developer

Jika masalah tetap terjadi, share informasi ini:

### **Saat Ubah Password:**
```
[Paste console logs dari "🔐 Attempting to update password..." sampai selesai]
```

### **Saat Login:**
```
[Paste console logs dari "🔐 Attempting login..." sampai error]
```

### **Error Message:**
```
[Copy error message yang muncul di UI]
```

---

## 💡 Tips Keamanan

1. **Password Minimal:** 8 karakter (saat ini 6)
2. **Password Complexity:** Kombinasi huruf besar, kecil, angka, simbol
3. **Jangan Share Password:** Jangan bagikan password ke siapapun
4. **Regular Update:** Ubah password secara berkala (3-6 bulan)
5. **Unique Password:** Jangan pakai password yang sama dengan akun lain

---

## 📝 Catatan Teknis

- Password di-hash dengan **bcrypt** (tidak bisa dilihat plain text)
- Tersimpan di tabel `auth.users` kolom `encrypted_password`
- Update password menggunakan `supabase.auth.updateUser()`
- Login menggunakan `supabase.auth.signInWithPassword()`
- Session management otomatis oleh Supabase Auth

---

**Jika sudah mengikuti semua langkah di atas tapi masih gagal, hubungi developer dengan informasi console logs!** 🚨

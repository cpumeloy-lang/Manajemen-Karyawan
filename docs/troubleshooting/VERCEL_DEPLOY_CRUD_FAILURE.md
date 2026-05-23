# Troubleshooting: CRUD Gagal di Vercel tapi Bisa di Local

## 📋 Ringkasan Masalah

**Skenario**: Aplikasi HRMS Pro berjalan normal di local development, tetapi CRUD operations (Create, Read, Update, Delete) gagal setelah deploy ke Vercel.

**Status**: ✅ RESOLVED

---

## 🔴 Root Cause: Syntax Error di server.js

### Masalah
Function `redisRateLimiter` di `server.js` **tidak memiliki closing brace `}`**, menyebabkan semua kode setelahnya (termasuk `export default app`) berada di dalam function body.

### Dampak
- Node.js tidak bisa parse file → **SyntaxError**
- Vercel Serverless Function crash pada cold start
- Semua API endpoints return **500 Internal Server Error**
- CRUD operations gagal total

### Verifikasi
```bash
node --check server.js
```

**Output Error:**
```
server.js:420
export default app;
^^^^^^
SyntaxError: Unexpected token 'export'
```

### Solusi
Tambahkan closing brace `};` untuk function `redisRateLimiter`:

```javascript
// @server.js:319-326
    next();
  } catch (err) {
    loggingService.warn('Redis rate limiter failed, allowing request', { error: err.message });
    next();
  }
};  // ← TAMBAHKAN KURUNG KURAWAL INI

// app.use(redisRateLimiter);
```

---

## 🟡 Masalah Lain yang Perlu Diperhatikan

### 1. Environment Variables Belum Di-set

**Variabel yang WAJIB di-set di Vercel Dashboard:**

| Variable | Purpose | Dapat Dari |
|----------|---------|------------|
| `VITE_DATA_SUPABASE_URL` | Supabase connection URL | Supabase Dashboard → Project Settings → API |
| `VITE_DATA_SUPABASE_ANON_KEY` | Auth client (public key) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations (create/delete auth users) | Supabase Dashboard → Project Settings → API (service_role) |
| `CORS_ORIGINS` | CORS whitelist | Domain Vercel Anda |

**Cara Set:**
1. Buka Vercel Dashboard → Project Settings
2. Tab "Environment Variables"
3. Add variable satu per satu
4. Deploy ulang

### 2. Redis Tidak Tersedia di Vercel Serverless

- Vercel Serverless tidak punya Redis local
- Kode sudah ada error handling → cache akan selalu miss (performance issue, bukan functional failure)
- **Solusi opsional**: Gunakan Redis external (Upstash, Redis Cloud) atau disable cache untuk serverless

### 3. CORS Configuration Risky

Kalau `CORS_ORIGINS` tidak di-set:
```javascript
origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true, // Allow all!
```

**Solusi**: Selalu set `CORS_ORIGINS` dengan domain production Anda.

---

## 🛠️ Checklist Deployment ke Vercel

### Pre-Deploy (Local)

```bash
# 1. Verifikasi syntax
node --check server.js

# 2. Type check
npm run typecheck

# 3. Build test
npm run build

# 4. Run tests
npm run test

# 5. Health check (local)
npm start &
curl http://localhost:3000/api/health
```

### Post-Deploy (Vercel)

```bash
# 1. Health check
curl https://your-app.vercel.app/api/health
# Expected: {"status":"ok","supabase":"connected"}

# 2. Test auth
curl https://your-app.vercel.app/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: List employees atau 401 jika token invalid
```

---

## 🔍 Flow Diagnosis Lengkap

### Step 1: Verifikasi Syntax Error
```bash
node --check server.js
```
- ✅ Pass → Lanjut ke Step 2
- ❌ Fail → Fix syntax error dulu

### Step 2: Cek Environment Variables
```bash
curl https://your-app.vercel.app/api/health
```
Response error? Cek Vercel Dashboard → Environment Variables.

### Step 3: Cek Build Logs
Vercel Dashboard → Deployments → [Latest] → Build Logs

Cari error seperti:
- `SyntaxError`
- `Module not found`
- `Cannot find module`

### Step 4: Cek Function Logs
Vercel Dashboard → Functions → [API Route] → Logs

Cari error runtime:
- `500 Internal Server Error`
- `Cannot read property of undefined`

---

## 📝 Perbedaan Local vs Vercel

| Aspek | Local Dev | Vercel Production |
|-------|-----------|-------------------|
| **Server** | Express (local-server.js) | Serverless Function |
| **Redis** | Local instance (jika running) | Tidak tersedia |
| **Env Vars** | Dari `.env` file | Dari Vercel Dashboard |
| **CORS** | Proxy via Vite | Direct request |
| **File System** | Persistent | Read-only (kecuali /tmp) |
| **Cold Start** | N/A | Ada (±1-3 detik) |

---

## 🚨 Common Error Messages & Solusi

| Error Message | Penyebab | Solusi |
|---------------|----------|--------|
| `SyntaxError: Unexpected token 'export'` | Missing closing brace | Fix syntax di server.js |
| `503 Supabase server clients are not configured` | Env vars belum di-set | Set `VITE_DATA_SUPABASE_*` di Vercel |
| `401 Missing authorization token` | Token tidak dikirim | Cek auth header di frontend |
| `403 Employee profile not found` | User belum punya profile | Buat profile di Supabase |
| `400 Gagal membuat akun login` | `SUPABASE_SERVICE_ROLE_KEY` salah | Cek key di Vercel Dashboard |
| `Failed to connect redis client` | Redis tidak tersedia | Normal di Vercel, cache akan miss |

---

## 🔄 Reproduksi & Fix Cepat

### Reproduksi Error (untuk testing)

```javascript
// Hapus closing brace di server.js untuk test
// Dari:
  } catch (err) {
    loggingService.warn(...);
    next();
  }
};

// Jadi (broken):
  } catch (err) {
    loggingService.warn(...);
    next();
  }
// app.use(redisRateLimiter);
```

Run:
```bash
node --check server.js  # Akan error
```

### Fix
Tambahkan `};` sebelum comment `// app.use(redisRateLimiter);`

---

## 📞 Escalation Path

Kalau masalah masih terjadi setelah checklist ini:

1. **Cek Vercel Support**: https://vercel.com/support
2. **Cek Supabase Status**: https://status.supabase.com
3. **Review Application Logs**: Vercel Dashboard → Functions → Logs
4. **Enable Debug Mode**: Set `DEBUG=*` environment variable di Vercel

---

## ✅ Final Verification Script

```bash
#!/bin/bash
# verify-deployment.sh

BASE_URL="https://your-app.vercel.app"

echo "=== Deployment Verification ==="

# Health check
echo -n "Health: "
curl -s "$BASE_URL/api/health" | jq -r '.status // "FAIL"'

# Auth test (butuh valid token)
# echo -n "Auth: "
# curl -s "$BASE_URL/api/employees" \
#   -H "Authorization: Bearer $TOKEN" \
#   -o /dev/null -w "%{http_code}"

echo "=== Done ==="
```

---

**Dokumen ini dibuat**: 23 Mei 2026  
**Terakhir update**: 23 Mei 2026  
**Versi aplikasi**: HRMS Pro

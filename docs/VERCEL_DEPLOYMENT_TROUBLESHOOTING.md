# Panduan Troubleshooting Vercel & Express.js (ESM)

Dokumen ini ditulis secara khusus sebagai pengingat dan panduan bagi tim *developer* maupun AI Code Assistant di masa depan apabila terjadi *crash* atau pesan `500 Internal Server Error (FUNCTION_INVOCATION_FAILED)` pada *deployment* Vercel untuk arsitektur Node.js Express yang menggunakan ESM (`"type": "module"`).

## Kasus yang Pernah Terjadi
Aplikasi berjalan sangat lancar di lokal (`npm run dev` atau `node server.js`), namun ketika di-*deploy* ke Vercel, semua *endpoint* API (terutama operasi POST/DELETE) menghasilkan salah satu dari:
1. `405 Method Not Allowed`
2. `500 Internal Server Error` dengan *response body* berisi halaman HTML bawaan Vercel dengan tulisan `FUNCTION_INVOCATION_FAILED`.

## Akar Masalah (Root Causes)

Jika aplikasi ini menggunakan Vite (Frontend) dan Express (Backend) dengan pengaturan `"type": "module"` di `package.json`, Vercel memiliki 3 jebakan utama:

### 1. Jebakan Sintaks `import.meta.url` (Fatal)
Saat Vercel menggunakan *builder* `@vercel/node`, ia sering kali melakukan *transpiling* (penerjemahan) file `.js` menjadi *CommonJS* agar kompatibel dengan lingkungan internal *AWS Lambda/Serverless* milik Vercel. 
- Jika di dalam `server.js` terdapat kode seperti:
  ```javascript
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```
- *Builder* Vercel akan menerjemahkannya ke *CommonJS*, di mana objek `import.meta` **tidak eksis**. Akibatnya, pada detik pertama mesin menyala, Node.js melempar `SyntaxError: Cannot use 'import.meta' outside a module` dan mematikan fungsi Serverless seketika (*Error 500*).
- **Solusi:** Hapus segala penggunaan `import.meta.url` atau `__dirname` di dalam `server.js`. Di Vercel, *frontend* statis (berada di folder `dist`) tidak perlu disajikan oleh Express secara manual (seperti `express.static`), melainkan langsung ditangani oleh *edge network* Vercel (bisa diatur lewat *rewrites* `vercel.json`).

### 2. Jebakan Fungsi `app.listen()` (Timeout)
Di dalam fungsi Serverless, kode mengeksekusi permintaan dan segera mati (di-*freeze*) setelah merespon. 
- Jika `server.js` memiliki fungsi `app.listen(PORT, ...)` di dalam rute utamanya, *runtime* Serverless Vercel akan "menunggu" (*hang*) mendengarkan *port* tersebut dan akhirnya waktu eksekusinya habis (*Timeout/Error 500*).
- **Solusi:** Pisahkan file yang memiliki `app.listen`. Aplikasi utama (Express app) hanya boleh di-*export* (`export default app;`). Jika butuh menjalankan di lokal, buat file baru seperti `local-server.js` yang bertugas khusus mengimpor `server.js` dan menjalankan `app.listen()`.

### 3. Jebakan Pustaka Native (Contoh: Sentry Profiling)
Pustaka yang menggunakan *bindings* C/C++ spesifik sistem operasi (seperti `@sentry/profiling-node` atau beberapa modul `bcrypt`/`canvas`) berpotensi gagal dimuat di lingkungan kontainer *Serverless* Vercel (Amazon Linux).
- Jika modul tersebut gagal di-*import* pada baris atas `server.js`, aplikasi akan mati seketika (*Error 500*).
- **Solusi:** Hindari *native bindings* di Vercel, gunakan versi JS murni (`bcryptjs`), atau pastikan pustaka tersebut memiliki versi `@vercel/edge`.

### 4. Jebakan Folder `/api` vs `"type": "module"` (Vercel Zero-Config)
Memasukkan rute Express ke dalam file `api/index.js` dengan ekstensi `.js` (di bawah aturan `type: module`) atau `.cjs` sering membuat sistem rute otomatis Vercel kebingungan, menghasilkan `405 Method Not Allowed` karena dianggap sebagai *file* teks statis, atau mati karena gagal di-*require*.
- **Solusi Terbaik (Bypass):** Jangan andalkan folder `api/`. Langsung definisikan arsitektur di `vercel.json` dengan menggunakan alat *builder* eksplisit.

## Konfigurasi Arsitektur Emas (Golden `vercel.json`)
Untuk menghindar dari semua jebakan di atas secara permanen, format mutlak `vercel.json` harus disetel secara eksplisit membedakan proses *build* Frontend dan Backend:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Kesimpulan untuk AI:** 
Jika menghadapi *Internal Server Error* di Vercel tanpa jejak di log *catch/try*, **jangan membuang waktu membedah logika rute/Supabase/database**. Masalah 99% berada di tingkat sintaks modul (ESM), *timeout listener*, atau pembacaan *file* statis yang gagal dikompilasi oleh `@vercel/node`.

# 🔧 Database Connection Test

Untuk menguji koneksi database dan setup yang diperlukan, jalankan command berikut:

```bash
npm run test:db
```

Atau test manual dengan membuka browser console dan jalankan:

```javascript
// Test koneksi Supabase
fetch('https://ahwgiwzppyfzejzgddag.supabase.co/rest/v1/units?select=count', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFod2dpd3pwcHlmemVqemdkZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NTQyMzQsImV4cCI6MjA3NzAzMDIzNH0.-1kjr4X062n4Se2bell5y3SMYTQtihOR5zUlDbcb0OQ',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFod2dpd3pwcHlmemVqemdkZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NTQyMzQsImV4cCI6MjA3NzAzMDIzNH0.-1kjr4X062n4Se2bell5y3SMYTQtihOR5zUlDbcb0OQ'
  }
})
.then(response => {
  if (response.ok) {
    console.log('✅ Database connection successful!');
  } else {
    console.log('❌ Database error:', response.status, response.statusText);
  }
})
.catch(error => {
  console.log('❌ Network error:', error.message);
});
```

## Quick Fix untuk Database Error

1. **Jika muncul error "Failed to fetch":**
   - Periksa koneksi internet
   - Pastikan URL dan API key di `.env.local` benar

2. **Jika muncul error "relation does not exist":**
   - Database belum di-setup
   - Jalankan script dari `database-setup.sql` di Supabase Dashboard

3. **Manual Setup:**
   - Buka [Supabase Dashboard](https://supabase.com/dashboard)
   - Pilih project: `ahwgiwzppyfzejzgddag`
   - Masuk ke SQL Editor
   - Copy-paste isi file `database-setup.sql`
   - Klik "Run"

## Expected Tables:
- `public.units` - Unit kerja/departemen
- `public.employees` - Data karyawan  
- `public.attendance` - Data presensi
- `public.requests` - Permintaan cuti/reimbursement
- `public.documents` - Dokumen karyawan
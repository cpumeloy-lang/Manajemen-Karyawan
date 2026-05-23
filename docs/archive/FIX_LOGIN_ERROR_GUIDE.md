<!-- FIX LOGIN ERROR: STEP-BY-STEP GUIDE -->

## ❌ Error: "Akun Anda tidak terdaftar sebagai karyawan"

Ini berarti login berhasil, tapi **tidak ada employee record** untuk user tersebut.

---

## 🔍 STEP 1: DIAGNOSE MASALAH

### Jalankan Query Debug di Supabase SQL Editor:

```sql
-- Cek berapa banyak employee
SELECT COUNT(*) as total_employees FROM public.employees;

-- Cek employee punya user_id?
SELECT COUNT(*) as employees_with_user_id 
FROM public.employees 
WHERE "user_id" IS NOT NULL;

-- Cek user auth ada?
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Cek user yang login tidak ada di employees
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.employees e ON u.id = e."user_id"
WHERE e.id IS NULL;

-- Cek RLS policies sudah aktif?
SELECT COUNT(*) as total_policies FROM pg_policies 
WHERE tablename = 'employees';

-- Cek roles_permissions ada?
SELECT COUNT(*) as total_permissions FROM public.roles_permissions;
```

---

## 🛠️ STEP 2: PILIH FIX BERDASARKAN DIAGNOSIS

### Scenario A: Migration SQL BELUM dijalankan
**Ciri-ciri:** 
- roles_permissions table kosong atau tidak ada
- RLS policies tidak ada
- Query debug result kosong

**FIX:**
1. Buka Supabase SQL Editor
2. Copy semua dari `database-rbac-update.sql`
3. Paste & Run
4. Tunggu selesai ✅

---

### Scenario B: Migration OK, tapi Employee Data Tidak Setup
**Ciri-ciri:**
- roles_permissions ada (count > 0)
- RLS policies ada
- Tapi employees kosong atau user_id NULL

**FIX A: Setup Existing Employee dengan User ID**

```sql
-- Update employee pertama dengan user ID yang login
UPDATE public.employees 
SET "user_id" = '<PASTE_USER_ID_HERE>', 
    role = 'admin'
WHERE id = (SELECT id FROM public.employees ORDER BY created_at LIMIT 1);

-- Verify
SELECT id, "user_id", email, role FROM public.employees WHERE role = 'admin';
```

Caranya dapat USER_ID:
1. Login ke aplikasi
2. Buka browser DevTools → Console
3. Jalankan: `JSON.parse(localStorage.getItem('auth')).user.id`
4. Copy USER_ID tersebut

**FIX B: Create New Employee untuk User yang Login**

```sql
INSERT INTO public.employees (
    "user_id",
    email,
    "namaKaryawan", 
    role,
    "noIdentitas",
    "jenisIdentitas"
) VALUES (
    '<USER_ID_FROM_LOGIN>',
    '<EMAIL_USER>',
    'Admin User',
    'admin',
    '000000000000000000',
    'KTP'
);
```

---

### Scenario C: RLS Policies BLOCK Query
**Ciri-ciri:**
- Migration sudah dijalankan
- Employee ada & user_id match
- Tapi masih error

**FIX: Disable RLS untuk Testing**

```sql
-- Temporarily disable RLS
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests DISABLE ROW LEVEL SECURITY;

-- Test login lagi
-- Jika login OK: RLS ada bug, perlu fix policy
-- Jika masih error: Masalah lain

-- Setelah debug, enable kembali
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
```

---

## ✅ STEP 3: VERIFY FIX BERHASIL

Setelah jalankan fix di atas:

1. **Di Supabase SQL Editor:**
```sql
-- Cek role user yang login
SELECT id, email, "user_id", role 
FROM public.employees 
WHERE "user_id" = auth.uid();
```

2. **Di Frontend:**
   - Refresh browser (F5)
   - Clear browser cache (Ctrl+Shift+Delete)
   - Login ulang
   - Should show: ✅ "Dashboard" atau employee data

---

## 🚨 TROUBLESHOOTING LANJUT

### Masih Error Setelah Fix?

1. **Cek console browser:**
   ```javascript
   // Di DevTools Console, jalankan:
   const { data, error } = await supabase
     .from('employees')
     .select('*')
     .single();
   console.log('Data:', data);
   console.log('Error:', error);
   ```

2. **Cek status RLS:**
   ```sql
   SELECT schemaname, tablename, rowsecurity FROM pg_tables 
   WHERE tablename IN ('employees', 'attendance', 'requests');
   -- Seharusnya rowsecurity = true
   ```

3. **Cek query logs di Supabase:**
   - Dashboard → Logs → SQL Editor
   - Lihat error message lengkap

---

## 📋 CHECKLIST SEBELUM LANJUT

- [ ] Migration SQL sudah dijalankan?
- [ ] roles_permissions table ada isinya?
- [ ] Employee record ada & linked ke user ID?
- [ ] RLS policies aktif?
- [ ] Frontend sudah di-refresh?
- [ ] Login error sudah hilang?

**Kasih tahu status dari debug query di atas, saya bantu fix!** 🚀

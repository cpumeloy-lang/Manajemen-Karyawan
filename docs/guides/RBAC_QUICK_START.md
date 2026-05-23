# 🚀 RBAC IMPLEMENTATION - QUICK START GUIDE

**Status:** ✅ Ready to Deploy  
**Estimated Time:** 20-30 minutes

---

## 📋 What You Need To Do (4 Simple Steps)

### **STEP 1: Run Database Migration** ⏱️ 5 min
```sql
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy entire contents of: database-rbac-update.sql
-- 3. Paste into SQL Editor
-- 4. Click "RUN"
-- 5. Wait for success message (should see "✅ RBAC Schema Update Complete")
```

**Verify it worked:**
```sql
-- Run this query to confirm
SELECT COUNT(*) as total_permissions FROM public.roles_permissions;
-- Should show: 32 permissions

SELECT DISTINCT role FROM public.employees ORDER BY role;
-- Should show: admin, hrd, kepala_ruangan, karyawan
```

---

### **STEP 2: Update Your Environment** ⏱️ 3 min

**For Local Development (`.env.local`):**
```bash
VITE_DATA_SUPABASE_URL=http://localhost:54321
VITE_DATA_SUPABASE_ANON_KEY=your-anon-key
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**For Production (`.env.production`):**
```bash
VITE_DATA_SUPABASE_URL=https://your-project.supabase.co
VITE_DATA_SUPABASE_ANON_KEY=your-anon-key
PORT=3000
CORS_ORIGIN=https://your-domain.com
```

---

### **STEP 3: Set Up & Run API Server** ⏱️ 10 min

**3a. Install Express dependencies:**
```bash
npm install express cors
# or if using yarn
yarn add express cors
```

**3b. Build TypeScript:**
```bash
npm run build
```

**3c. Start the API server:**

**Option A - Using Node.js:**
```bash
node api-server.ts
# Or if you need to compile first:
npx tsc api-server.ts && node api-server.js
```

**Option B - Using ts-node (if available):**
```bash
npx ts-node api-server.ts
```

**Expected output:**
```
╔════════════════════════════════════════════════════════╗
║     🔒 HRMS Pro - Secure API Server (RBAC Enabled)     ║
╠════════════════════════════════════════════════════════╣
║ Server running on: http://localhost:3000               ║
║ Mode: Production (RBAC Enforcement Active)             ║
║ Auth: Supabase JWT + Role-Based Access Control         ║
║ Status: Ready to accept requests                       ║
╚════════════════════════════════════════════════════════╝
```

---

### **STEP 4: Test Everything** ⏱️ 5-10 min

**Test 1: Health Check (No Auth Required)**
```bash
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"2026-04-22T...","uptime":...}
```

**Test 2: Unauthenticated Request (Should Fail)**
```bash
curl http://localhost:3000/api/employees

# Expected response:
# {"success":false,"error":"Authentication required"}
```

**Test 3: With Admin Token (Should Work)**
```bash
# 1. Get your admin user's token from Supabase
# 2. Run:
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:3000/api/employees

# Expected response:
# {"success":true,"message":"Employees retrieved",...}
```

**Test 4: With Karyawan Token on Admin Endpoint (Should Fail)**
```bash
# 1. Get karyawan user's token
# 2. Run:
curl -H "Authorization: Bearer KARYAWAN_TOKEN" \
     http://localhost:3000/api/employees

# Expected response:
# {"success":false,"error":"Insufficient permissions. Required roles: admin, hrd"}
```

---

## 🧪 Verification Checklist

After deployment, verify everything works:

| Check | Command | Expected Result |
|-------|---------|-----------------|
| **DB Migration** | `SELECT COUNT(*) FROM roles_permissions;` | 32 |
| **Roles Added** | `SELECT DISTINCT role FROM employees;` | 4 roles |
| **API Health** | `curl http://localhost:3000/api/health` | 200 OK |
| **Auth Required** | `curl http://localhost:3000/api/employees` | 401 Error |
| **Admin Access** | `curl -H "Bearer ADMIN_TOKEN" ...` | 200 OK |
| **Karyawan Denied** | `curl -H "Bearer KARYAWAN_TOKEN" ...` | 403 Error |
| **Role Read from DB** | Check user context returns correct role | ✅ |

---

## 🔒 Security Validation

After deployment, verify security measures are in place:

```bash
# 1. Verify RLS is enabled
psql "postgresql://user:password@host/db" -c \
  "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"
# All tables should show rowsecurity = true

# 2. Verify JWT validation works
curl -H "Authorization: Bearer INVALID_TOKEN" \
     http://localhost:3000/api/status
# Should return 401

# 3. Check CORS is restrictive
curl -H "Origin: http://evil.com" http://localhost:3000/api/health
# Should reject if not in CORS_ORIGIN
```

---

## 📊 Real-World Test Scenario

### Scenario: HR Manager approves employee's leave request

1. **Employee** (karyawan role) creates request:
   ```bash
   curl -X POST http://localhost:3000/api/requests \
     -H "Authorization: Bearer KARYAWAN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"type":"Cuti","startDate":"2026-05-01","endDate":"2026-05-05"}'
   # Returns: 201 Created
   ```

2. **HR Manager** (hrd role) views requests:
   ```bash
   curl http://localhost:3000/api/requests \
     -H "Authorization: Bearer HRD_TOKEN"
   # Returns: List of all requests to approve
   ```

3. **HR Manager** approves:
   ```bash
   curl -X POST http://localhost:3000/api/requests/REQUEST_ID/approve \
     -H "Authorization: Bearer HRD_TOKEN"
   # Returns: 200 OK - Request approved
   ```

4. **Kepala Ruangan** (unit leader) CANNOT approve:
   ```bash
   curl -X POST http://localhost:3000/api/requests/REQUEST_ID/approve \
     -H "Authorization: Bearer KEPALA_RUANGAN_TOKEN"
   # Returns: 403 Forbidden - Need HRD/Admin
   ```

---

## ⚠️ Common Issues & Solutions

### **Issue: "Cannot find module 'express'"**
```bash
# Solution:
npm install express cors
npm install --save-dev @types/express
```

### **Issue: "CORS blocked request"**
```bash
# Solution: Update CORS_ORIGIN in .env to match frontend URL
# Frontend: http://localhost:5173
# API .env: CORS_ORIGIN=http://localhost:5173
```

### **Issue: "Token verification failed"**
```bash
# Solution: Verify Supabase credentials in .env
# Check: VITE_DATA_SUPABASE_URL is correct
# Check: VITE_DATA_SUPABASE_ANON_KEY is correct
```

### **Issue: "User not found in database"**
```bash
# Solution: Ensure employee record exists with matching user_id
SELECT user_id, role FROM employees WHERE email = 'user@example.com';
# Should return one row with role set
```

---

## 📈 Next Steps (After Verification)

### **Phase 2: Frontend Integration**
1. Update frontend to use `/api/` endpoints instead of direct Supabase
2. Add request interceptors to include Authorization header
3. Update error handling for 403 responses
4. Test each role's UI

### **Phase 3: Monitoring**
1. Set up logging for RBAC denials
2. Create dashboard for admin to view access attempts
3. Set up alerts for suspicious access patterns

### **Phase 4: Advanced**
1. Add permission delegation (HRD → Kepala Ruangan)
2. Add time-based permissions (temporary access)
3. Add geo-fencing restrictions
4. Add 2FA for sensitive operations

---

## 🚨 Important Security Notes

⚠️ **Database RLS is NOT enforced if:**
- Bypassing API and calling Supabase directly with anon key
- Using service_role key (can bypass RLS)

✅ **To ensure maximum security:**
1. **Always** use API server (don't call Supabase directly from frontend)
2. Frontend should only use Bearer tokens in API calls
3. Never expose service_role key to frontend
4. Monitor API logs for repeated 403 errors (potential attacks)
5. Keep token expiry short (15-60 minutes)

---

## 📞 Support

If you encounter issues:

1. **Check logs:**
   ```bash
   # API server logs
   tail -f logs/api.log
   
   # Supabase logs (in dashboard)
   Database → Logs
   ```

2. **Debug user context:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
        http://localhost:3000/api/status
   ```

3. **Verify database state:**
   ```sql
   -- Check user's role
   SELECT id, email, role FROM employees WHERE email = 'your@email.com';
   
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

---

## ✅ Deployment Complete!

**You now have:**
- ✅ 4 roles with clear hierarchy
- ✅ 32+ permissions mapped to roles
- ✅ Database RLS for data protection
- ✅ API middleware for endpoint protection
- ✅ Secure backend server with RBAC
- ✅ Audit logging capability

**Your HRMS Pro is now enterprise-grade secure!** 🎉

---

**Questions?** Check `RBAC_IMPLEMENTATION_GUIDE.md` for detailed documentation.

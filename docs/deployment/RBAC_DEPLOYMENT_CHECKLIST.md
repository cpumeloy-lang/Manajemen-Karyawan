# ✅ RBAC DEPLOYMENT CHECKLIST

Use this checklist to systematically deploy the RBAC system.

---

## **PHASE 1: Preparation** 📋

- [ ] Read `RBAC_QUICK_START.md` (overview)
- [ ] Read `RBAC_IMPLEMENTATION_GUIDE.md` (detailed)
- [ ] Backup current database
  ```sql
  -- In Supabase, export your data
  ```
- [ ] Create a test user account for each role
  - [ ] Admin test account
  - [ ] HRD test account
  - [ ] Kepala Ruangan test account
  - [ ] Karyawan test account
- [ ] Verify current system is working
  ```bash
  npm run dev  # Frontend should load
  ```

---

## **PHASE 2: Database Migration** 🗄️

### Step 1: Run Migration Script

- [ ] Open Supabase Dashboard
- [ ] Navigate to: SQL Editor
- [ ] Create new query
- [ ] Copy entire contents of `database-rbac-update.sql`
- [ ] Paste into SQL Editor
- [ ] Click "RUN"
- [ ] Wait for completion (should see green checkmark)

### Step 2: Verify Migration

Run each verification query in Supabase:

- [ ] Count permissions:
  ```sql
  SELECT COUNT(*) as total FROM public.roles_permissions;
  -- Expected: 32
  ```

- [ ] Verify roles:
  ```sql
  SELECT DISTINCT role FROM public.employees ORDER BY role;
  -- Expected: admin, hrd, kepala_ruangan, karyawan
  ```

- [ ] Check RLS is enabled:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY tablename;
  -- All should show: t (true)
  ```

- [ ] Check roles_permissions table exists:
  ```sql
  SELECT * FROM public.roles_permissions LIMIT 5;
  -- Should show role, permission, description columns
  ```

- [ ] Verify your test users have correct roles:
  ```sql
  SELECT id, email, role FROM public.employees 
  WHERE email IN ('admin@test.com', 'hrd@test.com', 'kepala@test.com', 'karyawan@test.com');
  -- Should show all 4 with appropriate roles
  ```

✅ **If all checks pass, proceed to Step 3**

---

## **PHASE 3: Environment Setup** ⚙️

- [ ] Open `.env.local` (or `.env.development`)
- [ ] Add/verify these settings:
  ```bash
  VITE_DATA_SUPABASE_URL=http://localhost:54321
  # OR for production:
  VITE_DATA_SUPABASE_URL=https://your-project.supabase.co
  
  VITE_DATA_SUPABASE_ANON_KEY=your-anon-key
  PORT=3000
  CORS_ORIGIN=http://localhost:5173
  # OR for production:
  CORS_ORIGIN=https://your-domain.com
  ```
- [ ] Save `.env.local`
- [ ] Verify no syntax errors in .env file

---

## **PHASE 4: API Server Setup** 🚀

### Step 1: Install Dependencies

- [ ] Terminal: Open new terminal window
- [ ] Install Express:
  ```bash
  npm install express cors
  ```
- [ ] Verify installation:
  ```bash
  npm list express cors
  # Should show version numbers
  ```

### Step 2: Build TypeScript

- [ ] Build the project:
  ```bash
  npm run build
  # OR if no build script:
  npx tsc
  ```
- [ ] Check for errors
  - [ ] No "error TS" messages
  - [ ] `dist/` folder created

### Step 3: Start API Server

- [ ] Terminal: Make sure you're in project root
- [ ] Start API server:
  ```bash
  node api-server.ts
  # OR use ts-node:
  npx ts-node api-server.ts
  ```
- [ ] Wait for startup message:
  ```
  ╔════════════════════════════════════════════════════════╗
  ║     🔒 HRMS Pro - Secure API Server (RBAC Enabled)     ║
  ╠════════════════════════════════════════════════════════╣
  ║ Server running on: http://localhost:3000               ║
  ```
- [ ] Keep this terminal open (don't close!)
- [ ] Verify output shows no errors

✅ **If API server starts successfully, proceed to testing**

---

## **PHASE 5: API Testing** 🧪

### Test 1: Health Check (No Auth)

- [ ] Terminal: Open new terminal (keep API server running)
- [ ] Test:
  ```bash
  curl http://localhost:3000/api/health
  ```
- [ ] Expected response:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-04-22T...",
    "uptime": ...
  }
  ```
- [ ] ✅ Pass if status code 200

### Test 2: Unauthenticated Request (Should Fail)

- [ ] Test:
  ```bash
  curl http://localhost:3000/api/employees
  ```
- [ ] Expected response:
  ```json
  {
    "success": false,
    "error": "Authentication required"
  }
  ```
- [ ] ✅ Pass if status code 401

### Test 3: Admin Token (Should Work)

- [ ] Get admin user's Supabase token:
  ```bash
  # Option A: Use admin credentials
  curl -X POST https://your-supabase.supabase.co/auth/v1/token?grant_type=password \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"password"}'
  # Copy the access_token value
  ```
  
  - [ ] OR go to Supabase → Auth → Users → click admin user
  - [ ] Copy user ID
  - [ ] Run query to get token (requires service role key - for testing only)

- [ ] Test with admin token:
  ```bash
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
       http://localhost:3000/api/employees
  ```
- [ ] Expected response:
  ```json
  {
    "success": true,
    "message": "Employees retrieved",
    ...
  }
  ```
- [ ] ✅ Pass if status code 200

### Test 4: Karyawan Token (Should Be Denied)

- [ ] Get karyawan user's token (same process as admin)
- [ ] Test with karyawan token:
  ```bash
  curl -H "Authorization: Bearer KARYAWAN_TOKEN" \
       http://localhost:3000/api/employees
  ```
- [ ] Expected response:
  ```json
  {
    "success": false,
    "error": "Insufficient permissions. Required roles: admin, hrd"
  }
  ```
- [ ] ✅ Pass if status code 403

### Test 5: Status Endpoint with User Context

- [ ] Test:
  ```bash
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
       http://localhost:3000/api/status
  ```
- [ ] Expected response shows:
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "...",
      "email": "admin@test.com",
      "role": "admin",
      "employeeId": "...",
      "unitId": "..."
    }
  }
  ```
- [ ] ✅ Verify role matches database

✅ **If all 5 tests pass, API server is working correctly!**

---

## **PHASE 6: RLS Policy Validation** 🔐

Test that database RLS is working:

### In Supabase Dashboard:

- [ ] Query as admin (should work):
  ```sql
  -- Set JWT to admin token in Supabase header
  SELECT * FROM public.employees LIMIT 1;
  -- Expected: Returns data
  ```

- [ ] Query as karyawan (should see only own data):
  ```sql
  -- Set JWT to karyawan token
  SELECT * FROM public.employees;
  -- Expected: Returns only this user's record
  ```

- [ ] Try to update other employee's data (should fail):
  ```sql
  -- Set JWT to karyawan token
  UPDATE public.employees 
  SET nama = 'Hacked' 
  WHERE email != 'karyawan@test.com';
  -- Expected: 0 rows affected (RLS denied)
  ```

✅ **If RLS policies work, database layer is secure**

---

## **PHASE 7: Frontend Integration** 💻

### Preparation

- [ ] In another terminal, start frontend dev server:
  ```bash
  npm run dev
  # Frontend should run on http://localhost:5173
  ```

### Create API Interceptor

- [ ] Create file: `src/utils/apiClient.ts`
  ```typescript
  export const apiClient = (endpoint: string, options: RequestInit = {}) => {
    return fetch(`http://localhost:3000/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }).then(r => r.json());
  };
  ```

- [ ] Update your services to use apiClient:
  ```typescript
  // Old (direct Supabase):
  const { data } = await dataSupabase.from('employees').select('*');
  
  // New (via API):
  const { data } = await apiClient('/employees');
  ```

### Test One Endpoint

- [ ] Pick simplest endpoint: `GET /api/employees`
- [ ] Update frontend component to call it
- [ ] Verify it returns data (with proper auth token)
- [ ] Verify it denies access for karyawan role

✅ **After one endpoint works, repeat for others**

---

## **PHASE 8: Monitoring & Logs** 📊

- [ ] Set up logging in API server:
  ```bash
  # API server shows all requests with user info in console
  # Look for logs like:
  # [2026-04-22] GET /api/employees
  # User: admin@test.com (admin)
  ```

- [ ] Monitor for permission denials:
  ```bash
  # Each denied request shows in logs:
  # ❌ API Error: Insufficient permissions
  ```

- [ ] Create simple log file (optional):
  ```bash
  node api-server.ts > api-server.log 2>&1 &
  # Then tail logs:
  tail -f api-server.log
  ```

---

## **PHASE 9: Production Deployment** 🚀

### Before Going Live

- [ ] Test all 4 roles thoroughly:
  - [ ] Admin: Can access everything
  - [ ] HRD: Can manage employees not org
  - [ ] Kepala Ruangan: Can only see their unit
  - [ ] Karyawan: Can only see own data

- [ ] Test permission denials:
  - [ ] Karyawan cannot access employee list ✓
  - [ ] Kepala Ruangan cannot access other units ✓
  - [ ] Hrd cannot manage system settings ✓

- [ ] Test expired tokens:
  ```bash
  curl -H "Authorization: Bearer EXPIRED_TOKEN" \
       http://localhost:3000/api/employees
  # Should return 401
  ```

- [ ] Verify CORS settings:
  - [ ] Set CORS_ORIGIN to your production domain
  - [ ] Test requests from that domain work
  - [ ] Test requests from other domains fail

### Deploy API Server

- [ ] Deploy to production server
  - [ ] Option A: Heroku, Railway, or similar
  - [ ] Option B: Your own VPS
  - [ ] Option C: Serverless (AWS Lambda, etc.)

- [ ] Update frontend .env to point to production API
- [ ] Rebuild frontend
- [ ] Deploy frontend

- [ ] Monitor in production:
  ```bash
  tail -f api-server.log
  # Watch for errors and permission denials
  ```

✅ **After deployment, monitor for 24 hours**

---

## **PHASE 10: Post-Deployment Verification** ✅

### Day 1

- [ ] All endpoints are accessible
- [ ] No CORS errors
- [ ] No authentication errors (unless expected)
- [ ] Permissions work correctly
- [ ] Database RLS is enforced
- [ ] Audit logs are recording changes

### Week 1

- [ ] Monitor for repeated 403 errors (potential attacks)
- [ ] Check performance (response times acceptable)
- [ ] Test role changes (e.g., promote karyawan to hrd)
- [ ] Verify role changes take effect immediately

### Ongoing

- [ ] Monitor audit logs monthly
- [ ] Update documentation if needed
- [ ] Plan Phase 3 features (monitoring dashboard, etc.)

---

## **✅ COMPLETION SIGN-OFF**

When you reach this point, check everything:

- [ ] Database migration ✅ Complete
- [ ] API server running ✅ Healthy
- [ ] All 5 tests passed ✅ Success
- [ ] RLS policies enforced ✅ Confirmed
- [ ] Frontend integration started ✅ In progress
- [ ] Production ready ✅ Yes

---

## **🎉 You're Done!**

Your HRMS Pro now has enterprise-grade security with:
- ✅ Role-based access control
- ✅ JWT authentication
- ✅ Database-level enforcement
- ✅ Audit logging
- ✅ API middleware stack
- ✅ Context-aware permissions

**Next Phase:** Frontend integration + monitoring dashboard

---

## **❓ Troubleshooting**

| Problem | Solution |
|---------|----------|
| API won't start | Check PORT is free: `lsof -i :3000` |
| "Cannot find module" | Run: `npm install express cors` |
| 401 Unauthorized | Check token is valid and not expired |
| 403 Forbidden | Verify user role in database: `SELECT role FROM employees WHERE email='user@test.com'` |
| CORS error | Update CORS_ORIGIN in .env to match frontend URL |
| RLS policy error | Run database-rbac-update.sql again |

**For help:** Check `RBAC_IMPLEMENTATION_GUIDE.md`

---

**Created:** April 22, 2026  
**Status:** Ready to Deploy  
**Estimated Time:** 2-3 hours for full deployment

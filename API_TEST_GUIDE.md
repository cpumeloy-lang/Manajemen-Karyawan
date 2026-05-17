# API Endpoints Testing Guide

## ✅ Implemented & Fixed Endpoints (May 2025)

### 1. GET `/api/employees` - List All Employees
**Status**: ✅ **FULLY IMPLEMENTED**

**Route**:
```
GET /api/employees
Authorization: Bearer {JWT_TOKEN}
```

**Features**:
- ✅ Pagination support (`?page=1&limit=20`)
- ✅ Filtering by department (`?departmentId=...`)
- ✅ Filtering by status (`?status=Aktif`)
- ✅ Full-text search (`?search=John` - searches name & email)
- ✅ Sorting by creation date (newest first)
- ✅ Total count + pagination metadata
- ✅ RBAC protection (admin/hrd only)

**Example Requests**:
```bash
# Get all employees (page 1, default 20 per page)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees"

# Get page 2 with custom limit
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees?page=2&limit=50"

# Search by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees?search=john"

# Filter by department
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees?departmentId=dept123"

# Filter by status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees?status=Aktif"

# Combine filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/employees?page=1&limit=20&status=Aktif&search=john"
```

**Response Format**:
```json
{
  "success": true,
  "message": "Employees retrieved",
  "data": [
    {
      "id": "uuid",
      "nama": "John Doe",
      "email": "john@example.com",
      "departemen": "IT",
      "status": "Aktif",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Error Responses**:
- `401` - Missing/invalid token
- `403` - Unauthorized (not admin/hrd)
- `400` - Database query failed
- `503` - Supabase not configured

---

### 2. GET `/api/payroll` - Fetch Payroll Data
**Status**: ✅ **FULLY IMPLEMENTED**

**Route**:
```
GET /api/payroll
Authorization: Bearer {JWT_TOKEN}
```

**Features**:
- ✅ Filter by month (`?month=2025-05`)
- ✅ Filter by employee (`?employeeId=...`)
- ✅ Filter by status (`?status=processed`)
- ✅ Graceful handling if payroll table doesn't exist
- ✅ Sorting by period (newest first)
- ✅ RBAC protection (admin/hrd only, needs `read:payroll` permission)

**Example Requests**:
```bash
# Get all payroll records
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/payroll"

# Get payroll for specific month
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/payroll?month=2025-05"

# Get payroll for specific employee
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/payroll?employeeId=emp123"

# Get processed payroll for May 2025
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/payroll?month=2025-05&status=processed"

# Combine filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/payroll?month=2025-05&employeeId=emp123&status=processed"
```

**Response Format**:
```json
{
  "success": true,
  "message": "Payroll data retrieved",
  "data": [
    {
      "id": "uuid",
      "employee_id": "emp123",
      "periode": "2025-05",
      "gajiPokok": 5000000,
      "tunjanganProfesi": 1000000,
      "upahLembur": 500000,
      "totalPendapatan": 6500000,
      "potonganPPh21": 200000,
      "potonganBPJS": 50000,
      "totalPotongan": 250000,
      "gajiBersih": 6250000,
      ...
    }
  ],
  "filter": {
    "month": "2025-05",
    "employeeId": "all",
    "status": "all"
  }
}
```

**Error Responses**:
- `401` - Missing/invalid token
- `403` - Unauthorized (not admin/hrd)
- `400` - Database query failed
- `503` - Supabase not configured

**Note**: If payroll table doesn't exist yet, endpoint returns empty array with a note:
```json
{
  "success": true,
  "message": "Payroll data retrieved (table not yet created)",
  "data": [],
  "note": "Payroll table needs to be created via database migration"
}
```

---

## 📋 Other Fully Implemented Endpoints

| Endpoint | Method | Status | RBAC |
|----------|--------|--------|------|
| `/api/health` | GET | ✅ Ready | None |
| `/api/status` | GET | ✅ Ready | Auth required |
| `/api/employees/:id` | GET | ✅ Ready | Auth required |
| `/api/employees` | POST | ✅ Ready | admin/hrd + `create:employee` |
| `/api/employees/:id` | PUT | ✅ Ready | admin/hrd + `update:employee` |
| `/api/employees/:id` | DELETE | ✅ Ready | admin + `delete:employee` |
| `/api/attendance` | GET | ✅ Ready | Auth required |
| `/api/attendance` | POST | ✅ Ready | Auth required + `create:attendance` |
| `/api/requests` | GET | ✅ Ready | Auth required |
| `/api/requests/:id/approve` | POST | ✅ Ready | Auth required + `approve:requests` |
| `/api/requests/:id/reject` | POST | ✅ Ready | Auth required + `reject:requests` |
| `/api/admin/rbac` | GET | ✅ Ready | admin |
| `/api/admin/rbac/update-role` | POST | ✅ Ready | admin + `manage:roles` |

---

## 🧪 Testing Checklist

- [ ] Test GET `/api/employees` with pagination
- [ ] Test GET `/api/employees` with search filters
- [ ] Test GET `/api/payroll` with month filter
- [ ] Test GET `/api/payroll` with employee filter
- [ ] Test unauthorized access (403)
- [ ] Test missing token (401)
- [ ] Test invalid parameters (400)
- [ ] Verify pagination count matches actual results
- [ ] Verify RLS policies applied (if using RLS queries)
- [ ] Load test: fetch 1000+ employee records

---

## 📝 Implementation Notes

### GET /api/employees
- Uses `adminSupabase` to fetch from `employees` table
- Supports complex filtering with `ilike` for search
- Pagination via `.range(offset, offset + limit - 1)`
- Returns exact count for pagination metadata
- Column names must match Supabase schema (e.g., `departemen`, `status`)

### GET /api/payroll
- Uses `adminSupabase` to fetch from `payroll` table
- Period filtering uses `ilike` pattern matching for "YYYY-MM" format
- Gracefully handles missing table (returns empty list + note)
- Assumes payroll table has: `employee_id`, `periode`, `status` columns
- **TODO**: Adjust column names if Supabase schema differs

---

## 🔄 Next Steps for Production

1. **Database Migration**: Ensure `payroll` table exists with correct schema
   - Columns: `id`, `employee_id`, `periode`, `gajiPokok`, `tunjanganProfesi`, `upahLembur`, `totalPendapatan`, `potonganPPh21`, `potonganBPJS`, `totalPotongan`, `gajiBersih`, `status`, `created_at`
   - Indexes: `idx_payroll_employee_period`, `idx_payroll_status`

2. **API Integration Testing**: 
   - Use Postman or Insomnia to test endpoints
   - Verify response times (target: <200ms for list, <500ms for filtered queries)
   - Test with large datasets (1000+ records)

3. **Frontend Integration**:
   - Update web UI components to use new endpoint (instead of direct Supabase client)
   - Add error boundary + retry logic for network failures
   - Implement loading states + empty state UI

4. **Mobile Integration**:
   - Point mobile app's API calls to these endpoints
   - Add offline queue support for payroll sync

5. **Monitoring**:
   - Setup logging for slow queries (>1s)
   - Monitor error rates for these endpoints
   - Alert on 5xx errors

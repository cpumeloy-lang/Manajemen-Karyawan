# 🗺️ ROADMAP PERBAIKAN & PENGEMBANGAN HRMS PRO

**Tanggal:** April 19, 2026  
**Status:** Development Planning Phase  
**Target:** Production Ready + Compliance Ready  
**Total Duration:** 6-8 minggu

---

## 📊 OVERVIEW ROADMAP

```
┌─────────────────────────────────────────────────────────────────┐
│                    HRMS PRO DEVELOPMENT ROADMAP                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: FOUNDATION (Week 1-2) - CRITICAL FIXES               │
│  ├─ Modularisasi App.tsx                                        │
│  ├─ Error Handling & Retry Logic                                │
│  ├─ Database Constraints & Indexes                              │
│  ├─ Employee Data Completeness                                  │
│  └─ Pagination Implementation                                   │
│  Result: Stable, scalable foundation                            │
│                                                                 │
│  PHASE 2: COMPLIANCE (Week 3-4) - REGULATORY                   │
│  ├─ Overtime & Working Hours Validation                         │
│  ├─ Leave Management System (7 types)                           │
│  ├─ Payroll Calculation Engine                                  │
│  ├─ K3 & Health Screening Tracking                              │
│  └─ Performance Management Module                               │
│  Result: UU Ketenagakerjaan & KMK Compliant                    │
│                                                                 │
│  PHASE 3: FEATURES & ENHANCEMENT (Week 5-6)                    │
│  ├─ Role-Based Access Control (RBAC)                            │
│  ├─ Reporting & Analytics Dashboard                             │
│  ├─ Compliance Report Generator                                 │
│  ├─ Testing Suite (Unit + Integration)                          │
│  └─ Documentation Consolidation                                 │
│  Result: Feature-rich, testable, documented                     │
│                                                                 │
│  PHASE 4: LAUNCH & AUDIT PREP (Week 7-8)                       │
│  ├─ Data Migration & Cleanup                                    │
│  ├─ Production Deployment                                       │
│  ├─ Staff Training & Documentation                              │
│  ├─ Mock Audit by Dinkes                                        │
│  └─ Performance Tuning                                          │
│  Result: Ready for Dinkes audit & production use                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📅 DETAILED TIMELINE & MILESTONES

### **WEEK 1-2: PHASE 1 - FOUNDATION (CRITICAL)**

#### **Week 1**

**Day 1-2: Task 1 - Modularisasi App.tsx**
```
Priority: 🔴 URGENT
Dependencies: None
Timeline: 2 days
Team: 1 Senior Frontend Dev

Breakdown:
├─ Day 1 Morning: Extract auth logic → useAppAuth.ts
├─ Day 1 Afternoon: Extract data loading → useAppData.ts
├─ Day 2 Morning: Extract CRUD handlers → useEmployeeCRUD.ts, useRequestHandlers.ts
├─ Day 2 Afternoon: Refactor App.tsx shell (100 lines max)

Deliverables:
├─ useAppAuth.ts (150-200 lines) - Authentication logic
├─ useAppData.ts (200-250 lines) - Data loading & sync
├─ useEmployeeCRUD.ts (150 lines) - Employee CRUD
├─ useRequestHandlers.ts (100 lines) - Request management
├─ usePaginationHandlers.ts (80 lines) - Pagination logic
├─ App.tsx refactored (100 lines) - Just UI shell
└─ All tests passing

Success Criteria:
✓ App.tsx < 100 lines
✓ All logic extracted to hooks
✓ Props drilling reduced by 70%
✓ App still loads correctly
✓ No functionality lost
```

**Day 3-5: Task 2 - Error Handling & Retry Logic**
```
Priority: 🔴 URGENT
Dependencies: Task 1 (modularisasi)
Timeline: 3 days
Team: 1 Senior Backend Dev + 1 Frontend Dev

Breakdown:
├─ Day 1 Morning: Create error handling service
├─ Day 1 Afternoon: Implement retry logic with exponential backoff
├─ Day 2 Morning: Add error boundary component
├─ Day 2 Afternoon: Add error messages for all API calls
├─ Day 3 Morning: Add logging service for debugging
├─ Day 3 Afternoon: Testing & integration

Deliverables:
├─ services/errorHandler.ts (100 lines)
│   ├─ AppError class
│   ├─ Error codes enum
│   ├─ User-friendly messages
│   └─ Error classification
│
├─ services/retryService.ts (80 lines)
│   ├─ withRetry() function
│   ├─ Exponential backoff logic
│   ├─ Max retries configuration
│   └─ Circuit breaker pattern
│
├─ components/ErrorBoundary.tsx (enhanced, 150 lines)
│   ├─ Catch all component errors
│   ├─ Display user-friendly message
│   ├─ Log to error service
│   └─ Retry button
│
├─ hooks/useAsync.ts (100 lines)
│   ├─ Unified API call hook
│   ├─ Error handling built-in
│   ├─ Retry on error
│   └─ Loading state management
│
└─ services/loggingService.ts (80 lines)
    ├─ Log errors to console/backend
    ├─ Track user actions
    └─ Performance metrics

Success Criteria:
✓ All API calls use withRetry() or useAsync()
✓ User sees friendly error message (not technical)
✓ Retry button shows when retryable
✓ Errors logged to monitoring service
✓ Network errors handled gracefully
✓ No uncaught promise rejections
```

**Day 5-6: Task 3 - Database Constraints & Indexes**
```
Priority: 🔴 URGENT
Dependencies: None (Database only)
Timeline: 1.5 days
Team: 1 Database Admin + 1 Backend Dev

Breakdown:
├─ Day 1 Morning: Backup database
├─ Day 1 Afternoon: Add foreign keys
├─ Day 2 Morning: Add unique constraints
├─ Day 2 Afternoon: Add indexes

Deliverables:
├─ database-constraints.sql
│   ├─ Foreign keys for:
│   │  ├─ attendance (→ employees)
│   │  ├─ leave_requests (→ employees)
│   │  ├─ documents (→ employees)
│   │  ├─ requests (→ employees)
│   │  └─ audit_log (→ employees)
│   │
│   ├─ Unique constraints:
│   │  ├─ employees(email) UNIQUE
│   │  ├─ employees(nik) UNIQUE
│   │  ├─ employees(user_id) UNIQUE
│   │  └─ Other unique fields
│   │
│   └─ Check constraints:
│      ├─ status values validation
│      ├─ salary > 0
│      └─ dates validation
│
└─ database-indexes.sql
    ├─ Common search columns:
    │  ├─ idx_employees_email
    │  ├─ idx_employees_nik
    │  ├─ idx_employees_nama
    │  └─ idx_employees_created_at
    │
    ├─ Foreign keys (for JOINs):
    │  ├─ idx_attendance_employee_id
    │  ├─ idx_leave_employee_id
    │  ├─ idx_requests_employee_id
    │  └─ idx_documents_employee_id
    │
    ├─ Query patterns:
    │  ├─ idx_attendance_date
    │  ├─ idx_attendance_employee_date
    │  ├─ idx_leave_status
    │  └─ idx_requests_status_date
    │
    └─ Analysis:
        └─ Query performance before/after

Success Criteria:
✓ All foreign keys created
✓ All unique constraints added
✓ All indexes created
✓ No orphaned records
✓ Query performance improved 50%+
✓ Data integrity enforced
```

---

#### **Week 2**

**Day 1-2: Task 4 - Employee Data Completeness**
```
Priority: 🔴 URGENT
Dependencies: Task 3 (database constraints)
Timeline: 2 days
Team: 1 Full-stack Dev

Breakdown:
├─ Day 1 Morning: Create database migration
├─ Day 1 Afternoon: Update TypeScript types
├─ Day 2 Morning: Create data entry forms
├─ Day 2 Afternoon: Create validation & data import

Deliverables:
├─ database-migration-employee-fields.sql
│   ├─ Add columns:
│   │  ├─ npwp (TEXT, unique)
│   │  ├─ ktp_address (TEXT)
│   │  ├─ domicili_address (TEXT)
│   │  ├─ bank_name (TEXT)
│   │  ├─ bank_account (TEXT, encrypted)
│   │  ├─ bpjs_kesehatan_id (TEXT)
│   │  ├─ bpjs_ketenagakerjaan_id (TEXT)
│   │  ├─ emergency_contact_1 (JSONB)
│   │  ├─ emergency_contact_2 (JSONB)
│   │  ├─ health_check_status (TEXT)
│   │  ├─ last_health_check (DATE)
│   │  └─ health_restrictions (TEXT)
│   │
│   ├─ Create new tables:
│   │  ├─ employee_education (id, employee_id, level, institution, major, year, gpa)
│   │  └─ employee_health_records (id, employee_id, check_date, results, cleared)
│   │
│   └─ Constraints:
│      ├─ UNIQUE(npwp)
│      ├─ UNIQUE(bpjs_kesehatan_id)
│      ├─ CHECK for valid dates
│      └─ NOT NULL for required fields
│
├─ types.ts (updated)
│   └─ interface EmployeeCompliance:
│       ├─ npwp: string
│       ├─ addresses: { ktp, domicili, ... }
│       ├─ banking: { bank_name, account_number }
│       ├─ insurance: { bpjs_kesehatan_id, bpjs_ketenagakerjaan_id }
│       ├─ health: { baseline_date, annual_check, vaccinations }
│       └─ emergencyContacts: EmergencyContact[]
│
├─ components/EmployeeCompleteDataForm.tsx (250 lines)
│   ├─ Tabs for different data sections
│   ├─ Personal Info (address, bank, BPJS)
│   ├─ Emergency Contacts
│   ├─ Education History
│   ├─ Health Information
│   └─ Auto-save each section
│
├─ services/employeeDataService.ts (150 lines)
│   ├─ Validate NPWP format
│   ├─ Encrypt bank account data
│   ├─ Validate BPJS format
│   ├─ Bulk import from CSV
│   └─ Data validation rules
│
└─ utils/dataValidation.ts (100 lines)
    ├─ NPWP validator (format: XX.XXX.XXX.X-XXX.XXX)
    ├─ Bank account validator
    ├─ BPJS ID validator
    ├─ Address validator
    └─ Phone number validator

Success Criteria:
✓ All new fields added to database
✓ Data validation working
✓ Forms created & working
✓ Sample data imported successfully
✓ Data encrypted where needed
✓ No data loss in migration
```

**Day 3-5: Task 5 - Pagination Implementation**
```
Priority: 🔴 URGENT
Dependencies: Task 4 (employee data), Task 3 (indexes)
Timeline: 3 days
Team: 1 Frontend Dev + 1 Backend Dev

Breakdown:
├─ Day 1 Morning: Create pagination service
├─ Day 1 Afternoon: Update API endpoints
├─ Day 2 Morning: Create pagination hook
├─ Day 2 Afternoon: Update EmployeeTable with pagination
├─ Day 3 Morning: Update other list components
├─ Day 3 Afternoon: Testing & performance validation

Deliverables:
├─ services/paginationService.ts (120 lines)
│   ├─ fetchEmployeesPaginated()
│   ├─ fetchAttendancePaginated()
│   ├─ fetchLeaveRequestsPaginated()
│   ├─ Generic paginate function
│   └─ Search & sort support
│
├─ hooks/usePagination.ts (100 lines)
│   ├─ Manage pagination state
│   ├─ Handle page changes
│   ├─ Handle search
│   ├─ Handle sort
│   └─ Cache previous pages
│
├─ components/Pagination.tsx (80 lines)
│   ├─ Page buttons
│   ├─ Previous/Next navigation
│   ├─ Jump to page
│   ├─ Results per page selector
│   └─ Total results display
│
├─ components/EmployeeTable.tsx (refactored, 200 lines)
│   ├─ Integrate pagination hook
│   ├─ Display current page
│   ├─ Show "showing X-Y of Z" text
│   ├─ Sort by clicking headers
│   ├─ Search functionality
│   └─ Loading state for pagination
│
├─ API updates (if applicable)
│   ├─ GET /api/employees?page=1&pageSize=20&sort=nama&order=asc&search=john
│   ├─ GET /api/attendance?page=1&pageSize=50&employee_id=xxx
│   ├─ GET /api/requests?page=1&pageSize=20&status=pending
│   └─ Returns: { data[], total, page, pageSize, totalPages }
│
└─ Performance testing
    ├─ Load time with 1k employees
    ├─ Load time with 10k employees
    ├─ Search performance
    └─ Sort performance

Success Criteria:
✓ Page size configurable (10, 20, 50)
✓ Initial load < 1 second
✓ Page navigation instant
✓ Search works on current page + server-side
✓ Sort by any column
✓ Memory usage stable (no leak)
✓ Works with 10k+ employees
```

---

### **WEEK 3-4: PHASE 2 - COMPLIANCE (HIGH PRIORITY)**

#### **Week 3**

**Day 1-2: Task 6 - Overtime & Working Hours Validation**
```
Priority: 🟡 HIGH
Dependencies: Task 4 (modularisasi data)
Timeline: 2 days
Team: 1 Backend Dev + 1 Frontend Dev

Requirement: UU No. 13/2003 Pasal 77 & 85

Deliverables:
├─ database-working-hours-validation.sql
│   ├─ Add columns to attendance:
│   │  ├─ clock_in (TIME)
│   │  ├─ clock_out (TIME)
│   │  ├─ break_duration (INTEGER minutes)
│   │  ├─ total_hours (NUMERIC)
│   │  ├─ overtime_hours (NUMERIC)
│   │  ├─ compliance_status (VARCHAR)
│   │  └─ violation_reason (TEXT)
│   │
│   └─ Create function:
│       └─ calculate_working_hours(attendance_id)
│           ├─ Calc (clock_out - clock_in - break)
│           ├─ Detect if > 8 hours (overtime)
│           ├─ Check daily limit (max 3 extra hours)
│           ├─ Check weekly limit (max 24 extra hours)
│           └─ Flag violations
│
├─ services/workingHoursService.ts (150 lines)
│   ├─ validateDailyHours(employee_id, date)
│   │  ├─ Should be 8 hours
│   │  ├─ Allow 0.5-1 hour variance
│   │  ├─ Flag if < 7 or > 12
│   │  └─ Return compliance status
│   │
│   ├─ validateWeeklyHours(employee_id, week_date)
│   │  ├─ Should be 40 hours
│   │  ├─ Allow 1-2 hour variance
│   │  ├─ Flag if > 50 (violates max OT)
│   │  └─ Return compliance status
│   │
│   ├─ calculateOvertimePay(employee_id, overtime_hours)
│   │  ├─ 1-3 hours: rate × 1.5
│   │  ├─ >3 hours: rate × 2
│   │  └─ Return overtime_pay
│   │
│   └─ getMonthlyOvertime(employee_id, month)
│       ├─ Sum overtime hours
│       ├─ Sum overtime pay
│       ├─ Check violations
│       └─ Generate report
│
├─ hooks/useWorkingHoursValidation.ts (80 lines)
│   ├─ Validate & display daily hours
│   ├─ Display overtime status
│   ├─ Show violations
│   └─ Trigger warnings
│
├─ components/WorkingHoursReport.tsx (200 lines)
│   ├─ Daily working hours table
│   ├─ Color coding: Green (OK), Yellow (Warning), Red (Violation)
│   ├─ Weekly summary
│   ├─ Monthly summary
│   ├─ Export to PDF/Excel
│   └─ Violation alerts
│
└─ Compliance rules hardcoded
    ├─ Max daily work: 12 hours
    ├─ Max daily overtime: 3 hours (per UU)
    ├─ Max weekly work: 48 hours (40 + 8 flex)
    ├─ Max weekly overtime: 24 hours
    ├─ Break minimum: 1 hour per day
    ├─ Weekly rest: 1 day minimum
    └─ Shift allowance rates (night: +25-50%)

Success Criteria:
✓ Daily hours tracked & validated
✓ Overtime hours calculated correctly
✓ Violations flagged automatically
✓ Overtime pay calculated per UU
✓ Reports generated automatically
✓ No employee exceeds max hours
```

**Day 3-5: Task 7 - Leave Management System (7 Types)**
```
Priority: 🟡 HIGH
Dependencies: Task 4 (employee data)
Timeline: 3 days
Team: 1 Backend Dev + 1 Frontend Dev + 1 DB Admin

Requirement: UU No. 13/2003 Pasal 78-82

Deliverables:
├─ database-leave-management.sql
│   ├─ Create tables:
│   │  ├─ leave_types (
│   │  │    id, code, name, quota_per_year, 
│   │  │    requires_doc, max_consecutive, 
│   │  │    active, created_at
│   │  │  )
│   │  │
│   │  └─ leave_requests (REFACTORED - was generic)
│   │     ├─ id, employee_id, leave_type_id
│   │     ├─ start_date, end_date, days_requested
│   │     ├─ reason, status
│   │     ├─ approver_1_id, approver_1_date
│   │     ├─ approver_2_id, approver_2_date
│   │     ├─ supporting_docs (JSONB)
│   │     └─ created_at, updated_at
│   │
│   ├─ Create tables:
│   │  ├─ leave_balance (
│   │  │    id, employee_id, year,
│   │  │    annual_quota, annual_used, annual_remaining,
│   │  │    annual_carryover,
│   │  │    sick_used, married_used, death_used,
│   │  │    maternity_used, paternity_used,
│   │  │    updated_at
│   │  │  )
│   │  │
│   │  └─ leave_history (
│   │      id, employee_id, leave_type, dates,
│   │      status, approver, notes, created_at
│   │    )
│   │
│   ├─ Insert leave types:
│   │  ├─ 'ANNUAL': 12 days/year, no doc, no carryover rule yet
│   │  ├─ 'SICK': unlimited (with doctor cert after 3 days)
│   │  ├─ 'MARRIED': 3 days (need marriage cert)
│   │  ├─ 'DEATH': 1-3 days (need death cert)
│   │  ├─ 'MATERNITY': 90 days (need birth cert)
│   │  ├─ 'PATERNITY': 2 days (need birth cert)
│   │  └─ 'UNPAID': unlimited (approval needed)
│   │
│   ├─ Create functions:
│   │  ├─ reset_annual_leave() - Runs Jan 1 each year
│   │  │  ├─ Reset annual_quota to 12
│   │  │  ├─ Add carryover (max 6 from previous year)
│   │  │  └─ Reset annual_used to 0
│   │  │
│   │  ├─ validate_leave_request(employee_id, leave_type, dates)
│   │  │  ├─ Check balance available
│   │  │  ├─ Check consecutive limit
│   │  │  ├─ Check overlapping requests
│   │  │  └─ Return validation result
│   │  │
│   │  └─ approve_leave_request(request_id, approver_id)
│   │     ├─ Check two-level approval
│   │     ├─ Deduct from balance
│   │     └─ Create leave_history entry
│   │
│   └─ RLS policies:
│      ├─ Employees see only own leave requests
│      ├─ Approvers see team leave requests
│      ├─ Admin sees all
│      └─ History audit trail
│
├─ types.ts (updated)
│   └─ LeaveRequest interface + LeaveBalance
│
├─ services/leaveService.ts (200 lines)
│   ├─ createLeaveRequest()
│   ├─ getLeaveBalance(employee_id, year)
│   ├─ validateLeaveRequest()
│   ├─ approveLeaveRequest() - Level 1 (supervisor)
│   ├─ approveLeaveRequest() - Level 2 (HRD)
│   ├─ rejectLeaveRequest()
│   ├─ getLeaveHistory()
│   └─ calculateRemainingBalance()
│
├─ hooks/useLeaveManagement.ts (100 lines)
│   ├─ Get leave balance
│   ├─ Get pending requests
│   ├─ Get approval required
│   └─ Subscription to balance changes
│
├─ components/LeaveRequestForm.tsx (250 lines)
│   ├─ Leave type selection
│   ├─ Date picker (start/end)
│   ├─ Auto-calculate days needed
│   ├─ Show available balance
│   ├─ Show warning if insufficient
│   ├─ Supporting docs upload
│   ├─ Submit & review workflow
│   └─ Validation feedback
│
├─ components/LeaveApprovalPanel.tsx (200 lines)
│   ├─ List pending approvals
│   ├─ Approve/reject buttons
│   ├─ Comments field
│   ├─ Escalation option
│   ├─ Audit trail
│   └─ Notification to requester
│
├─ components/LeaveBalanceCard.tsx (100 lines)
│   ├─ Display annual/sick/other balances
│   ├─ Show carryover info
│   ├─ Show expiration date
│   ├─ Visual progress bar
│   └─ Export button
│
└─ Compliance rules:
    ├─ ANNUAL: 12 days auto-reset Jan 1, max 6 carryover
    ├─ SICK: Unlimited (with doctor cert after 3 days)
    ├─ MARRIED: 3 days only, must provide marriage cert
    ├─ DEATH: 1-3 days depending on relationship
    ├─ MATERNITY: 3 months (1.5 before, 1.5 after)
    ├─ PATERNITY: 2 days only
    ├─ UNPAID: Unlimited with approval
    ├─ Carryover: Max 6 days of annual leave
    ├─ Unused balance: Not paid unless agreement
    └─ Two-level approval: Supervisor + HRD

Success Criteria:
✓ All 7 leave types working
✓ Auto-reset annual leave Jan 1
✓ Balance calculated correctly
✓ Carryover rules enforced
✓ Two-level approval workflow
✓ Supporting docs tracked
✓ Audit trail complete
✓ UU 13/2003 compliant
```

---

#### **Week 4**

**Day 1-2: Task 8 - Payroll Calculation Engine**
```
Priority: 🟡 HIGH
Dependencies: Task 4 (employee data), Task 6 (overtime calc)
Timeline: 2 days
Team: 1 Backend Dev + 1 Full-stack Dev

Requirement: KMK No. 112/2017 & UU No. 13/2003

Deliverables:
├─ database-payroll-schema.sql
│   ├─ Create tables:
│   │  ├─ salary_components (
│   │  │    id, employee_id, month, year,
│   │  │    basic_salary, 
│   │  │    performance_allowance,
│   │  │    location_allowance,
│   │  │    shift_allowance,
│   │  │    meal_allowance,
│   │  │    transport_allowance,
│   │  │    bonus,
│   │  │    other_income,
│   │  │    gross_income,
│   │  │    created_at
│   │  │  )
│   │  │
│   │  └─ payroll_deductions (
│   │      id, employee_id, month, year,
│   │      bpjs_kesehatan (1% of gross),
│   │      bpjs_ketenagakerjaan (5% avg),
│   │      pph_21 (progressive tax),
│   │      pension_contribution,
│   │      other_deductions,
│   │      total_deductions,
│   │      net_pay,
│   │      created_at
│   │    )
│   │
│   ├─ Create table:
│   │  └─ payslips (
│   │      id, employee_id, month, year,
│   │      salary_components_id, deductions_id,
│   │      gross_pay, total_deductions, net_pay,
│   │      generated_at, paid_at, bank_transfer_id
│   │    )
│   │
│   └─ Create functions:
│      ├─ calculate_pph_21(gross_income, annual_salary)
│      │  ├─ Apply PTKP (Personal Tax Non-Taxable)
│      │  ├─ Progressive tax rates (5%, 15%, 25%, 30%, 35%)
│      │  ├─ Monthly installment
│      │  └─ Annual reconciliation (SPT)
│      │
│      ├─ calculate_bpjs(gross_income, bpjs_type)
│      │  ├─ BPJS Kesehatan: 1%
│      │  ├─ BPJS Ketenagakerjaan: ~5% avg
│      │  └─ Employer share separate
│      │
│      └─ generate_payslip(employee_id, month)
│         ├─ Fetch salary components
│         ├─ Calculate gross pay
│         ├─ Calculate deductions
│         ├─ Net pay = gross - deductions
│         ├─ Store in payslips table
│         └─ Generate PDF/send to employee
│
├─ services/payrollService.ts (300 lines)
│   ├─ calculateSalaryComponents(employee_id, month)
│   │  ├─ Basic salary (from employee record)
│   │  ├─ Performance allowance (0-50% based on rating)
│   │  ├─ Location allowance (based on work location)
│   │  ├─ Shift allowance (pagi: 0%, siang: 10%, malam: 25-50%)
│   │  ├─ Meal allowance (Rp 50-100k/working day)
│   │  ├─ Transport allowance (Rp 50-150k/month)
│   │  ├─ Overtime pay (from working hours calc)
│   │  ├─ Bonus (if any)
│   │  └─ Return gross_income
│   │
│   ├─ calculateDeductions(gross_income, employee_id, year)
│   │  ├─ BPJS Kesehatan: 1%
│   │  ├─ BPJS Ketenagakerjaan: ~5%
│   │  ├─ PPh 21: Calculate per progressive rates
│   │  ├─ Pension contribution (if any)
│   │  ├─ Other deductions (loan, etc)
│   │  └─ Return total_deductions
│   │
│   ├─ calculatePPh21(gross_income, annual_gross)
│   │  ├─ PTKP based on marital status & dependents
│   │  ├─ Taxable income = gross - PTKP
│   │  ├─ Apply rate: 5% (0-50jt), 15% (50-250jt), etc
│   │  ├─ Monthly PPh = annual PPh / 12
│   │  ├─ Store for annual reconciliation
│   │  └─ Return monthly pph_21
│   │
│   ├─ generatePayslip(employee_id, month)
│   │  ├─ Call calculateSalaryComponents
│   │  ├─ Call calculateDeductions
│   │  ├─ Calc net_pay = gross - deductions
│   │  ├─ Store in payslips table
│   │  ├─ Generate PDF
│   │  └─ Email to employee
│   │
│   ├─ generatePayroll(month, year)
│   │  ├─ Loop all active employees
│   │  ├─ Generate payslip for each
│   │  ├─ Create payroll summary
│   │  ├─ Generate payroll report
│   │  └─ Ready for approval
│   │
│   ├─ getPayslip(employee_id, month)
│   │  └─ Fetch & display payslip
│   │
│   └─ getPayrollHistory(employee_id, year)
│       └─ Fetch all payslips for year
│
├─ hooks/usePayroll.ts (80 lines)
│   ├─ Get current payslip
│   ├─ Get payroll history
│   ├─ Trigger payroll generation
│   └─ Download payslip
│
├─ components/PayslipViewer.tsx (200 lines)
│   ├─ Display payslip details
│   ├─ Show salary breakdown
│   ├─ Show deductions
│   ├─ Display net pay
│   ├─ Print to PDF
│   ├─ Email to employee
│   └─ Historical view
│
├─ components/PayrollManagement.tsx (enhanced, 300 lines)
│   ├─ Select month/year
│   ├─ Generate payroll button
│   ├─ Preview payroll data
│   ├─ Approve payroll
│   ├─ Generate payroll report
│   ├─ Export to Excel
│   ├─ Bank transfer export
│   └─ Payroll history
│
├─ utils/taxCalculator.ts (100 lines)
│   ├─ PTKP values (2024 rates)
│   ├─ Progressive tax rates
│   ├─ Tax bracket calculator
│   ├─ Annual reconciliation logic
│   └─ Tax exemption rules
│
└─ Compliance specs:
    ├─ BPJS Kesehatan: 1% employee + 3% employer (total 4%)
    ├─ BPJS Ketenagakerjaan: 5% avg (varies by risk level)
    ├─ PPh 21: Per Dirjen Pajak progressive rates
    ├─ PTKP: Based on marital status & dependents
    ├─ Annual tax reconciliation: SPT Tahunan
    ├─ Shift allowance: Malam 25-50%, Siang 10-15%
    ├─ Overtime rate: 1-3 jam: 1.5x, >3 jam: 2x
    ├─ Meal allowance: Per diem standard (RS policy)
    ├─ Transport allowance: Fixed per month
    └─ Bonus: Min 13 bulan per UU

Success Criteria:
✓ All salary components calculated
✓ All deductions calculated per UU
✓ Tax (PPh 21) correct per Dirjen Pajak
✓ BPJS contributions correct
✓ Payslips generated & sent monthly
✓ Audit trail for all calculations
✓ PDF export working
✓ Bank transfer file exportable
```

**Day 3-5: Task 9 - Performance Management Module**
```
Priority: 🟡 HIGH
Dependencies: Task 4 (employee data)
Timeline: 3 days
Team: 1 Backend Dev + 1 Frontend Dev

Requirement: KMK No. 1087/2020

Deliverables:
├─ database-performance-schema.sql
│   ├─ Create tables:
│   │  ├─ performance_reviews (
│   │  │    id, employee_id, reviewer_id,
│   │  │    review_period_start, review_period_end,
│   │  │    quality_of_work (1-5),
│   │  │    productivity (1-5),
│   │  │    punctuality (1-5),
│   │  │    teamwork (1-5),
│   │  │    initiative (1-5),
│   │  │    communication (1-5),
│   │  │    technical_skills (1-5),
│   │  │    overall_score (1-5),
│   │  │    overall_rating ('Buruk','Cukup','Baik','Sangat Baik'),
│   │  │    feedback, employee_response,
│   │  │    development_plan, signed_off_by,
│   │  │    created_at, review_date
│   │  │  )
│   │  │
│   │  ├─ performance_history (
│   │  │    id, employee_id, review_id,
│   │  │    year, previous_score, current_score,
│   │  │    trend ('improving','stable','declining'),
│   │  │    avg_3_years, created_at
│   │  │  )
│   │  │
│   │  └─ career_development (
│   │      id, employee_id,
│   │      career_goal, target_position,
│   │      skills_needed, training_plan,
│   │      mentoring_plan, timeline,
│   │      created_at, updated_at
│   │    )
│   │
│   └─ Create views:
│      ├─ employee_performance_summary
│      ├─ performance_trend (3-year avg)
│      └─ performance_by_department
│
├─ types.ts (updated)
│   ├─ PerformanceReview interface
│   ├─ CareerDevelopmentPlan interface
│   └─ PerformanceHistory interface
│
├─ services/performanceService.ts (200 lines)
│   ├─ createPerformanceReview()
│   ├─ getPerformanceHistory(employee_id)
│   ├─ calculateTrend(employee_id)
│   ├─ getCareerDevelopmentPlan()
│   ├─ updateDevelopmentPlan()
│   ├─ createCareerPath()
│   └─ generatePerformanceReport()
│
├─ hooks/usePerformance.ts (80 lines)
│   ├─ Get review data
│   ├─ Get development plan
│   ├─ Get performance trend
│   └─ Calculate scores
│
├─ components/PerformanceReviewForm.tsx (250 lines)
│   ├─ Competency rating inputs (1-5 scale)
│   ├─ Radio buttons for each category
│   ├─ Comments field
│   ├─ Development plan section
│   ├─ Validation (all fields required)
│   ├─ Submit & save
│   └─ Auto-calculate overall score
│
├─ components/PerformanceHistory.tsx (150 lines)
│   ├─ Display all past reviews
│   ├─ Trend line chart (3+ years)
│   ├─ Average score display
│   ├─ Comparison with dept average
│   ├─ Export to PDF
│   └─ Filter by year
│
├─ components/CareerDevelopment.tsx (180 lines)
│   ├─ Current position display
│   ├─ Target position field
│   ├─ Skills gap analysis
│   ├─ Training recommendations
│   ├─ Mentoring assignment
│   ├─ Timeline tracker
│   └─ Progress visualization
│
└─ Compliance specs:
    ├─ Annual appraisal (min 1x per year)
    ├─ Competency assessment in 8 areas
    ├─ 5-point scale (1=Buruk, 5=Sangat Baik)
    ├─ Development plan mandatory
    ├─ Reviewer training documented
    ├─ Employee response captured
    ├─ Confidential & secure storage
    └─ Linked to promotion/compensation

Success Criteria:
✓ Review form created & working
✓ Scores calculated correctly
✓ Trend analysis working
✓ Development plans tracked
✓ History maintained 3+ years
✓ PDF export working
✓ Secure & confidential
```

---

### **WEEK 5-6: PHASE 3 - FEATURES & ENHANCEMENT**

#### **Week 5**

**Day 1-3: Task 10 - Role-Based Access Control (RBAC)**
```
Priority: 🟡 HIGH
Dependencies: Task 1 (modularisasi)
Timeline: 3 days
Team: 1 Backend Dev + 1 Security Engineer

Requirement: Security + Compliance

Deliverables:
├─ database-rbac-schema.sql
│   ├─ Create tables:
│   │  ├─ permissions (
│   │  │    id, code, name, description, active
│   │  │  )
│   │  │
│   │  ├─ role_permissions (
│   │  │    id, role, permission_id, granted_at
│   │  │  )
│   │  │
│   │  └─ resource_access (
│   │      id, employee_id, resource_type, resource_id,
│   │      can_view, can_edit, can_delete, granted_by,
│   │      granted_at, expires_at
│   │    )
│   │
│   ├─ Insert permissions:
│   │  ├─ read:employee, create:employee, update:employee, delete:employee
│   │  ├─ read:attendance, update:attendance, approve:attendance
│   │  ├─ read:payroll, manage:payroll, approve:payroll
│   │  ├─ read:request, approve:request, reject:request
│   │  ├─ manage:system, manage:rbac
│   │  ├─ read:report, export:report
│   │  └─ [more permissions as needed]
│   │
│   ├─ Grant permissions by role:
│   │  ├─ admin: ALL permissions
│   │  ├─ hrd: read:*, create:*, update:*, manage:payroll
│   │  ├─ kepala_ruangan: read:employee, read:attendance, read:report
│   │  ├─ karyawan: read:own_data, view:own_attendance, submit:request
│   │  └─ supervisor: read:team_data, approve:request
│   │
│   └─ Enable RLS policies:
│      ├─ Employees see only own data
│      ├─ Kepala_ruangan see only their unit
│      ├─ HRD see all operational data
│      ├─ Admin see everything
│      └─ Audit log all access
│
├─ types.ts (updated)
│   ├─ Permission enum
│   ├─ Role enum with permissions
│   └─ ResourceAccess interface
│
├─ utils/permissionUtils.ts (120 lines)
│   ├─ hasPermission(user, permission) → boolean
│   ├─ hasResourceAccess(user, resource) → boolean
│   ├─ canPerformAction(user, action) → boolean
│   └─ getAccessibleResources(user, resource_type)
│
├─ services/rbacService.ts (150 lines)
│   ├─ grantPermission(user, permission, expiry?)
│   ├─ revokePermission(user, permission)
│   ├─ grantResourceAccess(user, resource, access_level)
│   ├─ revokeResourceAccess(user, resource)
│   ├─ getPermissions(user/role)
│   ├─ getAccessibleResources(user)
│   └─ auditAccessLog(user, action, resource)
│
├─ middleware/rbacMiddleware.ts (80 lines)
│   ├─ requirePermission(permission) → middleware
│   ├─ requireRole(role) → middleware
│   ├─ requireResourceAccess(resource_type) → middleware
│   └─ auditLog → middleware for all endpoints
│
├─ hooks/usePermission.ts (80 lines)
│   ├─ hasPermission(permission) → boolean
│   ├─ canAccess(resource) → boolean
│   ├─ getAccessibleResources(type)
│   └─ getMyPermissions()
│
├─ components/ProtectedComponent.tsx (60 lines)
│   ├─ ProtectedComponent wrapper
│   ├─ Check permission before render
│   ├─ Show fallback if no access
│   └─ Log denied access
│
├─ components/ProtectedButton.tsx (40 lines)
│   ├─ Button disabled if no permission
│   ├─ Tooltip showing reason
│   └─ Log click attempt
│
├─ API security updates:
│   ├─ All endpoints check permission
│   ├─ Before CRUD operation:
│   │  ├─ Check user permission
│   │  ├─ Check resource ownership
│   │  ├─ Execute or return 403
│   │  └─ Log all attempts
│   │
│   └─ Example:
│      ```
│      DELETE /api/employees/:id
│      1. Verify user authenticated (401)
│      2. Check permission 'delete:employee' (403)
│      3. Check ownership or admin role (403)
│      4. Execute delete (200)
│      5. Audit log deletion (automatic)
│      ```
│
└─ Row-Level Security (RLS) policies:
    ├─ employees table:
    │  ├─ karyawan: see only own row
    │  ├─ kepala_ruangan: see own unit's employees
    │  ├─ hrd: see all employees
    │  └─ admin: see all
    │
    ├─ attendance table:
    │  ├─ karyawan: see only own records
    │  ├─ kepala_ruangan: see own unit's records
    │  ├─ hrd: see all
    │  └─ admin: see all
    │
    └─ Similar for other sensitive tables

Success Criteria:
✓ All permissions defined
✓ Roles assigned permissions
✓ RBAC enforced in frontend
✓ RBAC enforced in backend
✓ Row-level security working
✓ Access attempts logged
✓ No privilege escalation possible
✓ Permissions can be audited
```

**Day 4-5: Task 11 - K3 & Health Screening Tracking**
```
Priority: 🟡 HIGH
Dependencies: Task 4 (employee data)
Timeline: 2 days
Team: 1 Backend Dev + 1 Frontend Dev

Requirement: KMK No. 49/2013 & Permenkes No. 27/2014

Deliverables:
├─ database-k3-health.sql
│   ├─ Create tables:
│   │  ├─ health_screenings (
│   │  │    id, employee_id, screening_date,
│   │  │    screening_type ('baseline','annual','other'),
│   │  │    provider, location,
│   │  │    test_results (JSONB),
│   │  │    cleared_for_work (boolean),
│   │  │    restrictions (text),
│   │  │    follow_up_needed (boolean),
│   │  │    follow_up_notes, created_at
│   │  │  )
│   │  │
│   │  ├─ vaccinations (
│   │  │    id, employee_id, vaccine_type,
│   │  │    date_administered, next_due_date,
│   │  │    administered_by, batch_number,
│   │  │    reaction (text), created_at
│   │  │  )
│   │  │
│   │  ├─ work_incidents (
│   │  │    id, employee_id, incident_date,
│   │  │    incident_type,
│   │  │    description, severity,
│   │  │    immediate_action_taken,
│   │  │    investigation_required (boolean),
│   │  │    investigation_date, investigation_report,
│   │  │    corrective_action,
│   │  │    root_cause_analysis,
│   │  │    status ('reported','investigating','closed'),
│   │  │    reported_by, created_at
│   │  │  )
│   │  │
│   │  └─ infection_exposures (
│   │      id, employee_id, exposure_date,
│   │      exposure_type ('needlestick','sharps','blood','other'),
│   │      description,
│   │      source_patient_id (if applicable),
│   │      immediate_care_given,
│   │      follow_up_testing_schedule (JSONB),
│   │      prophylaxis_given (boolean),
│   │      follow_up_results (JSONB),
│   │      counseling_provided (boolean),
│   │      status ('reported','followup','closed'),
│   │      created_at
│   │    )
│   │
│   ├─ RLS: Sensitive health data
│   │  ├─ Employees see own only
│   │  ├─ HRD/Admin see all
│   │  ├─ Occupational health staff see all
│   │  └─ No audit trail exposure
│   │
│   └─ Indexes on date fields for queries
│
├─ services/healthService.ts (150 lines)
│   ├─ recordHealthScreening(employee_id, screening_data)
│   ├─ getHealthHistory(employee_id)
│   ├─ recordVaccination(employee_id, vaccine_data)
│   ├─ getVaccinationStatus(employee_id) → complete/due/overdue
│   ├─ recordWorkIncident(employee_id, incident_data)
│   ├─ investigateIncident(incident_id, findings)
│   ├─ recordExposure(employee_id, exposure_data)
│   ├─ scheduleFollowUpTesting(exposure_id, dates)
│   ├─ recordFollowUpTest(exposure_id, test_result)
│   └─ generateK3Report(month)
│
├─ components/HealthScreeningForm.tsx (180 lines)
│   ├─ Date of screening
│   ├─ Screening type selection
│   ├─ Test results input
│   ├─ Cleared for work checkbox
│   ├─ Restrictions field
│   ├─ Follow-up field
│   ├─ Certification upload
│   └─ Submit & record
│
├─ components/VaccinationTracker.tsx (150 lines)
│   ├─ List of vaccinations
│   ├─ Status: Complete/Due/Overdue
│   ├─ Next due date display
│   ├─ Schedule reminder
│   ├─ Add new vaccination button
│   └─ Export vaccination report
│
├─ components/IncidentReport.tsx (200 lines)
│   ├─ Incident type selection
│   ├─ Incident date & time
│   ├─ Detailed description
│   ├─ Immediate action taken
│   ├─ Investigation required checkbox
│   ├─ Assigned to investigator
│   ├─ Status tracking
│   ├─ Investigation findings input
│   ├─ Corrective action plan
│   └─ Root cause analysis
│
├─ components/ExposureFollowUp.tsx (150 lines)
│   ├─ Exposure details display
│   ├─ Follow-up testing schedule
│   ├─ Test result input forms
│   ├─ Prophylaxis tracking
│   ├─ Counseling status
│   ├─ Timeline display
│   └─ Close exposure record
│
└─ Compliance specs:
    ├─ Baseline health check before work starts
    ├─ Annual screening for all staff
    ├─ Vaccination: Hepatitis B, Influenza, Tetanus
    ├─ Incident reporting within 24 hours
    ├─ Investigation within 5 days
    ├─ Bloodborne pathogen: follow-up at 6 wks, 3 mo, 6 mo, 12 mo
    ├─ Counseling mandatory for exposure
    ├─ All records confidential
    └─ Trend analysis & prevention

Success Criteria:
✓ Baseline screening recorded for all staff
✓ Annual screening scheduled & tracked
✓ Vaccination status tracked
✓ Due dates alerts working
✓ Incidents reported & investigated
✓ Follow-up tests scheduled & recorded
✓ Counseling tracking working
✓ Privacy/confidentiality enforced
```

---

#### **Week 6**

**Day 1-2: Task 12 - Reporting & Analytics Dashboard**
```
Priority: 🟡 HIGH
Dependencies: All previous tasks
Timeline: 2 days
Team: 1 Frontend Dev + 1 Backend Dev

Deliverables:
├─ components/ComplianceReporting.tsx (300 lines)
│   ├─ Monthly payroll report
│   │  ├─ Total gross income
│   │  ├─ Total deductions
│   │  ├─ Total net paid
│   │  ├─ BPJS contribution
│   │  └─ Export button
│   │
│   ├─ Attendance compliance report
│   │  ├─ Total working days
│   │  ├─ Total absences
│   │  ├─ Total lates
│   │  ├─ Total leaves
│   │  ├─ Overtime summary
│   │  └─ Violations flagged
│   │
│   ├─ Leave usage report
│   │  ├─ Annual leave used/remaining
│   │  ├─ Sick leave used
│   │  ├─ Special leaves used
│   │  ├─ Carryover tracking
│   │  └─ Expiration alerts
│   │
│   ├─ Performance summary
│   │  ├─ Avg performance rating
│   │  ├─ Rating distribution (pie chart)
│   │  ├─ Trend analysis
│   │  └─ By department comparison
│   │
│   ├─ Health & safety
│   │  ├─ Incidents reported
│   │  ├─ Incidents investigated
│   │  ├─ Vaccination compliance %
│   │  ├─ Screening completion %
│   │  └─ Trend analysis
│   │
│   └─ Export buttons: PDF, Excel, CSV
│
├─ components/DepartmentAnalytics.tsx (250 lines)
│   ├─ Staffing levels
│   ├─ Turnover rate
│   ├─ Performance ratings avg
│   ├─ Absence rate
│   ├─ Overtime hours
│   ├─ Training completion
│   ├─ By department comparison
│   └─ Trend charts
│
├─ services/reportingService.ts (200 lines)
│   ├─ generateMonthlyReport(month)
│   ├─ generateComplianceReport(month)
│   ├─ generateDepartmentReport(dept_id)
│   ├─ generatePerformanceReport()
│   ├─ generatePayrollReport()
│   ├─ exportToExcel(report_data)
│   ├─ exportToPDF(report_data)
│   └─ emailReport(recipients, report)
│
└─ Success Criteria:
    ✓ All key metrics displayed
    ✓ Charts render correctly
    ✓ Export to PDF working
    ✓ Export to Excel working
    ✓ Email distribution working
    ✓ Data refresh automatic
    ✓ Performance optimized
```

**Day 3-5: Task 13 - Compliance Report Generator for Dinkes/Kemenkes**
```
Priority: 🟡 HIGH
Dependencies: Task 12 (reporting)
Timeline: 3 days
Team: 1 Backend Dev + 1 Frontend Dev

Deliverables:
├─ services/dinkes ReportService.ts (200 lines)
│   ├─ generateMonthlySubmission(month)
│   │  ├─ Payroll summary
│   │  ├─ Attendance compliance
│   │  ├─ Leave management
│   │  ├─ Overtime report
│   │  ├─ Health & safety
│   │  ├─ Staffing levels
│   │  └─ Combine all into 1 report
│   │
│   ├─ generateAnnualReport(year)
│   │  ├─ Employee turnover
│   │  ├─ Salary structure
│   │  ├─ Training programs
│   │  ├─ Health incidents
│   │  ├─ Compliance violations
│   │  └─ Improvement plans
│   │
│   ├─ formatAsRequired(report, format)
│   │  ├─ PDF format per Dinkes template
│   │  ├─ Excel format with validations
│   │  ├─ CSV for data import
│   │  └─ XML for system integration
│   │
│   ├─ validateReport(report_data)
│   │  ├─ Check all required fields
│   │  ├─ Validate calculations
│   │  ├─ Flag missing data
│   │  └─ Return validation errors
│   │
│   └─ archiveReport(report_id)
│       ├─ Store in database
│       ├─ Sign with digital signature
│       └─ Maintain for audit
│
├─ components/DinkesReportGenerator.tsx (200 lines)
│   ├─ Select reporting period
│   ├─ Preview report content
│   ├─ Download/print buttons
│   ├─ Email to HRD/management
│   ├─ Archive report
│   ├─ Generate history/archive
│   └─ Compliance checklist
│
├─ database-dinkes-report.sql
│   ├─ Create table dinkes_reports
│   │  ├─ id, month, year, generated_date
│   │  ├─ report_data (JSONB)
│   │  ├─ validation_status, validation_errors
│   │  ├─ submitted_date, submission_status
│   │  ├─ generated_by, created_at
│   │  └─ digital_signature
│   │
│   └─ Create archive view
│      └─ All historical reports
│
└─ Success Criteria:
    ✓ Report pre-filled with data
    ✓ All required fields included
    ✓ PDF export ready to submit
    ✓ Validation working
    ✓ Archive maintained
    ✓ Audit trail complete
    ✓ Submission tracking
```

---

### **WEEK 7-8: PHASE 4 - LAUNCH & AUDIT PREP**

#### **Week 7**

**Day 1-3: Task 14 - Testing Suite (Unit + Integration)**
```
Priority: 🟡 MEDIUM
Dependencies: All code completed
Timeline: 3 days
Team: 1 QA Engineer + 1 Developer

Deliverables:
├─ Unit Tests (vitest)
│   ├─ services/
│   │  ├─ errorHandler.test.ts (50 tests)
│   │  ├─ payrollService.test.ts (80 tests)
│   │  ├─ leaveService.test.ts (100 tests)
│   │  ├─ workingHoursService.test.ts (60 tests)
│   │  └─ performanceService.test.ts (40 tests)
│   │
│   ├─ utils/
│   │  ├─ permissionUtils.test.ts (50 tests)
│   │  ├─ taxCalculator.test.ts (40 tests)
│   │  └─ dataValidation.test.ts (60 tests)
│   │
│   └─ hooks/
│      ├─ usePagination.test.ts (40 tests)
│      ├─ useLeaveManagement.test.ts (30 tests)
│      └─ usePayroll.test.ts (30 tests)
│
├─ Integration Tests
│   ├─ Employee management flow
│   ├─ Leave request workflow
│   ├─ Payroll generation
│   ├─ Performance review process
│   ├─ RBAC enforcement
│   └─ Error handling scenarios
│
├─ E2E Tests (critical paths)
│   ├─ Login → Employee management
│   ├─ Leave request submission & approval
│   ├─ Payroll generation & export
│   └─ Report generation
│
└─ Coverage Report: Target 80%+

Success Criteria:
✓ Unit test coverage 70%+
✓ Integration tests passing
✓ E2E critical paths tested
✓ No major bugs found
```

**Day 4-5: Task 15 - Data Migration & Cleanup**
```
Priority: 🔴 URGENT
Dependencies: All database changes completed
Timeline: 2 days
Team: 1 Database Admin + 1 Backend Dev

Deliverables:
├─ database-migration-strategy.sql
│   ├─ Backup production database
│   ├─ Add new columns (null-safe)
│   ├─ Migrate existing data
│   ├─ Data validation after migration
│   ├─ Cleanup old/temp data
│   └─ Indexes rebuilt
│
├─ data-mapping.xlsx
│   ├─ Old field → New field mapping
│   ├─ Data transformation rules
│   ├─ Validation checks
│   └─ Manual review list
│
├─ Migration validation
│   ├─ Row counts before/after
│   ├─ Foreign key integrity
│   ├─ Unique constraint validation
│   ├─ Sample data spot-check
│   └─ Performance test
│
└─ Rollback plan
    ├─ Backup + restore procedure
    ├─ Estimated rollback time
    └─ Communication plan

Success Criteria:
✓ Zero data loss
✓ All constraints enforced
✓ Foreign keys valid
✓ Performance acceptable
✓ Rollback procedure ready
```

---

#### **Week 8**

**Day 1-2: Task 16 - Production Deployment**
```
Priority: 🔴 URGENT
Dependencies: Task 15 (data migration)
Timeline: 2 days
Team: 1 DevOps + 1 Backend Dev

Deliverables:
├─ Deployment checklist
│   ├─ Code review completed
│   ├─ Tests passed
│   ├─ Database migration tested
│   ├─ Backup created
│   ├─ Rollback procedure ready
│   └─ Monitoring setup
│
├─ Blue-Green Deployment
│   ├─ Deploy to staging environment
│   ├─ Run smoke tests
│   ├─ Switch traffic to new version
│   ├─ Monitor for errors
│   └─ Rollback if needed
│
├─ Database migration execution
│   ├─ Run migration scripts
│   ├─ Validate data integrity
│   ├─ Rebuild indexes
│   └─ Test queries
│
├─ Environment setup
│   ├─ Update .env files
│   ├─ SSL certificates
│   ├─ Load balancer config
│   ├─ Database backups
│   └─ Monitoring alerts
│
└─ Post-deployment
    ├─ Monitor error rates
    ├─ Check performance metrics
    ├─ Verify all features working
    ├─ Check logs for errors
    └─ Update status page

Success Criteria:
✓ Zero downtime deployment
✓ All features working
✓ Error rate < 0.1%
✓ Performance baseline met
✓ Rollback not needed
```

**Day 3-5: Task 17 - Staff Training & Documentation**
```
Priority: 🟡 HIGH
Dependencies: All code completed
Timeline: 3 days
Team: 1 Tech Writer + 1 Product Owner

Deliverables:
├─ User Documentation
│   ├─ Getting Started guide
│   ├─ Feature guides (per role)
│   ├─ Video tutorials (key features)
│   ├─ FAQ document
│   ├─ Troubleshooting guide
│   └─ Screenshots/diagrams
│
├─ Training Materials
│   ├─ Admin training deck
│   ├─ HRD training deck
│   ├─ Supervisor training deck
│   ├─ Employee training deck
│   └─ Interactive demos
│
├─ Training Schedule
│   ├─ Day 1: Admin training
│   ├─ Day 2: HRD training
│   ├─ Day 3: Manager training
│   ├─ Day 4: Employee training
│   └─ Day 5: Q&A + support setup
│
├─ Support Procedures
│   ├─ Help desk setup
│   ├─ Issue reporting process
│   ├─ Escalation procedure
│   ├─ FAQ database
│   └─ Known issues list
│
└─ Documentation Archive
    ├─ API documentation
    ├─ Database schema
    ├─ Architecture diagrams
    ├─ Code standards
    ├─ Troubleshooting procedures
    └─ Operational runbooks

Success Criteria:
✓ All staff trained
✓ Documentation complete
✓ Support team ready
✓ Help desk functional
```

**Day 5: Task 18 - Mock Audit by Dinkes**
```
Priority: 🔴 URGENT
Dependencies: Task 17 (all systems ready)
Timeline: 1 day preparation + 1 day audit
Team: HRD Manager + Legal

Pre-Audit Checklist:
├─ Employee data complete
│   ├─ All employees have NPWP
│   ├─ BPJS numbers recorded
│   ├─ Bank accounts verified
│   ├─ Health checks completed
│   └─ All documents scanned
│
├─ Operational compliance
│   ├─ Jam kerja tracked & validated
│   ├─ Overtime properly calculated
│   ├─ Lembur pay correct per UU
│   ├─ Leave types implemented
│   ├─ Leave approvals documented
│   └─ Cuti saldo akurat
│
├─ Payroll compliance
│   ├─ Tax (PPh 21) correctly calculated
│   ├─ BPJS deduction correct
│   ├─ Slip gaji generated & distributed
│   ├─ Payroll report submitted
│   └─ Bank transfer documented
│
├─ K3 compliance
│   ├─ Baseline health screening completed
│   ├─ Annual screening scheduled
│   ├─ Vaccination program running
│   ├─ Incident reporting system active
│   └─ Investigations documented
│
├─ Performance management
│   ├─ Annual appraisals completed
│   ├─ Development plans created
│   ├─ Training programs documented
│   └─ Career paths defined
│
├─ RBAC & access control
│   ├─ Roles & permissions defined
│   ├─ Access policies enforced
│   ├─ Audit log maintained
│   └─ Data security verified
│
└─ Documentation
    ├─ HR policies documented
    ├─ Procedure manuals available
    ├─ Training records archived
    ├─ Compliance checklist completed
    └─ Audit trail preserved

Success Criteria:
✓ No major findings
✓ Minor findings (if any) have action plans
✓ Documentation complete
✓ Staff compliance confirmed
✓ System audit passed
```

---

## 👥 TEAM STRUCTURE & ROLES

### **Recommended Team Composition:**

```
Project Manager (1 person)
├─ Overall coordination
├─ Timeline management
├─ Stakeholder communication
└─ Risk management

Senior Backend Developer (2 people)
├─ Database schema & optimization
├─ API development
├─ Business logic implementation
└─ Performance tuning

Senior Frontend Developer (2 people)
├─ UI/UX implementation
├─ Component architecture
├─ Performance optimization
└─ Cross-browser testing

QA Engineer (1 person)
├─ Test planning
├─ Unit testing
├─ Integration testing
├─ E2E testing
└─ Bug reporting

DevOps/Infrastructure (1 person)
├─ Deployment automation
├─ Database backups
├─ Monitoring setup
├─ Performance tuning
└─ Security hardening

Database Administrator (1 person)
├─ Schema design
├─ Migration execution
├─ Performance optimization
├─ Backup & recovery
└─ Data integrity

Tech Writer (1 person)
├─ User documentation
├─ API documentation
├─ Training materials
└─ Support procedures

HRD Consultant (1 person)
├─ Compliance verification
├─ HR policy definition
├─ Legal review
└─ Staff training

Security Engineer (0.5 person)
├─ RBAC design
├─ Data encryption
├─ Vulnerability testing
└─ Compliance audit

Product Owner (0.5 person)
├─ Requirements definition
├─ Priority management
├─ Stakeholder alignment
└─ Sign-off

Total: 9.5 FTE over 8 weeks
```

---

## 📊 GANTT CHART TIMELINE

```
Week    Mon    Tue    Wed    Thu    Fri
─────────────────────────────────────────
 1    [Task 1 ─────────────────────────]
              [Task 2 ─────────────────]
      [Task 3 ──────────────────────────]
 2    [Task 4 ─────────────────────────]
              [Task 5 ─────────────────]
 3           [Task 6 ─────────────────]
             [Task 7 ─────────────────]
 4           [Task 8 ─────────────────]
            [Task 9 ──────────────────]
 5    [Task 10 ────────────────────────]
              [Task 11 ──────────────]
 6              [Task 12 ──────────────]
              [Task 13 ──────────────]
 7    [Task 14 ─────────────────────────]
             [Task 15 ─────────────────]
 8            [Task 16 ─────────────────]
            [Task 17 ──────────────────]
                    [Task 18] Mock Audit

Dependencies (sequential):
Task 1 → Task 2 → Task 5
Task 3 (parallel)
Task 4 (parallel)
Task 6 → Task 7 → Task 9
Task 8 (parallel)
Task 10 → Task 11
Task 12 → Task 13
Task 14 (parallel)
Task 15 → Task 16
Task 17 (parallel)
Task 18 (final)
```

---

## 📈 SUCCESS METRICS & KPIs

### **Development Metrics:**
```
Code Quality:
├─ Test coverage: 80%+ ✓
├─ Code review score: 4/5+ ✓
├─ Technical debt reduction: 50%+ ✓
└─ Bug rate: <1 per 1000 lines ✓

Performance:
├─ Initial load time: <1s ✓
├─ Page navigation: <500ms ✓
├─ Database query: <100ms ✓
├─ API response: <200ms ✓
└─ Memory usage: <200MB ✓

Reliability:
├─ Uptime: 99.5%+ ✓
├─ Error rate: <0.1% ✓
├─ Retry success: >95% ✓
└─ Data loss: 0 incidents ✓
```

### **Compliance Metrics:**
```
UU Ketenagakerjaan:
├─ Working hours compliance: 100% ✓
├─ Overtime calculation: 100% ✓
├─ Leave management: 100% ✓
├─ Tax compliance: 100% ✓
└─ BPJS tracking: 100% ✓

KMK No. 1087/2020 (SDM):
├─ Performance management: 100% ✓
├─ Development plans: 100% ✓
├─ Training tracking: 100% ✓
└─ Career path: 100% ✓

KMK No. 49/2013 (K3):
├─ Health screening: 100% ✓
├─ Vaccination tracking: 100% ✓
├─ Incident reporting: 100% ✓
└─ Investigation documentation: 100% ✓
```

### **Business Metrics:**
```
User Adoption:
├─ Admin adoption: 100% ✓
├─ HRD adoption: 100% ✓
├─ Manager adoption: 95%+ ✓
└─ Employee adoption: 90%+ ✓

Operational:
├─ Manual data entry reduction: 80%+ ✓
├─ Process automation: 70%+ ✓
├─ Error reduction: 90%+ ✓
└─ Processing time reduction: 60%+ ✓
```

---

## 💰 BUDGET ESTIMATE

```
Resource Costs (8 weeks):
├─ Project Manager: 1 × Rp 200M = Rp 200M
├─ Senior Backend Dev: 2 × Rp 500M = Rp 1B
├─ Senior Frontend Dev: 2 × Rp 400M = Rp 800M
├─ QA Engineer: 1 × Rp 300M = Rp 300M
├─ DevOps: 1 × Rp 350M = Rp 350M
├─ DBA: 1 × Rp 300M = Rp 300M
├─ Tech Writer: 1 × Rp 150M = Rp 150M
├─ HRD Consultant: 1 × Rp 250M = Rp 250M
├─ Security Engineer (0.5): 0.5 × Rp 350M = Rp 175M
└─ Product Owner (0.5): 0.5 × Rp 300M = Rp 150M
   TOTAL RESOURCE COST: ≈ Rp 3.675B

Infrastructure & Tools:
├─ Testing tools & licenses: Rp 50M
├─ Security tools: Rp 75M
├─ Monitoring tools: Rp 50M
├─ Database hosting upgrade: Rp 100M
├─ Development infrastructure: Rp 75M
└─ Training & documentation tools: Rp 25M
   TOTAL TOOLS & INFRA: ≈ Rp 375M

Contingency (10%): Rp 405M

TOTAL PROJECT COST: ≈ Rp 4.455B (≈ USD 295K)

Cost per week: ≈ Rp 556M
Cost per feature: ≈ Rp 247M (18 tasks)
```

---

## ⚠️ RISK MANAGEMENT

### **High-Risk Items:**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Data migration issues | Severe | Medium | 2x backup + test migration first |
| Staff resistance to change | High | High | Early training + champions program |
| Scope creep | High | High | Fixed scope + change control |
| Performance issues in production | Severe | Medium | Load testing + monitoring |
| Security vulnerabilities | Severe | Medium | Security audit + penetration test |
| Compliance audit failure | Critical | Low | Compliance consultant + mock audit |
| Team turnover | High | Medium | Documentation + knowledge sharing |

### **Mitigation Strategies:**

```
1. DATA RISK
   └─ 3 backups (daily + weekly + monthly)
   └─ Test migration in staging environment
   └─ Data validation before & after
   └─ Rollback procedure ready

2. TECHNICAL RISK
   └─ Code review for all changes
   └─ Unit & integration testing
   └─ Staging environment testing
   └─ Performance baseline testing

3. ORGANIZATIONAL RISK
   └─ Weekly status meetings
   └─ Risk register maintained
   └─ Escalation procedures defined
   └─ Communication plan active

4. COMPLIANCE RISK
   └─ Legal review of all changes
   └─ Compliance consultant involved
   └─ Mock audit before go-live
   └─ Audit trail maintenance

5. SCHEDULE RISK
   └─ Task buffers built-in (10%)
   └─ Parallel work where possible
   └─ Clear dependencies defined
   └─ Status tracking daily
```

---

## ✅ COMPLETION CRITERIA

Before going live, verify:

```
✓ Phase 1 (Foundation) - 100% complete
  ├─ All critical tasks done
  ├─ No outstanding security issues
  └─ Performance meets baseline

✓ Phase 2 (Compliance) - 100% complete
  ├─ All UU requirements met
  ├─ All KMK requirements met
  ├─ Compliance audit passed
  └─ Legal approval obtained

✓ Phase 3 (Features) - 100% complete
  ├─ RBAC fully implemented
  ├─ Reporting working
  ├─ Testing suite complete (80%+ coverage)
  └─ Documentation complete

✓ Phase 4 (Launch) - Ready
  ├─ Data migration successful
  ├─ Production deployment complete
  ├─ Staff trained
  ├─ Mock audit passed
  └─ Support team ready
```

---

## 📞 GOVERNANCE & REPORTING

### **Weekly Status Report:**
```
1. Completed Tasks (this week)
2. In-Progress Tasks (current status %)
3. Upcoming Tasks (next week)
4. Blockers/Issues
5. Risk updates
6. Metrics & KPIs
7. Budget status
8. Schedule status (on-track?)
```

### **Steering Committee Meetings:**
- Every Monday: Status update
- Every Friday: Risk review

### **Change Control:**
- All scope changes require approval
- Impact assessment before changes
- Change log maintained

---

**Roadmap prepared by:** AI Development Team  
**Last Updated:** April 19, 2026  
**Next Review:** Weekly (Monday)


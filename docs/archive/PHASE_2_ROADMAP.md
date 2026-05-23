# HRMS PRO - IMPROVEMENT PHASE 2 ROADMAP

**Status:** PLANNED  
**Target Duration:** 2-3 weeks  
**Priority:** HIGH (After Phase 1 stabilization)

---

## 🎯 PHASE 2 OBJECTIVES

After Phase 1 (critical security & performance), Phase 2 focuses on:
1. **Code Quality** - Unit & integration tests
2. **Observability** - Logging and monitoring
3. **Performance** - Redis caching, query optimization
4. **Code Organization** - Split Zustand store, remove props drilling
5. **Documentation** - Consolidate & improve docs

---

## 📋 PHASE 2 TASKS

### Task 1: Add Unit Tests (Priority: HIGH)

**Timeline:** 3-4 days  
**Effort:** Medium

#### What to Test

```typescript
// Test errorHandlingService
describe('errorHandlingService', () => {
  it('should classify network errors', () => {
    const error = new Error('Network unreachable');
    const appError = classifyError(error);
    expect(appError.code).toBe(ErrorCode.NETWORK_ERROR);
  });

  it('should retry on transient errors', async () => {
    let attemptCount = 0;
    const result = await withRetry(
      async () => {
        attemptCount++;
        if (attemptCount < 3) throw new Error('Network error');
        return 'success';
      },
      { maxRetries: 3 }
    );
    expect(result).toBe('success');
    expect(attemptCount).toBe(3);
  });
});

// Test paginationService
describe('paginationService', () => {
  it('should paginate correctly', async () => {
    const result = await paginationService.fetchEmployeesPaginated(supabase, {
      page: 1,
      pageSize: 20
    });
    expect(result.data).toHaveLength(20);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBeGreaterThan(0);
  });

  it('should cache results', () => {
    const params = { page: 1, pageSize: 20 };
    const result1 = paginationService.getCached('employees', params);
    expect(result1).toBeNull(); // Not cached yet
    
    paginationService.setCached('employees', params, mockResult);
    const result2 = paginationService.getCached('employees', params);
    expect(result2).toEqual(mockResult);
  });
});

// Test rbacService
describe('rbacService', () => {
  it('should check permissions correctly', () => {
    expect(RBACService.hasPermission('admin', Permission.DELETE_EMPLOYEE)).toBe(true);
    expect(RBACService.hasPermission('karyawan', Permission.DELETE_EMPLOYEE)).toBe(false);
  });

  it('should enforce resource access', () => {
    const canAccess = RBACService.canAccessResource(
      'karyawan',
      'user123',
      'employee',
      'user123' // resourceOwnerId
    );
    expect(canAccess).toBe(true);
    
    const cannotAccess = RBACService.canAccessResource(
      'karyawan',
      'user123',
      'employee',
      'user456' // different owner
    );
    expect(cannotAccess).toBe(false);
  });
});
```

#### Setup Testing Framework
```bash
# Tests are already setup with vitest (in package.json)
npm run test              # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

#### Test Files to Create
```
hooks/__tests__/
  ├── useRetry.test.ts
  ├── usePagination.test.ts
  └── useAppInitialization.test.ts

services/__tests__/
  ├── errorHandlingService.test.ts
  ├── paginationService.test.ts
  └── rbacService.test.ts

components/__tests__/
  ├── ErrorBoundary.test.tsx
  └── EmployeeForm.test.tsx
```

---

### Task 2: Logging & Monitoring (Priority: HIGH)

**Timeline:** 2-3 days  
**Effort:** Medium

#### Create Logging Service

```typescript
// services/loggingService.ts
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  action?: string;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };

    // Console log
    console[level.toLowerCase()](message, context);

    // Store locally
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send to server in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(entry);
    }
  }

  private async sendToServer(entry: LogEntry) {
    // Send to logging service (ELK, DataDog, etc.)
    try {
      await fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Don't fail if logging fails
      console.error('Failed to send log');
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const loggingService = new LoggingService();
```

#### Usage
```typescript
// In components/services
import { loggingService, LogLevel } from '../services/loggingService';

loggingService.log(LogLevel.INFO, 'Employee loaded', {
  employeeId: 'emp-123',
  duration: 150
});

loggingService.log(LogLevel.ERROR, 'Failed to save employee', {
  employeeId: 'emp-123',
  error: error.message
});
```

---

### Task 3: Redis Caching (Priority: HIGH)

**Timeline:** 2-3 days  
**Effort:** Medium

#### Create Redis Cache Service

```typescript
// services/cacheService.ts
import redis from 'redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key: string;
  data: any;
}

class CacheService {
  private client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  });

  constructor() {
    this.client.on('error', (err) => console.error('Redis error:', err));
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttlSeconds = 3600): Promise<boolean> {
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(keys);
      }
      return 0;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  async clear(): Promise<boolean> {
    try {
      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
}

export const cacheService = new CacheService();
```

#### Usage
```typescript
// Cache employee list
const cacheKey = `employees:page:${page}:size:${pageSize}`;
const cached = await cacheService.get(cacheKey);

if (cached) {
  return cached; // Return from cache
}

// Fetch from database
const result = await paginationService.fetchEmployeesPaginated(...);

// Cache for 5 minutes
await cacheService.set(cacheKey, result, 300);

return result;
```

---

### Task 4: Split Zustand Store (Priority: MEDIUM)

**Timeline:** 2 days  
**Effort:** Medium

#### Current Issue
```typescript
// appStore.ts - 500+ lines, multiple concerns
// - Auth state
// - Data state (employees, attendance, etc.)
// - UI state (modals, forms, etc.)
```

#### Solution
```typescript
// stores/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token })
}));

// stores/dataStore.ts
export const useDataStore = create((set) => ({
  employees: [],
  attendance: [],
  setEmployees: (employees) => set({ employees }),
  setAttendance: (attendance) => set({ attendance })
}));

// stores/uiStore.ts
export const useUIStore = create((set) => ({
  isModalOpen: false,
  selectedEmployee: null,
  setIsModalOpen: (open) => set({ isModalOpen: open }),
  setSelectedEmployee: (emp) => set({ selectedEmployee: emp })
}));

// Usage in components
function Component() {
  const user = useAuthStore((state) => state.user);
  const employees = useDataStore((state) => state.employees);
  const isModalOpen = useUIStore((state) => state.isModalOpen);
}
```

---

### Task 5: Consolidate Documentation (Priority: MEDIUM)

**Timeline:** 2 days  
**Effort:** Low

#### Current Problem
- 30+ markdown files scattered
- Duplicated information
- Outdated content

#### Solution
```
docs/
├── README.md                    # Main entry point
├── GETTING_STARTED.md          # Setup guide
├── ARCHITECTURE.md             # System design
├── API_GUIDE.md               # API documentation
├── DATABASE_SCHEMA.md         # Database structure
├── DEPLOYMENT.md              # Production guide
├── TROUBLESHOOTING.md         # Common issues
├── SECURITY.md                # Security guidelines
└── CONTRIBUTING.md            # Developer guidelines

archive/                         # Old docs
├── OLD_ANALYSIS_*.md
└── OLD_SETUP_*.md
```

---

### Task 6: Remove Props Drilling (Priority: MEDIUM)

**Timeline:** 1-2 days  
**Effort:** Low-Medium

#### Current Pattern
```typescript
// Components receive many props
<EmployeeForm 
  employee={employee}
  onSave={handleSave}
  onCancel={handleCancel}
  isLoading={isLoading}
  error={error}
  departments={departments}
  positions={positions}
  workUnits={workUnits}
/>
```

#### Better Pattern
```typescript
// Use custom hooks instead
function EmployeeForm() {
  const { employee, isLoading } = useEmployeeContext();
  const { departments } = useOrganizationData();
  const { handleSave } = useEmployeeCRUD();
  
  return (
    // Component with direct access to data
  );
}
```

---

## 🔄 PHASE 2 IMPLEMENTATION TIMELINE

```
Week 1:
├─ Day 1-2: Create logging service + setup tests
├─ Day 2-3: Add unit tests for Phase 1 services
└─ Day 4: Review & refine

Week 2:
├─ Day 1: Setup Redis & caching service
├─ Day 2: Integrate caching into pagination
├─ Day 3-4: Split Zustand store
└─ Day 5: Props drilling cleanup

Week 3:
├─ Day 1-2: Consolidate documentation
├─ Day 3: Performance testing
├─ Day 4: Bug fixes
└─ Day 5: Prepare for Phase 3
```

---

## 📊 PHASE 2 SUCCESS METRICS

- ✅ 80%+ code coverage on services
- ✅ 0 critical console errors in development
- ✅ <5s load time for any page
- ✅ <50ms database query time (with indexes + caching)
- ✅ All documentation in one place
- ✅ No props drilling >3 levels deep

---

## 🚀 PHASE 3 PREVIEW

After Phase 1 & 2 are complete, Phase 3 will focus on:

### Feature Enhancements
- Employee: Add family data, education history, bank account, NPWP, BPJS
- Contract: Contract tracking & renewal notifications
- Career: Promotion/demotion tracking, salary history
- Attendance: Biometric integration, GPS, shift scheduling
- Leave: Auto balance calculation, quota system, multi-level approval
- Performance: Employee performance reviews & ratings

### Technical Enhancements
- Load testing (5000+ employees)
- Advanced analytics dashboard
- Real-time notifications
- Offline support for mobile app
- Dark mode
- Multi-language support

### Compliance
- UU Ketenagakerjaan compliance checks
- Tax reporting (SPT, BPJS)
- Audit trail improvements
- Data privacy (GDPR-like)

---

## 📝 NOTES FOR DEVELOPERS

1. **Phase 1 is foundation** - Don't skip it
2. **Phase 2 is stabilization** - Ensure Phase 1 works before starting
3. **Phase 3 is features** - Only after 1 & 2 are rock solid
4. **Testing matters** - Phase 2 tests will catch Phase 1 bugs
5. **Documentation is critical** - Update as you code, not after

---

**Questions?** See PHASE_1_IMPROVEMENTS_SUMMARY.md for implementation details.

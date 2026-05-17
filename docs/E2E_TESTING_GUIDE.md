# E2E Testing & Pre-Deployment Guide

## 🧪 E2E Testing Setup

### Prerequisites
- Playwright installed (already done: `npm install --save-dev @playwright/test`)
- Running dev server (`npm run dev`)
- Test credentials set up

### Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive browser)
npm run test:e2e:ui

# Run in debug mode (step-by-step)
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run specific test by name
npx playwright test -g "should login with valid test credentials"

# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox

# Run with trace recording (for debugging)
npx playwright test --trace on
```

---

## 📋 Test Coverage

### 1. **Authentication Tests** (`tests/e2e/auth.spec.ts`)
- ✅ Login page loads correctly
- ✅ Shows error on invalid credentials
- ✅ Successful login with valid credentials
- ✅ User info displayed after login
- ✅ Logout functionality

**To run:**
```bash
npx playwright test auth.spec.ts
```

### 2. **Attendance Tests** (`tests/e2e/attendance.spec.ts`)
- ✅ Attendance page displays
- ✅ Current location shown on page
- ✅ Check-in submission
- ✅ Attendance history viewing
- ✅ Today's record display

**To run:**
```bash
npx playwright test attendance.spec.ts
```

### 3. **Dashboard Tests** (`tests/e2e/dashboard.spec.ts`)
- ✅ Dashboard loads after login
- ✅ Navigation menu present
- ✅ Section navigation works
- ✅ Graceful offline handling
- ✅ Mobile responsiveness
- ✅ Page load time < 5s

**To run:**
```bash
npx playwright test dashboard.spec.ts
```

### 4. **API Integration Tests** (`tests/e2e/api.spec.ts`)
- ✅ Health check endpoint
- ✅ List employees with pagination
- ✅ Fetch attendance records
- ✅ Unauthorized request handling
- ✅ 404 error handling

**To run:**
```bash
npx playwright test api.spec.ts
```

---

## 🔐 Test Credentials

Set environment variables for test authentication:

```bash
# .env.local or system environment
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="Test@1234"
export TEST_AUTH_TOKEN="your-jwt-token-here"
export BASE_URL="http://localhost:3000"
```

Or create `.env.test`:
```
TEST_EMAIL=test@example.com
TEST_PASSWORD=Test@1234
TEST_AUTH_TOKEN=
BASE_URL=http://localhost:3000
```

---

## 📊 Test Reports

After running tests, a detailed HTML report is generated:

```bash
# View test report (auto-generated after tests)
npx playwright show-report
```

Reports include:
- Test results (pass/fail)
- Screenshots on failure
- Video recordings (if enabled)
- Browser traces for debugging

---

## 🚀 Pre-Deployment Validation

Run this **before deploying to production**:

```bash
# Quick validation
npm run pre-deploy

# Strict validation (fail on warnings)
npm run pre-deploy:strict
```

### Checks Performed

✅ **Environment Variables**
- Required: `VITE_DATA_SUPABASE_URL`, `VITE_DATA_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
- Optional: `NODE_ENV`, `CORS_ORIGIN`, `REDIS_URL`, `LOG_LEVEL`

✅ **Node.js Version**
- Minimum: 18.0.0
- Recommended: 20+

✅ **Dependencies**
- Core: `express`, `@supabase/supabase-js`, `cors`
- Dev: `typescript`

✅ **Database Connectivity**
- Verifies connection to Supabase
- Tests basic query execution

✅ **Files & Structure**
- Checks for critical files: `package.json`, `tsconfig.json`, `api-server.ts`, `App.tsx`
- Verifies directory structure: `src/`, `components/`, `services/`, `database/`

✅ **Build Artifacts**
- Checks if `dist/` exists and is properly built
- Verifies `index.html` and assets are present

✅ **SSL Certificates** (if applicable)
- Looks for `ssl/cert.pem`, `ssl/key.pem`, `ssl/fullchain.pem`

✅ **Logs & Backups**
- Verifies `logs/` directory exists or can be created
- Checks `backups/` directory and recent backup files

✅ **Documentation**
- Ensures `README.md`, `docs/PRODUCTION_CHECKLIST.md`, `API_TEST_GUIDE.md` exist

---

## 📋 Pre-Deployment Checklist

Before running `npm run pre-deploy`, ensure:

- [ ] All environment variables are set in production
- [ ] Database migrations are applied
- [ ] Build completed successfully (`npm run build`)
- [ ] Unit tests passing (`npm run test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Type checking passing (`npm run typecheck`)
- [ ] Backup strategy verified
- [ ] SSL certificates obtained (if HTTPS)
- [ ] Domain/DNS configured
- [ ] Reverse proxy (Nginx) configured
- [ ] Monitoring system ready (Prometheus/Sentry)

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Pre-deployment Validation

on:
  push:
    branches: [main, production]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Unit tests
        run: npm run test:ci
      
      - name: Build
        run: npm run build
      
      - name: E2E tests
        run: npm run test:e2e
      
      - name: Pre-deployment check
        run: npm run pre-deploy:strict
        env:
          VITE_DATA_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_DATA_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 🐛 Debugging Failed Tests

### If test fails:

1. **Run in UI mode** (interactive):
   ```bash
   npm run test:e2e:ui
   ```

2. **Run in debug mode** (step by step):
   ```bash
   npm run test:e2e:debug
   ```

3. **Check screenshots** (failed tests auto-capture):
   ```bash
   ls test-results/
   ```

4. **View video recording**:
   ```bash
   npx playwright show-report
   ```

### Common Issues

- **Timeout errors**: Increase timeout in `playwright.config.ts` → `use.timeout`
- **Element not found**: Verify selectors match your actual HTML (use `Ctrl+Shift+C` inspector)
- **Auth failures**: Check `TEST_EMAIL` and `TEST_PASSWORD` environment variables
- **Offline tests**: Ensure dev server is running (`npm run dev`)

---

## 📈 Next Steps

After E2E tests pass and pre-deployment check succeeds:

1. **Deploy to Staging**:
   ```bash
   # Setup staging environment
   # Run smoke tests against staging
   npm run healthcheck  # Verify health endpoint
   ```

2. **Production Deployment**:
   ```bash
   npm run pre-deploy:strict  # Final check
   # Deploy to production
   npm run healthcheck  # Verify production
   ```

3. **Post-Deployment**:
   - Monitor logs: `tail -f logs/app.log`
   - Check API: `curl https://your-domain.com/api/health`
   - Verify user login works
   - Test critical flows manually
   - Monitor error rates and performance

---

## 📞 Support

If tests fail:
1. Check error message and screenshot
2. Review test code: `tests/e2e/*.spec.ts`
3. Verify selectors match your HTML
4. Check environment variables are set
5. Ensure dev server is running

For API integration tests, verify:
- API server is running
- Auth token is valid
- Database is accessible
- No CORS issues

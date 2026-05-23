# Strategi Implementasi Sistem Biometric + Device Binding HRMS Pro

**Timeline Estimasi**: 8-10 minggu | **Priority**: HIGH | **Status**: Planning

---

## 📋 RINGKASAN EKSEKUTIF

Implementasi sistem anti-manipulasi absensi dengan:
- ✅ **Android**: Face Recognition + Device Binding
- ✅ **iOS**: TOTP + Device Binding (interim)
- ✅ **Web Admin**: Device Management + Audit Dashboard
- ✅ **Database**: employee_devices + Biometric fields di attendance table

---

## 🗓️ TIMELINE IMPLEMENTASI (8-10 minggu)

```
WEEK 1-2  │ PHASE 1: Database Setup
WEEK 3-4  │ PHASE 2: Android Implementation
WEEK 5-6  │ PHASE 3: iOS Implementation
WEEK 7    │ PHASE 4: Web Admin Dashboard
WEEK 8    │ PHASE 5: Security & Validation
WEEK 9    │ PHASE 6: Testing & QA
WEEK 10   │ PHASE 7-8: Deployment & Documentation
```

---

## 🔧 PHASE 1: Database Setup (Week 1-2)

### Task 1.1: Run Database Schema [DONE ✓]
- ✅ Created `employee_devices` table
- ✅ Created attendance columns for biometric data
- ✅ Fixed UUID/TEXT type mismatch

**File**: `database-setup-step1.sql`

### Task 1.2: Create Migration Script for Existing Data
**File to create**: `database-setup-step2-migrate-existing.sql`
```sql
-- Untuk database yang sudah ada, migrate data lama
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS biometric_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS biometric_verified BOOLEAN DEFAULT FALSE;

-- Set default device untuk existing data
UPDATE attendance
SET biometric_type = 'manual', biometric_verified = FALSE
WHERE biometric_type IS NULL;
```

### Task 1.3: Setup RLS Policies
**File to create**: `database-setup-step3-rls-biometric.sql`
```sql
-- RLS untuk employee_devices
ALTER TABLE public.employee_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_devices_read"
    ON public.employee_devices FOR SELECT
    USING (
        public.is_admin_user() OR 
        employee_id = public.current_employee_id()
    );

CREATE POLICY "employee_devices_insert"
    ON public.employee_devices FOR INSERT
    WITH CHECK (
        public.is_admin_user() OR 
        employee_id = public.current_employee_id()
    );
```

### Task 1.4: Create Indexes for Performance
**File to create**: `database-setup-step4-indexes-biometric.sql`
```sql
CREATE INDEX idx_employee_devices_device_id 
    ON public.employee_devices(device_id);
CREATE INDEX idx_attendance_device_id 
    ON public.attendance(device_id);
CREATE INDEX idx_attendance_biometric_verified 
    ON public.attendance(biometric_verified);
```

### ✅ Success Criteria Phase 1:
- [ ] All SQL scripts executed without errors
- [ ] `employee_devices` table visible in Supabase
- [ ] RLS policies active
- [ ] Indexes created

---

## 📱 PHASE 2: Android Implementation (Week 3-4)

### Task 2.1: Setup Libraries & Dependencies
**Install packages**:
```bash
# Face Recognition
npm install @react-native-ml-kit/face-detection
npm install react-native-vision-camera
npm install @react-native-face-detection/face-detection

# Device Info
npm install react-native-device-info

# Geolocation
npm install react-native-geolocation-service

# Local storage
npm install @react-native-async-storage/async-storage
```

### Task 2.2: Create `deviceService.ts`
**File to create**: `mobile-absensi/src/services/deviceService.ts`
```typescript
// Key functions:
- registerDevice(employeeId, faceEmbedding)
- getDeviceInfo()
- getDeviceFingerprint()
- verifyDeviceBinding()
- listDevices(employeeId)
- blockDevice(deviceId)
```

### Task 2.3: Create `biometricService.ts`
**File to create**: `mobile-absensi/src/services/biometricService.ts`
```typescript
// Key functions:
- captureFaceSnapshot()
- extractFaceEmbedding(image)
- compareFaceEmbeddings(captured, stored)
- calculateFaceConfidence()
- checkLivenessDetection()
```

### Task 2.4: Update `AttendanceScreen.tsx`
**Modify**: `mobile-absensi/src/features/attendance/AttendanceScreen.tsx`
```
Flow:
1. Check device is registered
2. If not registered → Show device registration screen
3. If registered & check-in time → Show face capture screen
4. Capture selfie + extract embedding
5. Compare with stored face data (95%+ threshold)
6. If match → Save attendance with biometric_verified = TRUE
7. If not match → Show error, allow retry (max 3 attempts)
```

### Task 2.5: Update `attendanceService.ts`
**Modify**: `mobile-absensi/src/services/attendanceService.ts`
```typescript
// New parameters:
- checkIn(user, draft, biometricData, faceEmbedding)
  └─ Save face_match_score, biometric_verified, device_id
  
- checkOut(user, draft, biometricData)
  └─ Update face_verification_check_out if face used
```

### Task 2.6: Create Device Registration Screen
**File to create**: `mobile-absensi/src/features/device/DeviceRegistrationScreen.tsx`
```
1. Show device info (model, OS version)
2. Capture reference face (3-5 angles for accuracy)
3. Generate face embedding
4. Save to employee_devices table
5. Mark as primary device
```

### ✅ Success Criteria Phase 2:
- [ ] Device registration screen functional
- [ ] Face capture working smoothly
- [ ] Face embedding extraction accurate (95%+ on test data)
- [ ] Attendance saved with biometric data
- [ ] Tested on real Android device (Samsung/Xiaomi/Oppo)

---

## 🍎 PHASE 3: iOS Implementation (Week 5-6)

### Task 3.1: Setup TOTP Library
**Install packages**:
```bash
npm install otplib
npm install qrcode  # For QR code generation during setup
npm install react-native-share  # To share TOTP secret
```

### Task 3.2: Create `totpService.ts`
**File to create**: `mobile-absensi/src/services/totpService.ts`
```typescript
// Key functions:
- generateTOTPSecret()
- generateTOTPToken(secret)
- verifyTOTPToken(secret, token, window)
- storeTOTPSecret(employeeId, secret)
- getTOTPSecret(employeeId)
```

### Task 3.3: Create TOTP Setup Screen
**File to create**: `mobile-absensi/src/features/device/TOTPSetupScreen.tsx`
```
1. Generate TOTP secret on first login
2. Display QR code for backup (optional authenticator app)
3. Show 6-digit code preview
4. Save secret securely (encrypted AsyncStorage)
5. Show backup codes (emergency access)
```

### Task 3.4: Update iOS AttendanceScreen
**Modify**: `mobile-absensi/src/features/attendance/AttendanceScreen.tsx` (iOS branch)
```
Flow:
1. Check device is registered (UUID + Device Token)
2. If first time → Show TOTP setup screen
3. If check-in time → Show TOTP code input
4. User input 6-digit code
5. Verify code (30 second window)
6. If valid → Save attendance
7. If invalid → Show error, allow retry (max 3 attempts)
```

### Task 3.5: Add Device Binding for iOS
**Modify**: `mobile-absensi/src/services/deviceService.ts` (add iOS support)
```typescript
// iOS specific:
- getIOSDeviceUUID()
- getIOSDeviceToken()
- getIOSDeviceModel()
- getIOSTimezone()
- getIOSNetworkInfo()
```

### Task 3.6: Add Geo-location Verification (iOS)
```typescript
// For iOS, add additional verification layer:
- Verify latitude/longitude within radius
- Verify timezone matches company location
- Verify WiFi SSID matches hospital network (optional)
```

### ✅ Success Criteria Phase 3:
- [ ] TOTP secret generation working
- [ ] TOTP code validation accurate
- [ ] Device UUID tracking functional
- [ ] Attendance saved with biometric_type = 'totp'
- [ ] Tested on real iPhone (iOS 14+)

---

## 🌐 PHASE 4: Web Admin Dashboard (Week 7)

### Task 4.1: Create DeviceManagement Component
**File to create**: `components/DeviceManagement.tsx`
```
Features:
- List all devices per employee
- Show device status (Active/Inactive/Blocked)
- Device approval workflow
- Block suspicious devices
- View device fingerprint & platform info
```

### Task 4.2: Create AttendanceAudit Component
**File to create**: `components/AttendanceAudit.tsx`
```
Features:
- View all attendance records with biometric data
- Filter by biometric_type (face/totp/manual)
- View face_match_score distribution
- Show failed verification attempts
- Export audit logs
```

### Task 4.3: Create AnomalyDetection Component
**File to create**: `components/AnomalyDetection.tsx`
```
Features:
- Show suspicious patterns (multiple devices per employee)
- Alert on low face confidence scores (<80%)
- Alert on frequent failed TOTP attempts
- Show impossible check-in (traveled too fast between locations)
- Timeline view of device changes
```

### Task 4.4: Add Device Management API Routes
**File to create**: `api/deviceManagement.ts`
```typescript
- GET /api/devices - List all devices
- GET /api/devices/:employeeId - List employee's devices
- POST /api/devices/:deviceId/block - Block device
- POST /api/devices/:deviceId/unblock - Unblock device
- DELETE /api/devices/:deviceId - Remove device
- GET /api/devices/suspicious - List suspicious devices
```

### ✅ Success Criteria Phase 4:
- [ ] Device management dashboard functional
- [ ] Admin can view & manage devices
- [ ] Audit log visible in dashboard
- [ ] Anomaly detection alerts working
- [ ] Real-time device status updates

---

## 🔒 PHASE 5: Security & Validation (Week 8)

### Task 5.1: Rate Limiting
```typescript
// Implement rate limiting for check-in attempts
- Max 3 failed face verification per 5 minutes
- Max 3 failed TOTP attempts per 5 minutes
- After 3 failures → Block check-in for 15 minutes
- Log all attempts for audit
```

### Task 5.2: Liveness Detection (Android)
```typescript
// Prevent spoofing attacks (printed photo, video)
- Eye movement detection
- Head movement detection
- Texture analysis
- Use: `react-native-face-detection-liveness`
```

### Task 5.3: Create Audit Log Table
**File to create**: `database-setup-step5-audit-log.sql`
```sql
CREATE TABLE public.device_audit_log (
    id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id),
    device_id TEXT REFERENCES employee_devices(id),
    action VARCHAR(50), -- 'register', 'check_in', 'check_out', 'failed_attempt', 'block', 'unblock'
    status VARCHAR(50), -- 'success', 'failed'
    reason TEXT,
    metadata JSONB, -- {face_score, attempt_number, error_type}
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Task 5.4: Anomaly Detection Queries
```sql
-- Query untuk mendeteksi anomali
- Multiple devices per employee in 1 day
- Face confidence < 80%
- Impossible travel (two check-ins at different locations < 15 min)
- Failed verification attempts trend
- New device sudden use without prior testing
```

### ✅ Success Criteria Phase 5:
- [ ] Rate limiting working
- [ ] Liveness detection reducing false positives
- [ ] Audit log capturing all events
- [ ] Anomaly queries returning accurate results

---

## 🧪 PHASE 6: Testing & QA (Week 9)

### Task 6.1: Unit Tests
```
- Device registration flow
- Face embedding comparison
- TOTP generation & verification
- Biometric data saving to database
- Rate limiting logic
```

### Task 6.2: Integration Tests
```
- Android → API → Database
- iOS → API → Database
- Web → API → Database
- Device approval workflow
- Attendance audit consistency
```

### Task 6.3: UAT (User Acceptance Testing)
```
Android Team (5-10 employees):
- Register devices
- Daily check-in/check-out
- Test face recognition accuracy
- Test failure scenarios
- Feedback collection

iOS Team (5-10 employees):
- Register TOTP
- Daily check-in/check-out
- Test TOTP validity
- Test backup codes
- Feedback collection

Admin Team (2-3 people):
- Manage devices
- Monitor audit logs
- Test anomaly detection
- Block suspicious devices
```

### Task 6.4: Performance Testing
```
- Load test: 500+ concurrent check-ins
- Face embedding extraction time: < 3 seconds
- TOTP verification time: < 100ms
- API response time: < 500ms
- Database query time: < 1 second
```

### ✅ Success Criteria Phase 6:
- [ ] All unit tests passing (95%+ coverage)
- [ ] All integration tests passing
- [ ] UAT completed with positive feedback
- [ ] Performance metrics within acceptable range

---

## 🚀 PHASE 7: Deployment (Week 10a)

### Task 7.1: Production Database
```
1. Backup existing production database
2. Run database migration scripts:
   - database-setup-step2-migrate-existing.sql
   - database-setup-step3-rls-biometric.sql
   - database-setup-step4-indexes-biometric.sql
   - database-setup-step5-audit-log.sql
3. Verify all tables & indexes
4. Test RLS policies
```

### Task 7.2: Mobile App Deployment
```
Android:
- Build signed APK
- Upload to Google Play Store
- Set as staged rollout (10% → 25% → 50% → 100%)
- Monitor crash reports & user feedback

iOS:
- Build signed IPA
- Submit to App Store (review ~5 days)
- TestFlight beta for selected users (1 week)
- Release to App Store
```

### Task 7.3: Web Dashboard Deployment
```
1. Build production bundle
2. Deploy to production server
3. Setup CDN caching
4. Verify all API endpoints
5. Test admin access & permissions
```

### Task 7.4: Monitoring Setup
```
- Setup alerts for biometric failures
- Monitor database performance
- Track API response times
- Alert on anomalies
- Setup logging & tracing
```

### ✅ Success Criteria Phase 7:
- [ ] Database deployed without issues
- [ ] Mobile apps in app stores
- [ ] Web dashboard live
- [ ] Monitoring active
- [ ] Rollback plan ready

---

## 📚 PHASE 8: Documentation & Training (Week 10b)

### Task 8.1: Employee Onboarding Guide
**File**: `EMPLOYEE_BIOMETRIC_ONBOARDING.md`
```
- How to register device
- How to use face recognition (Android)
- How to use TOTP (iOS)
- Troubleshooting common issues
- FAQ
```

### Task 8.2: Admin Documentation
**File**: `ADMIN_BIOMETRIC_MANAGEMENT.md`
```
- How to manage devices
- How to block/unblock devices
- How to interpret audit logs
- How to respond to alerts
- Security best practices
```

### Task 8.3: Troubleshooting Guide
**File**: `BIOMETRIC_TROUBLESHOOTING.md`
```
- Face recognition not working
- TOTP code not accepted
- Device registration issues
- Geo-location problems
- Contact support
```

### Task 8.4: Training Sessions
```
1. Admin team training (2 hours)
   - Device management
   - Monitoring & alerts
   - Security protocols

2. Employee info session (30 min)
   - How to use new system
   - What to expect
   - Why security matters

3. IT support training (1 hour)
   - Common issues
   - Troubleshooting steps
   - Escalation procedures
```

### ✅ Success Criteria Phase 8:
- [ ] All documentation completed
- [ ] Training sessions conducted
- [ ] Employee feedback incorporated
- [ ] Support team confident
- [ ] Continuous improvement plan in place

---

## 📊 METRICS & SUCCESS INDICATORS

| Metric | Target | Current |
|--------|--------|---------|
| Face recognition accuracy (Android) | 95%+ | - |
| TOTP verification success rate | 99%+ | - |
| Avg check-in time | < 30 sec | - |
| System uptime | 99.9% | - |
| User satisfaction (UAT) | 4.0+/5.0 | - |
| Fraud detection rate | 80%+ | - |
| False positive rate | < 5% | - |

---

## 🔴 RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Face recognition accuracy <90% | High | Use multiple capture angles, liveness detection |
| Database performance degradation | High | Setup indexes, optimize queries, test load |
| iOS App Store rejection | High | Prepare detailed documentation, follow guidelines |
| Employee resistance | Medium | Clear communication, training, incentives |
| Security vulnerabilities | High | Penetration testing, code review, bug bounty |

---

## 📞 SUPPORT & ESCALATION

**Issues**:
- Technical issues → IT Support
- Face recognition failures → Biometric vendor support
- Database issues → DBA team
- Security issues → Security team

**Escalation**: After 24h unresolved → Project manager → Director

---

## ✅ NEXT STEPS (Immediate)

1. ✅ **TODAY**: Approve strategy
2. ⏳ **TOMORROW**: Start Phase 1 (run database scripts)
3. ⏳ **DAY 3-5**: Complete Phase 1, start Phase 2
4. ⏳ **WEEK 2**: First dev build for testing

**Questions?** Schedule kickoff meeting.

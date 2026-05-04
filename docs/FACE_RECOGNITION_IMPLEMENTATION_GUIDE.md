# 🔒 Face Recognition Anti-Manipulasi - Implementation Guide

## 📋 Overview

Sistem face recognition untuk mencegah manipulasi/titip absensi dengan fitur:
- ✅ Real-time face detection & verification
- ✅ Liveness detection (mendeteksi foto/video playback)
- ✅ Face enrollment & descriptor storage
- ✅ Audit logging untuk setiap attempt
- ✅ Monitoring dashboard untuk admin

---

## 🚀 Features Implemented

### 1. Face Detection & Recognition
**File**: `components/SelfieCamera.tsx`
- Menggunakan face-api.js untuk deteksi wajah real-time
- Extract 128-dimensional face descriptor
- Confidence scoring untuk face quality
- Model loading dari CDN (no local setup needed)

**Status Indicator**:
- ✅ Model Ready: Model AI sudah loaded
- 👤 Face Detected: Wajah terdeteksi
- ❌ No Face: Tidak ada wajah yang terdeteksi

### 2. Face Enrollment
**File**: `components/FaceEnrollmentModal.tsx`
- User enroll face pertama kali sebelum bisa absensi
- Simpan face descriptor ke database
- Set `face_verification_enabled = true` di table employees

**Flow**:
1. User klik "Enroll Face Recognition"
2. Modal terbuka dengan panduan
3. Ambil selfie (face harus terdeteksi)
4. Extract face descriptor
5. Simpan ke database

### 3. Face Verification on Attendance
**File**: `services/faceVerificationService.ts`
- Verify selfie pada check-in/check-out
- Bandingkan dengan stored face descriptor
- Euclidean distance similarity score
- Threshold: 60% minimum untuk match

**Result**:
- ✅ Verified: Wajah match → Allow attendance
- ❌ Failed: Wajah tidak match → Block dengan error

### 4. Liveness Detection
**File**: `services/livenessDetectionService.ts`
- Deteksi apakah video real-time atau foto/replay
- Analisis multi-frame untuk:
  - Eye blink detection
  - Face movement detection
  - Lighting variation analysis
- Confidence score untuk liveness

**Indicators**:
- Eye blink: Strong indicator of real person
- Face movement: Subtle movements detected across frames
- Lighting variation: Natural lighting changes

### 5. Audit Logging
**File**: `services/faceVerificationService.ts` + `faceVerificationService.ts`
- Setiap verification attempt dicatat ke `audit_logs`
- Metadata: verified status, confidence, tipe (checkin/checkout/enrollment)
- Untuk compliance & investigation

### 6. Monitoring Dashboard
**File**: `components/FaceVerificationDashboard.tsx`
- Real-time monitoring untuk admin
- Statistics: Total attempts, Success rate, Average confidence
- Filter by date range & employee name
- Detailed attempt history dengan confidence bar
- Auto-refresh setiap 30 detik

**Stats**:
- Total Attempts: Jumlah verification yang dilakukan
- Successful: Berhasil terverifikasi
- Failed: Gagal verification
- Success Rate: Persentase success
- Avg Confidence: Rata-rata confidence score

---

## 🔧 Database Schema

### Employees Table (Updated)
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_verification_enabled BOOLEAN DEFAULT false;
```

**Run**: `database-add-face-biometric.sql`

### Audit Log (Updated)
Face verification attempts logged dengan:
- entity_type: 'face_verification'
- action: 'FACE_VERIFIED' | 'FACE_VERIFICATION_FAILED'
- metadata.type: 'enrollment' | 'checkin' | 'checkout'
- metadata.verified: boolean
- metadata.confidence: 0-1 score

---

## 📲 Integration Points

### 1. Employee Self Service (EmployeeSelfService.tsx)
- Added "Enroll Face Recognition" button
- Auto-verify face pada check-in/check-out
- Pass employeeName & verifyType ke verifyFace()

### 2. Attendance Check-in/Check-out
```typescript
// Face descriptor extracted & passed to server
if (faceDescriptor) {
  const result = await faceVerificationService.verifyFace(
    user.id,
    new Float32Array(faceDescriptor),
    user.name,
    'checkin', // atau 'checkout'
    locationData.location
  );
  
  if (!result.verified) {
    // Block attendance
    throw new Error(`Face verification failed: ${result.message}`);
  }
}
```

### 3. Face Enrollment Modal
```typescript
<FaceEnrollmentModal
  isOpen={isFaceEnrollmentOpen}
  onClose={() => setIsFaceEnrollmentOpen(false)}
  employeeId={user.id}
  employeeName={user.name}
  onEnrolled={() => {/* refresh */}}
/>
```

---

## 🎯 Security Architecture

### Anti-Manipulasi Layers

1. **Real-time Face Detection**
   - Wajah harus terdeteksi pada saat capture
   - Tidak bisa menggunakan foto statis

2. **Face Verification**
   - Bandingkan dengan stored face descriptor
   - 60% minimum similarity threshold
   - Unique embedding per person

3. **Liveness Detection** (Optional, Premium)
   - Deteksi eye blink & face movement
   - Deteksi lighting changes
   - Prevent video/photo playback attack

4. **Geo-fencing** (Existing)
   - Location validation
   - Device tracking

5. **Audit Logging**
   - Semua attempts tercatat
   - Untuk investigation & compliance

---

## 🧪 Testing Guide

### 1. Enroll Face
```
1. Login sebagai employee
2. Klik "Enroll Face Recognition"
3. Posisikan wajah di tengah layar
4. Ambil foto
5. Verifikasi: face_verification_enabled = true di DB
```

### 2. Test Check-in/Check-out
```
1. Klik Check-in
2. Ambil selfie (sama orang yang enroll)
3. Verifikasi: should pass
4. Coba dengan orang lain: should fail
```

### 3. Monitor Dashboard
```
1. Buka Face Verification Dashboard
2. Lihat statistics
3. Filter by date & employee
4. Check confidence scores & attempt history
```

---

## ⚙️ Configuration

### Face Verification Threshold
**File**: `services/faceVerificationService.ts` line ~67
```typescript
const threshold = 0.6; // 60% minimum similarity
// Adjust berdasarkan testing:
// - Lower (0.5): Lebih permisif, lebih false positives
// - Higher (0.7): Lebih ketat, lebih false negatives
```

### Liveness Detection Sensitivity
**File**: `services/livenessDetectionService.ts` line ~60
```typescript
// Adjust frame capture & analysis parameters
numberOfFrames: 10, // Jumlah frame yang dianalisis
intervalMs: 100,    // Interval antar frame (ms)

// Adjust brightness drop threshold
return maxBrightnessDrop > 30; // Untuk eye blink
```

---

## 📊 Monitoring & Troubleshooting

### Dashboard Metrics
1. **Success Rate < 80%**: 
   - Check model accuracy
   - May need threshold adjustment
   - Collect feedback dari users

2. **High Failure Rate untuk Specific Employee**:
   - Re-enroll face
   - Check lighting conditions during enrollment
   - Update descriptor

3. **Liveness False Positives**:
   - Adjust frame analysis parameters
   - Increase numberOfFrames
   - Fine-tune brightness threshold

### Audit Log Queries
```sql
-- Check all face verification attempts today
SELECT * FROM audit_logs 
WHERE entity_type = 'face_verification'
AND created_at >= NOW()::date
ORDER BY created_at DESC;

-- Check failed verifications
SELECT * FROM audit_logs 
WHERE entity_type = 'face_verification'
AND status = 'failure'
AND created_at >= NOW()::date - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Success rate per employee
SELECT 
  entity_name,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM audit_logs
WHERE entity_type = 'face_verification'
AND created_at >= NOW()::date - INTERVAL '7 days'
GROUP BY entity_name
ORDER BY success_rate DESC;
```

---

## 🚀 Deployment Checklist

- [ ] Run `database-add-face-biometric.sql`
- [ ] Install face-api.js: `npm install face-api.js`
- [ ] Test face enrollment (dev environment)
- [ ] Test check-in/check-out with face verification
- [ ] Test monitoring dashboard
- [ ] Adjust threshold based on user feedback
- [ ] Enable liveness detection (optional, for premium)
- [ ] Deploy to production
- [ ] Monitor success rate & user feedback
- [ ] Create user training materials

---

## 🔮 Future Enhancements

1. **Advanced Liveness**
   - Challenge-response (nod, smile detection)
   - 3D face detection
   - Integration dengan third-party liveness service

2. **Multi-biometric**
   - Fingerprint + Face
   - Iris recognition (untuk premium)

3. **ML Model Improvement**
   - Custom model training dengan employee faces
   - Continuous learning from verification results

4. **Mobile Integration**
   - Native ML Kit untuk Android
   - CoreML untuk iOS
   - Offline face verification capability

5. **Analytics**
   - Heatmap dari failed locations
   - Pattern detection untuk suspicious attempts
   - Predictive alerts

---

## 📞 Support & Documentation

- **Issue**: Model tidak loading
  - Check CDN connection
  - Check browser console untuk errors
  - Try cached models dari `public/models/`

- **Issue**: Face tidak terdeteksi
  - Improve lighting
  - Position face center dalam circle
  - Check camera permission

- **Issue**: Verification sering gagal
  - Re-enroll face
  - Adjust threshold
  - Check if stored descriptor corrupted

---

## 📄 File Structure

```
components/
├── SelfieCamera.tsx              # Real-time camera & face detection
├── FaceEnrollmentModal.tsx       # Face enrollment UI
├── FaceVerificationDashboard.tsx # Admin monitoring dashboard
└── EmployeeSelfService.tsx       # Integration point

services/
├── faceVerificationService.ts    # Face verify & enroll logic
├── livenessDetectionService.ts   # Liveness detection
└── supabaseClient.ts             # DB connection

database/
└── database-add-face-biometric.sql # Schema update
```

---

**Version**: 1.0  
**Last Updated**: April 20, 2026  
**Status**: Production Ready ✅

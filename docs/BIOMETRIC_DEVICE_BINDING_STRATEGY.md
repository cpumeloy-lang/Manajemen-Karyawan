## Strategi Anti-Manipulasi Absensi: Device Binding & Biometric

### Arsitektur Keamanan

```
Android (Rekomendasi)          iOS (Interim)
├─ Face Recognition           ├─ Face Recognition*
├─ Fingerprint                ├─ Verification Code
├─ Device ID Binding          ├─ TOTP (Time-based OTP)
├─ Hardware Fingerprint       └─ Device UUID Tracking
└─ Geo-location              
    (*iOS Face Recognition membutuhkan approval dari Apple)
```

---

## A. Android Implementation

### 1. Face Recognition + Device Binding

**Library yang digunakan:**
```
- ml-kit (Google ML Kit): Face Detection
- face_recognition.js: Face Embedding
- react-native-device-info: Device ID
- react-native-geolocation: Geo-location
```

**Flow Absensi Android:**

```
1. Employee membuka aplikasi mobile (Android)
   ↓
2. App membaca Device ID & Hardware Fingerprint
   ↓
3. App memverifikasi device terdaftar di database
   ├─ Jika tidak terdaftar → Tampilkan "Device belum didaftarkan"
   └─ Jika terdaftar → Lanjut ke step 4
   ↓
4. Tampilkan face verification screen
   ├─ Capture selfie real-time
   ├─ Extract face embedding menggunakan ML Kit
   ├─ Bandingkan dengan face_data yang tersimpan di DB
   └─ Confidence threshold: 95%+
   ↓
5. Jika face match → Simpan attendance dengan biometric_verified = TRUE
   └─ Jika gagal → Tampilkan error dan log attempt
```

**Database Structure:**
```sql
-- employee_devices
┌─ id (UUID)
├─ employee_id (Foreign Key)
├─ device_id (IMEI/Android ID)
├─ device_name ("Samsung Galaxy A12")
├─ platform ("Android")
├─ device_fingerprint (Hardware hash)
├─ face_data (JSON: face embedding)
├─ biometric_enabled (TRUE)
└─ is_primary (TRUE/FALSE)

-- attendance
┌─ device_id (Foreign Key → employee_devices)
├─ face_verification_check_in (JSON: {confidence, verified_at, image_hash})
├─ face_match_score_check_in (0.95)
├─ biometric_type ("face")
├─ biometric_verified (TRUE)
└─ latitude/longitude (geo-location)
```

---

## B. iOS Implementation (Interim Solution)

Karena iOS memiliki batasan untuk face recognition third-party dan memerlukan App Store approval khusus, gunakan solusi interim:

### 1. Verification Code (TOTP-based)

**Flow Absensi iOS (Sementara):**

```
1. Employee membuka aplikasi mobile (iOS)
   ↓
2. App membaca Device UUID (berbeda dengan IMEI Android)
   ↓
3. App memverifikasi device terdaftar
   ├─ Jika tidak terdaftar → Tampilkan "Device belum didaftarkan"
   └─ Jika terdaftar → Lanjut ke step 4
   ↓
4. Tampilkan verification code input screen
   ├─ Generate TOTP (Time-based One-Time Password)
   │  └─ Shared secret tersimpan di server + local device
   ├─ User input 6-digit code
   ├─ Verify code (valid 30 detik)
   └─ Jika valid → Lanjut ke step 5
   ↓
5. Tambahan security layer:
   ├─ Geo-location verification (harus di radius kantor)
   ├─ Device timezone check
   └─ Network fingerprinting (IP range, WiFi SSID)
   ↓
6. Simpan attendance dengan biometric_type = "totp"
```

**Alternatif untuk iOS:**
- **Verification Code via Email/SMS**: Admin mengirim code, employee input
- **Push Notification Approval**: Admin approve check-in dari dashboard
- **Apple Biometric (Future)**: Gunakan BiometricPrompt iOS saat approved

---

## C. Database Schema untuk Device Binding

```sql
-- Tabel employee_devices (sudah ditambahkan ke database-setup-step1.sql)
CREATE TABLE public.employee_devices (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id),
    device_id VARCHAR(255) UNIQUE, -- IMEI (Android) atau UUID (iOS)
    device_name VARCHAR(255), -- "Samsung Galaxy A12" atau "iPhone 13"
    platform VARCHAR(50) CHECK (platform IN ('Android', 'iOS')),
    device_fingerprint VARCHAR(255), -- Hardware identifier hash
    face_data JSONB, -- Face embedding (Android only, NULL untuk iOS)
    biometric_enabled BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    status VARCHAR(50) CHECK (status IN ('Active', 'Inactive', 'Blocked')),
    UNIQUE(employee_id, device_id)
);

-- Tabel attendance dengan biometric fields
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY,
    employee_id UUID REFERENCES employees(id),
    device_id UUID REFERENCES employee_devices(id),
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    -- Biometric verification fields
    face_verification_check_in JSONB, -- {confidence, verified_at, image_hash}
    face_match_score_check_in DECIMAL(3,2), -- 0.00-1.00
    biometric_type VARCHAR(50) CHECK (
        biometric_type IN ('face', 'fingerprint', 'iris', 'code', 'totp', 'manual')
    ),
    biometric_verified BOOLEAN DEFAULT FALSE,
    -- Geo-location & location tracking
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    location VARCHAR(255),
    -- Audit trail
    status VARCHAR(50),
    source VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## D. Implementation Roadmap

### Phase 1: Device Registration (Week 1-2)
- [ ] Add employee_devices table to database
- [ ] Create device registration flow (mobile app)
- [ ] Generate device fingerprint
- [ ] Store device binding in database

### Phase 2: Android - Face Recognition (Week 3-4)
- [ ] Integrate Google ML Kit
- [ ] Implement face capture & verification
- [ ] Store face embeddings
- [ ] Test with real employees

### Phase 3: iOS - TOTP (Week 5-6)
- [ ] Implement TOTP generation (library: `speakeasy` atau `otplib`)
- [ ] Implement verification code input
- [ ] Add admin verification dashboard
- [ ] Deploy to TestFlight

### Phase 4: Enhanced Security (Week 7+)
- [ ] Geo-fencing enforcement
- [ ] Device blacklist/whitelist
- [ ] Anomaly detection (unusual login patterns)
- [ ] Device rotation alerts

---

## E. Security Considerations

| Feature | Android | iOS |
|---------|---------|-----|
| Device Binding | ✅ IMEI + Hardware Hash | ✅ UUID + Device Token |
| Face Recognition | ✅ ML Kit + Face Embedding | ⚠️ Interim: TOTP |
| Fingerprint | ✅ Supported | ✅ Supported (future) |
| Geo-location | ✅ Required | ✅ Required |
| Anti-replay | ✅ Timestamp + Nonce | ✅ TOTP 30s window |
| Offline Support | ✅ Local cache | ✅ Local cache |

---

## F. Implementation Details untuk Android

### Face Recognition Setup:
```javascript
// mobile-absensi/src/services/biometricService.ts

import { VisionCamera } from 'react-native-vision-camera';
import MLKit from '@react-native-ml-kit/face-detection';
import { FaceDetection } from 'react-native-face-detection';

export const captureFaceEmbedding = async () => {
  const image = await camera.takeSnapshot();
  const faces = await MLKit.detectFaces(image);
  
  if (faces.length === 0) throw new Error('Wajah tidak terdeteksi');
  if (faces.length > 1) throw new Error('Hanya satu wajah yang diizinkan');
  
  const faceEmbedding = await FaceDetection.getFaceEmbedding(faces[0]);
  return faceEmbedding;
};

export const verifyFace = async (
  capturedEmbedding: number[],
  storedEmbedding: number[]
) => {
  const distance = calculateEuclideanDistance(capturedEmbedding, storedEmbedding);
  const confidence = 1 - (distance / MAX_DISTANCE);
  
  return {
    verified: confidence >= 0.95,
    confidence,
    distance
  };
};
```

### Device Binding Setup:
```javascript
// mobile-absensi/src/services/deviceService.ts

import DeviceInfo from 'react-native-device-info';
import { supabase } from '../config/supabase';

export const registerDevice = async (employeeId: string, faceEmbedding: number[]) => {
  const deviceId = await DeviceInfo.getUniqueId(); // IMEI atau Android ID
  const deviceName = await DeviceInfo.getModel(); // "Samsung Galaxy A12"
  const fingerprint = await DeviceInfo.getDeviceId(); // Hardware hash
  
  const { data, error } = await supabase
    .from('employee_devices')
    .insert({
      employee_id: employeeId,
      device_id: deviceId,
      device_name: deviceName,
      platform: 'Android',
      device_fingerprint: fingerprint,
      face_data: faceEmbedding, // Store as JSONB
      is_primary: true
    });
  
  if (error) throw error;
  return data;
};
```

---

## G. Implementation Details untuk iOS (TOTP)

### TOTP Setup:
```javascript
// mobile-absensi/src/services/totpService.ts

import OTPAuth from 'otpauth';

export const generateTOTPSecret = () => {
  const totp = new OTPAuth.TOTP({
    issuer: 'HRMS Pro',
    label: `HRMS Pro (${new Date().toISOString().split('T')[0]})`,
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  });
  
  return {
    secret: totp.secret.base32,
    token: totp.generate()
  };
};

export const verifyTOTPToken = (secret: string, token: string) => {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  
  return totp.validate({ token, window: 1 }) !== null; // window=1 memungkinkan 60s tolerance
};
```

---

## H. Monitoring & Anti-Manipulation

**Deteksi Fraud:**
```sql
-- Query untuk deteksi suspicious attendance
SELECT 
    employee_id,
    COUNT(*) as check_in_count,
    COUNT(CASE WHEN biometric_verified = FALSE THEN 1 END) as unverified_count,
    COUNT(CASE WHEN biometric_type = 'totp' THEN 1 END) as totp_count,
    MIN(created_at) as first_check_in,
    MAX(created_at) as last_check_in,
    AVG(face_match_score_check_in) as avg_face_confidence
FROM attendance
WHERE DATE(date) = CURRENT_DATE
GROUP BY employee_id
HAVING 
    COUNT(CASE WHEN biometric_verified = FALSE THEN 1 END) > 3
    OR AVG(face_match_score_check_in) < 0.80
ORDER BY unverified_count DESC;
```

---

## I. Kesimpulan

✅ **Android**: Pakai face recognition + device binding (maksimal security)
⚠️ **iOS**: Pakai TOTP + device binding (interim, siap upgrade ke Face ID)

Kedua platform akan tercatat di database dengan:
- Device binding yang unik
- Biometric verification status
- Audit trail lengkap
- Geo-location tracking

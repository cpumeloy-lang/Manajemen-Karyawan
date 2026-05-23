import { useState, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord, EmployeeSchedule, ShiftDefinition } from '../types.ts';
import { faceVerificationService, type FaceVerificationResult } from '../services/faceVerificationService.ts';
import { uploadAttendancePhoto } from '../services/attendancePhotoService.ts';

interface PendingCheckIn {
    tanggal: string;
    clockIn: string;
    location: string;
    latitude?: number;
    longitude?: number;
}

interface UseESSAttendanceProps {
    user: Employee;
    attendanceRecords: AttendanceRecord[];
    onSaveAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<boolean> | boolean;
    activeShiftDefs: ShiftDefinition[];
}

export function useESSAttendance({ user, attendanceRecords, onSaveAttendance, activeShiftDefs }: UseESSAttendanceProps) {
    // Attendance action states
    const [isAttendanceSubmitting, setIsAttendanceSubmitting] = useState(false);
    const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);
    const [pendingCheckIn, setPendingCheckIn] = useState<PendingCheckIn | null>(null);
    const [isLanMode] = useState(true);

    // Verification states
    const [isVerificationFlowOpen, setIsVerificationFlowOpen] = useState(false);
    const [isFaceEnrollmentOpen, setIsFaceEnrollmentOpen] = useState(false);
    const [verificationActionType, setVerificationActionType] = useState<'checkin' | 'checkout'>('checkin');
    const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);
    const [todaySchedule, setTodaySchedule] = useState<EmployeeSchedule | null>(null);

    // Initialize face enrollment check & today's schedule
    useEffect(() => {
        faceVerificationService.hasEnrolledFace(user.id).then(setFaceEnrolled);
        import('../services/scheduleService.ts').then(({ getTodaySchedule }) => {
            getTodaySchedule(user.id).then(setTodaySchedule).catch(() => {});
        });
    }, [user.id]);

    // Date utilities
    const getTodayDate = () => new Date().toISOString().split('T')[0];
    const getNowTime = () => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    const todayDate = getTodayDate();
    const pendingStorageKey = `hrms.pending-attendance.${user.id}`;

    // Geofence configuration
    const officeLat = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LAT || '0');
    const officeLng = Number(import.meta.env.VITE_ATTENDANCE_CENTER_LNG || '0');
    const officeRadiusMeters = Number(import.meta.env.VITE_ATTENDANCE_RADIUS_METERS || '300');
    const isGeofenceConfigured = Number.isFinite(officeLat) && Number.isFinite(officeLng) && officeLat !== 0 && officeLng !== 0;

    // Server pending record (check-in without check-out today)
    const serverPendingRecord = useMemo(() => {
        return attendanceRecords.find((record) => record.tanggal === todayDate && !record.clockOut) || null;
    }, [attendanceRecords, todayDate]);

    // Today's record
    const todaysRecord = useMemo(() => {
        return attendanceRecords.find((record) => record.tanggal === getTodayDate()) || null;
    }, [attendanceRecords]);

    // Sync pending check-in from server or localStorage
    useEffect(() => {
        if (serverPendingRecord) {
            setPendingCheckIn({
                tanggal: serverPendingRecord.tanggal,
                clockIn: serverPendingRecord.clockIn,
                location: serverPendingRecord.location,
                latitude: serverPendingRecord.latitude,
                longitude: serverPendingRecord.longitude,
            });
            return;
        }
        try {
            const raw = localStorage.getItem(pendingStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.tanggal && parsed?.clockIn) {
                setPendingCheckIn(parsed);
            }
        } catch {}
    }, [pendingStorageKey, serverPendingRecord]);

    const persistPendingCheckIn = (value: PendingCheckIn | null) => {
        setPendingCheckIn(value);
        try {
            if (value) {
                localStorage.setItem(pendingStorageKey, JSON.stringify(value));
            } else {
                localStorage.removeItem(pendingStorageKey);
            }
        } catch {}
    };

    // Location resolution
    const resolveCurrentLocation = async (): Promise<{ location: string; latitude?: number; longitude?: number }> => {
        if (!('geolocation' in navigator)) {
            return { location: 'Portal Mobile (lokasi tidak tersedia)' };
        }
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const latitude = Number(position.coords.latitude.toFixed(6));
                    const longitude = Number(position.coords.longitude.toFixed(6));
                    resolve({
                        location: `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                        latitude,
                        longitude,
                    });
                },
                () => {
                    resolve({ location: 'Portal Mobile (lokasi gagal dideteksi)' });
                },
                { enableHighAccuracy: false, timeout: 7000, maximumAge: 30000 }
            );
        });
    };

    // Attendance summary calculation (isLate, overtimeHours)
    const calculateAttendanceSummary = (clockIn: string, clockOut: string) => {
        const shiftDef = activeShiftDefs.find(s => s.name === (todaySchedule?.shift_name || user.shift));
        const shiftStartStr = (todaySchedule && !todaySchedule.is_off_day && todaySchedule.shift_start_time)
            ? todaySchedule.shift_start_time
            : (shiftDef?.startTime || '08:00');
        const shiftEndStr = (todaySchedule && !todaySchedule.is_off_day && todaySchedule.shift_end_time)
            ? todaySchedule.shift_end_time
            : (shiftDef?.endTime || '16:00');
        const [startH, startM] = shiftStartStr.split(':').map(Number);
        const [endH, endM] = shiftEndStr.split(':').map(Number);
        const tolerance = shiftDef?.lateToleranceMinutes ?? 15;

        let shiftDuration = (endH + endM / 60) - (startH + startM / 60);
        if (shiftDuration <= 0) shiftDuration += 24;

        const [inHour, inMinute] = clockIn.split(':').map(Number);
        const [outHour, outMinute] = clockOut.split(':').map(Number);

        const isLate = (inHour * 60 + inMinute) > (startH * 60 + startM + tolerance);

        const inValue = inHour + inMinute / 60;
        let outValue = outHour + outMinute / 60;
        if (outValue < inValue) outValue += 24;

        const overtimeHours = Math.max(0, parseFloat((outValue - inValue - shiftDuration).toFixed(2)));
        return { isLate, overtimeHours };
    };

    // ===== HANDLERS =====

    const handleCheckInClick = () => {
        if (faceEnrolled === false) {
            setAttendanceActionError('⚠️ Wajah Anda belum terdaftar. Silakan lakukan Enroll Face Recognition terlebih dahulu di tab Profil.');
            setIsFaceEnrollmentOpen(true);
            return;
        }
        if (todaysRecord && !todaysRecord.clockOut) {
            setAttendanceActionError('Anda sudah melakukan check-in hari ini. Silakan check-out terlebih dahulu.');
            return;
        }
        setAttendanceActionError(null);
        setVerificationActionType('checkin');
        setIsVerificationFlowOpen(true);
    };

    const handleCheckOutClick = () => {
        if (faceEnrolled === false) {
            setAttendanceActionError('⚠️ Wajah Anda belum terdaftar. Silakan lakukan Enroll Face Recognition terlebih dahulu di tab Profil.');
            setIsFaceEnrollmentOpen(true);
            return;
        }
        setAttendanceActionError(null);
        setVerificationActionType('checkout');
        setIsVerificationFlowOpen(true);
    };

    const executeCheckIn = async (
        attendanceData: { photoUrl: string; faceDescriptor?: Float32Array; faceMatchScore?: number; timestamp: string },
        locationData: { location: string; latitude?: number; longitude?: number }
    ) => {
        try {
            const draft = {
                tanggal: getTodayDate(),
                clockIn: getNowTime(),
                clockOut: '',
                location: locationData.location,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                isLate: false,
                overtimeHours: 0,
                status: 'Pending' as const,
                source: 'web-ess' as const,
                notes: 'Check-in melalui Employee Self Service dengan face verification',
                photoUrl: attendanceData.photoUrl || '',
                biometricType: 'face' as const,
                biometricVerified: true,
                faceMatchScoreCheckIn: attendanceData.faceMatchScore,
            };

            const saved = await onSaveAttendance({
                employeeId: user.id,
                tanggal: draft.tanggal,
                clockIn: draft.clockIn,
                clockOut: draft.clockOut,
                location: draft.location,
                latitude: draft.latitude,
                longitude: draft.longitude,
                isLate: draft.isLate,
                overtimeHours: draft.overtimeHours,
                status: draft.status,
                source: draft.source,
                notes: draft.notes,
                photoUrl: draft.photoUrl,
                biometricType: draft.biometricType,
                biometricVerified: draft.biometricVerified,
                faceMatchScoreCheckIn: draft.faceMatchScoreCheckIn,
            });

            if (saved) {
                persistPendingCheckIn(draft);
                setAttendanceActionError(null);
            }
        } catch (error: any) {
            setAttendanceActionError('Gagal memproses check-in. Coba lagi.');
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const executeCheckOut = async (
        attendanceData: { photoUrl: string; faceDescriptor?: Float32Array; faceMatchScore?: number; timestamp: string },
        locationData: { location: string; latitude?: number; longitude?: number }
    ) => {
        try {
            const effectiveDraft = pendingCheckIn || (serverPendingRecord ? {
                tanggal: serverPendingRecord.tanggal,
                clockIn: serverPendingRecord.clockIn,
                location: serverPendingRecord.location,
                latitude: serverPendingRecord.latitude,
                longitude: serverPendingRecord.longitude,
            } : null);

            if (!effectiveDraft) {
                setAttendanceActionError('Tidak ada check-in hari ini. Silakan check-in terlebih dahulu.');
                setIsAttendanceSubmitting(false);
                return;
            }

            if (isLanMode && !navigator.onLine) {
                setAttendanceActionError('Mode LAN aktif: perangkat harus terhubung ke jaringan LAN RS.');
                setIsAttendanceSubmitting(false);
                return;
            }

            const clockOut = getNowTime();
            const summary = calculateAttendanceSummary(effectiveDraft.clockIn, clockOut);

            const success = await onSaveAttendance({
                employeeId: user.id,
                tanggal: effectiveDraft.tanggal,
                clockIn: effectiveDraft.clockIn,
                clockOut,
                location: effectiveDraft.location,
                latitude: effectiveDraft.latitude,
                longitude: effectiveDraft.longitude,
                isLate: summary.isLate,
                overtimeHours: summary.overtimeHours,
                status: summary.isLate ? 'Terlambat' : 'Hadir',
                source: 'web-ess',
                notes: 'Check-out melalui Employee Self Service dengan face verification',
                photoUrl: attendanceData.photoUrl || '',
                biometricType: 'face',
                biometricVerified: true,
                faceMatchScoreCheckOut: attendanceData.faceMatchScore,
            });

            if (success) {
                persistPendingCheckIn(null);
                setAttendanceActionError(null);
            }
        } catch (error: any) {
            setAttendanceActionError('Gagal memproses check-out. Coba lagi.');
        } finally {
            setIsAttendanceSubmitting(false);
        }
    };

    const handleVerificationSuccess = async (result: { photoUrl: string; photoBlob?: Blob; faceDescriptor?: Float32Array; verificationResult: FaceVerificationResult }) => {
        setAttendanceActionError(null);
        setIsAttendanceSubmitting(true);

        try {
            if (!result.verificationResult.verified) {
                setAttendanceActionError(`Verifikasi gagal: ${result.verificationResult.message}`);
                setIsVerificationFlowOpen(false);
                return;
            }

            let photoUrl = '';
            if (result.photoBlob) {
                // [HK-K8] If this throws, the old code left isAttendanceSubmitting stuck at true
                // because the finally in executeCheckIn/Out never ran
                photoUrl = await uploadAttendancePhoto(result.photoBlob, user.id, verificationActionType);
            }

            const locationData = await resolveCurrentLocation();

            const biometricPayload = {
                photoUrl,
                faceDescriptor: result.faceDescriptor,
                faceMatchScore: result.verificationResult.matchScore,
                timestamp: new Date().toISOString(),
            };

            if (verificationActionType === 'checkin') {
                await executeCheckIn(biometricPayload, locationData);
            } else if (verificationActionType === 'checkout') {
                await executeCheckOut(biometricPayload, locationData);
            }

            setIsVerificationFlowOpen(false);
        } catch (error: any) {
            setAttendanceActionError(`Gagal memproses absensi: ${error.message}`);
        } finally {
            // [HK-K8] Ensure submitting state is ALWAYS reset, even if upload/location/execute threw
            setIsAttendanceSubmitting(false);
        }
    };

    return {
        // States
        isAttendanceSubmitting,
        attendanceActionError,
        pendingCheckIn,
        isLanMode,
        isVerificationFlowOpen,
        isFaceEnrollmentOpen,
        verificationActionType,
        faceEnrolled,
        todaySchedule,
        isGeofenceConfigured,
        officeRadiusMeters,
        officeLat,
        officeLng,
        todaysRecord,
        // Setters
        setIsVerificationFlowOpen,
        setIsFaceEnrollmentOpen,
        setAttendanceActionError,
        setFaceEnrolled,
        // Handlers
        handleCheckInClick,
        handleCheckOutClick,
        handleVerificationSuccess,
    };
}

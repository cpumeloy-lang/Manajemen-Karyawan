import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { AttendanceChangeRequest, AttendanceRecord, AttendanceReasonCode, AttendanceRevisionHistory } from '../types';
import { useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { mapAttendanceRecordToUI } from '../utils/dataMapping';
import {
  isSchemaErrorMessage,
  mapAttendanceForDb,
  normalizeAttendanceRecord,
} from '../utils/attendanceSaveMapping';
import { createAuditLog } from '../services/auditLogService';
import { useAuth, useUI } from '../stores/appStore';
import {
  validateOperationalAttendanceAccess,
  validatePersonalAttendanceAccess,
} from '../utils/attendanceAccess';

const ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY = 'hrms.attendance_change_requests_unavailable';
const ATTENDANCE_REVISION_HISTORY_CACHE_KEY = 'hrms.attendance_revision_history_unavailable';

const getCachedUnavailable = (cacheKey: string): boolean => {
  try {
    return localStorage.getItem(cacheKey) === '1';
  } catch {
    return false;
  }
};

const setCachedUnavailable = (cacheKey: string, isUnavailable: boolean): void => {
  try {
    if (isUnavailable) {
      localStorage.setItem(cacheKey, '1');
    } else {
      localStorage.removeItem(cacheKey);
    }
  } catch {
    // Ignore storage access errors.
  }
};

const isAttendanceWorkflowMissingError = (error: any, tableName: string): boolean => {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  const normalizedTable = tableName.toLowerCase();

  return (
    code === 'PGRST205' ||
    (message.includes(normalizedTable) && (message.includes('does not exist') || message.includes('not found'))) ||
    (message.includes('could not find the table') && message.includes(normalizedTable))
  );
};

const isWorkflowUnavailable = (cacheKey: string): boolean => getCachedUnavailable(cacheKey);

export const useAttendanceHandlers = () => {
  const { setAttendanceRecords } = useAppDataActions();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { showSuccess, showError } = useMessageHandlers();

  const saveAttendanceRecord = useCallback(
    async (record: Omit<AttendanceRecord, 'id'>): Promise<{ saved: AttendanceRecord | null; usedSnakeCase: boolean; error?: any }> => {
      const normalizedRecord: any = normalizeAttendanceRecord(record as any);

      const trySave = async (isSnakeCase: boolean) => {
        return supabase
          .from('attendance')
          .upsert(mapAttendanceForDb(normalizedRecord, isSnakeCase), {
            onConflict: isSnakeCase ? 'employee_id,date' : 'employeeId,tanggal',
          })
          .select('*')
          .single();
      };

      let saveResult = await trySave(false);
      let usedSnakeCase = false;

      if (saveResult.error) {
        const errorMessage = String(saveResult.error.message || '').toLowerCase();

        if (errorMessage.includes('duplicate key') || errorMessage.includes('unique')) {
          const updated = await supabase
            .from('attendance')
            .update(mapAttendanceForDb(normalizedRecord, false))
            .eq('employeeId', normalizedRecord.employeeId)
            .eq('tanggal', normalizedRecord.tanggal)
            .select('*');

          if (updated.error) {
            return { saved: null, usedSnakeCase: false, error: updated.error };
          }

          saveResult = { data: (updated.data as any)?.[0] ?? null, error: null } as any;
        } else if (isSchemaErrorMessage(errorMessage)) {
          const fallbackSave = await trySave(true);
          if (fallbackSave.error) {
            const fallbackMessage = String(fallbackSave.error.message || '').toLowerCase();
            if (fallbackMessage.includes('duplicate key') || fallbackMessage.includes('unique')) {
              const updated = await supabase
                .from('attendance')
                .update(mapAttendanceForDb(normalizedRecord, true))
                .eq('employee_id', normalizedRecord.employeeId)
                .eq('date', normalizedRecord.tanggal)
                .select('*');

              if (updated.error) {
                return { saved: null, usedSnakeCase: true, error: updated.error };
              }
              saveResult = { data: (updated.data as any)?.[0] ?? null, error: null } as any;
              usedSnakeCase = true;
            } else {
              return { saved: null, usedSnakeCase: true, error: fallbackSave.error };
            }
          } else {
            saveResult = fallbackSave as any;
            usedSnakeCase = true;
          }
        } else {
          return { saved: null, usedSnakeCase: false, error: saveResult.error };
        }
      }

      const savedRow = saveResult.data ? mapAttendanceRecordToUI(saveResult.data) : null;
      if (!savedRow) {
        return { saved: null, usedSnakeCase, error: 'Data tersimpan tidak valid.' };
      }

      setAttendanceRecords((prev) => {
        const existingIndex = prev.findIndex(
          (r) => r.employeeId === savedRow.employeeId && r.tanggal === savedRow.tanggal
        );

        if (existingIndex === -1) {
          return [savedRow, ...prev];
        }

        return prev.map((item, index) => (index === existingIndex ? savedRow : item));
      });

      return { saved: savedRow, usedSnakeCase };
    },
    [setAttendanceRecords]
  );

  const parseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getOfficeGeoConfig = () => {
    const officeLat = parseNumber(import.meta.env.VITE_ATTENDANCE_CENTER_LAT);
    const officeLng = parseNumber(import.meta.env.VITE_ATTENDANCE_CENTER_LNG);
    const officeRadiusMeters = parseNumber(import.meta.env.VITE_ATTENDANCE_RADIUS_METERS) ?? 300;
    const isGeofenceConfigured =
      officeLat !== null &&
      officeLng !== null &&
      officeLat !== 0 &&
      officeLng !== 0;

    return {
      officeLat,
      officeLng,
      officeRadiusMeters,
      isGeofenceConfigured,
    };
  };

  const calculateDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadius = 6371000;
    return earthRadius * c;
  };

  const fetchCurrentAttendanceSnapshot = useCallback(async (employeeId: string, attendanceDate: string) => {
    const camel = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .eq('tanggal', attendanceDate)
      .maybeSingle();

    if (!camel.error) {
      return camel.data || null;
    }

    const snake = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', attendanceDate)
      .maybeSingle();

    if (snake.error) {
      return null;
    }

    return snake.data || null;
  }, []);

  const handleSavePersonalAttendance = useCallback(
    async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
      try {
        const accessError = validatePersonalAttendanceAccess(
          activePortal,
          authUser?.profile.id,
          (record as any).employeeId || (record as any).employee_id
        );
        if (accessError) {
          showError('Akses ditolak', accessError);
          return false;
        }

        const { saved: savedRow, usedSnakeCase, error } = await saveAttendanceRecord(record);
        if (error || !savedRow) {
          showError('Gagal menyimpan kehadiran', error);
          return false;
        }

        showSuccess(
          usedSnakeCase
            ? 'Data kehadiran berhasil disimpan (mode kompatibilitas).'
            : 'Data kehadiran berhasil disimpan.'
        );

        await createAuditLog({
          action: 'CREATE',
          entityType: 'attendance',
          entityId: savedRow.id,
          entityName: authUser?.profile.nama || 'Self attendance',
          newData: {
            employeeId: savedRow.employeeId,
            tanggal: savedRow.tanggal,
            source: savedRow.source,
          },
          description: `Mencatat absensi pribadi tanggal ${savedRow.tanggal}`,
          portalType: 'personal',
          metadata: { source: 'useAttendanceHandlers' },
        });

        return true;
      } catch (error: any) {
        showError('Gagal menyimpan kehadiran', error);
        return false;
      }
    },
    [activePortal, authUser, saveAttendanceRecord, showSuccess, showError]
  );

  const handleSaveOperationalAttendance = useCallback(
    async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
      try {
        if (isWorkflowUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY)) {
          showError(
            'Workflow approval belum aktif',
            'Tabel workflow absensi belum tersedia. Jalankan database-setup-step6-attendance-governance.sql.'
          );
          return false;
        }

        const accessError = validateOperationalAttendanceAccess(
          activePortal,
          authUser?.profile.role,
          (record as any).employeeId || (record as any).employee_id
        );
        if (accessError) {
          showError('Akses ditolak', accessError);
          return false;
        }

        const reasonCode = ((record as any).reasonCode || '').toString().trim() as AttendanceReasonCode;
        const reasonDetail = ((record as any).reasonDetail || '').toString().trim();

        if (!reasonCode) {
          showError('Validasi gagal', 'Reason code wajib diisi untuk perubahan absensi manual.');
          return false;
        }

        const normalized = normalizeAttendanceRecord({
          ...record,
          source: (record as any).source || 'web-admin',
        } as any);

        const lat = parseNumber((normalized as any).latitude);
        const lng = parseNumber((normalized as any).longitude);
        const { officeLat, officeLng, officeRadiusMeters, isGeofenceConfigured } = getOfficeGeoConfig();

        if (lat === null || lng === null) {
          showError('Validasi lokasi', 'Koordinat GPS wajib disertakan untuk perubahan absensi manual.');
          return false;
        }

        let locationDistanceMeters: number | null = null;
        let locationVerified = false;

        if (isGeofenceConfigured && officeLat !== null && officeLng !== null) {
          locationDistanceMeters = calculateDistanceMeters(lat, lng, officeLat, officeLng);
          locationVerified = locationDistanceMeters <= officeRadiusMeters;
        }

        const currentSnapshot = await fetchCurrentAttendanceSnapshot(normalized.employeeId, normalized.tanggal);

        const makerFingerprint = (record as any).deviceFingerprint ||
          (typeof navigator !== 'undefined' ? navigator.userAgent : 'web-admin-unknown-device');

        const { data: changeRequest, error: requestError } = await supabase
          .from('attendance_change_requests')
          .insert({
            employee_id: normalized.employeeId,
            attendance_date: normalized.tanggal,
            request_type: 'single',
            reason_code: reasonCode,
            reason_detail: reasonDetail || null,
            proposed_data: normalized,
            current_data: currentSnapshot,
            source_portal: 'operational',
            maker_user_id: authUser?.id || null,
            maker_employee_id: authUser?.profile.id || null,
            maker_device_fingerprint: makerFingerprint,
            maker_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            location_lat: lat,
            location_lng: lng,
            location_text: normalized.location || null,
            location_distance_meters: locationDistanceMeters,
            location_verified: locationVerified,
            status: 'pending',
          })
          .select('*')
          .single();

        if (requestError) {
          const msg = String(requestError.message || '').toLowerCase();
          if (msg.includes('attendance_change_requests') || msg.includes('does not exist')) {
            showError(
              'Workflow approval belum aktif',
              'Tabel workflow absensi belum tersedia. Jalankan database-setup-step6-attendance-governance.sql.'
            );
            return false;
          }

          showError('Gagal mengajukan perubahan absensi', requestError);
          return false;
        }

        await createAuditLog({
          action: 'CREATE',
          entityType: 'attendance',
          entityId: changeRequest.id,
          entityName: `Attendance change request ${normalized.employeeId}`,
          newData: {
            employeeId: normalized.employeeId,
            tanggal: normalized.tanggal,
            requestStatus: 'pending',
          },
          description: `Mengajukan perubahan absensi (${reasonCode}) untuk karyawan ${normalized.employeeId} tanggal ${normalized.tanggal}`,
          portalType: 'operational',
          metadata: {
            source: 'useAttendanceHandlers',
            workflow: 'maker-checker',
            requestId: changeRequest.id,
            reasonCode,
            locationVerified,
          },
        });

        showSuccess('Permintaan perubahan absensi dikirim dan menunggu approval checker.');

        return true;
      } catch (error: any) {
        showError('Gagal menyimpan kehadiran', error);
        return false;
      }
    },
    [activePortal, authUser?.id, authUser?.profile.id, authUser?.profile.role, fetchCurrentAttendanceSnapshot, showSuccess, showError]
  );

  const loadPendingAttendanceChangeRequests = useCallback(async (): Promise<AttendanceChangeRequest[]> => {
    if (getCachedUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY)) {
      return [];
    }

    const { data, error } = await supabase
      .from('attendance_change_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (isAttendanceWorkflowMissingError(error, 'attendance_change_requests')) {
        setCachedUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY, true);
      }
      return [];
    }

    setCachedUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY, false);

    return (data || []) as AttendanceChangeRequest[];
  }, []);

  const loadAttendanceRevisionHistory = useCallback(async (): Promise<AttendanceRevisionHistory[]> => {
    if (getCachedUnavailable(ATTENDANCE_REVISION_HISTORY_CACHE_KEY)) {
      return [];
    }

    const { data, error } = await supabase
      .from('attendance_revision_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      if (isAttendanceWorkflowMissingError(error, 'attendance_revision_history')) {
        setCachedUnavailable(ATTENDANCE_REVISION_HISTORY_CACHE_KEY, true);
      }
      return [];
    }

    setCachedUnavailable(ATTENDANCE_REVISION_HISTORY_CACHE_KEY, false);

    return (data || []) as AttendanceRevisionHistory[];
  }, []);

  const handleApproveAttendanceChangeRequest = useCallback(async (requestId: string, reviewNote?: string): Promise<boolean> => {
    try {
      if (isWorkflowUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY)) {
        showError(
          'Workflow approval belum aktif',
          'Tabel workflow absensi belum tersedia. Jalankan database-setup-step6-attendance-governance.sql.'
        );
        return false;
      }

      const { data: request, error: requestError } = await supabase
        .from('attendance_change_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        showError('Gagal approve', requestError || 'Request tidak ditemukan');
        return false;
      }

      if (request.status !== 'pending') {
        showError('Validasi gagal', 'Request sudah diproses sebelumnya.');
        return false;
      }

      if (request.maker_user_id && authUser?.id && request.maker_user_id === authUser.id) {
        showError('Konflik maker-checker', 'Maker tidak boleh meng-approve request miliknya sendiri.');
        return false;
      }

      const proposed = request.proposed_data || {};
      const beforeData = request.current_data || null;
      const { saved: savedRow, error: saveError } = await saveAttendanceRecord(proposed as any);

      if (saveError || !savedRow) {
        showError('Gagal apply perubahan absensi', saveError || 'Data absensi gagal disimpan');
        return false;
      }

      const { error: updateError } = await supabase
        .from('attendance_change_requests')
        .update({
          status: 'approved',
          checker_user_id: authUser?.id || null,
          review_note: reviewNote || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('status', 'pending');

      if (updateError) {
        showError('Gagal update status request', updateError);
        return false;
      }

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'attendance',
        entityId: request.id,
        entityName: `Attendance request ${request.employee_id}`,
        oldData: { status: 'pending' },
        newData: { status: 'approved' },
        description: `Menyetujui perubahan absensi (${request.reason_code}) untuk karyawan ${request.employee_id}`,
        portalType: 'operational',
        metadata: {
          source: 'useAttendanceHandlers',
          workflow: 'maker-checker',
          requestId: request.id,
        },
      });

      showSuccess('Request perubahan absensi berhasil di-approve dan diterapkan.');
      return true;
    } catch (error: any) {
      showError('Gagal approve request absensi', error);
      return false;
    }
  }, [authUser?.id, saveAttendanceRecord, showError, showSuccess]);

  const handleRejectAttendanceChangeRequest = useCallback(async (requestId: string, reviewNote?: string): Promise<boolean> => {
    try {
      if (isWorkflowUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY)) {
        showError(
          'Workflow approval belum aktif',
          'Tabel workflow absensi belum tersedia. Jalankan database-setup-step6-attendance-governance.sql.'
        );
        return false;
      }

      const { data: request, error: requestError } = await supabase
        .from('attendance_change_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        showError('Gagal reject', requestError || 'Request tidak ditemukan');
        return false;
      }

      if (request.status !== 'pending') {
        showError('Validasi gagal', 'Request sudah diproses sebelumnya.');
        return false;
      }

      if (request.maker_user_id && authUser?.id && request.maker_user_id === authUser.id) {
        showError('Konflik maker-checker', 'Maker tidak boleh me-reject request miliknya sendiri.');
        return false;
      }

      const { error: updateError } = await supabase
        .from('attendance_change_requests')
        .update({
          status: 'rejected',
          checker_user_id: authUser?.id || null,
          review_note: reviewNote || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id)
        .eq('status', 'pending');

      if (updateError) {
        showError('Gagal reject request', updateError);
        return false;
      }

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'attendance',
        entityId: request.id,
        entityName: `Attendance request ${request.employee_id}`,
        oldData: { status: 'pending' },
        newData: { status: 'rejected' },
        description: `Menolak perubahan absensi (${request.reason_code}) untuk karyawan ${request.employee_id}`,
        portalType: 'operational',
        metadata: {
          source: 'useAttendanceHandlers',
          workflow: 'maker-checker',
          requestId: request.id,
        },
      });

      showSuccess('Request perubahan absensi berhasil ditolak.');
      return true;
    } catch (error: any) {
      showError('Gagal reject request absensi', error);
      return false;
    }
  }, [authUser?.id, showError, showSuccess]);

  const createBulkAttendanceCorrectionRequests = useCallback(async (records: Array<Omit<AttendanceRecord, 'id'>>, reasonCode: AttendanceReasonCode, reasonDetail?: string): Promise<boolean> => {
    try {
      if (isWorkflowUnavailable(ATTENDANCE_CHANGE_REQUESTS_CACHE_KEY)) {
        showError(
          'Workflow approval belum aktif',
          'Tabel workflow absensi belum tersedia. Jalankan database-setup-step6-attendance-governance.sql.'
        );
        return false;
      }

      if (!records.length) {
        showError('Validasi gagal', 'Data bulk correction tidak boleh kosong.');
        return false;
      }

      const payloads = records.map((raw) => {
        const normalized = normalizeAttendanceRecord({ ...raw, source: (raw as any).source || 'web-admin' } as any);
        return {
          employee_id: normalized.employeeId,
          attendance_date: normalized.tanggal,
          request_type: 'bulk_import',
          reason_code: reasonCode,
          reason_detail: reasonDetail || null,
          proposed_data: normalized,
          current_data: null,
          source_portal: 'operational',
          maker_user_id: authUser?.id || null,
          maker_employee_id: authUser?.profile.id || null,
          maker_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          status: 'pending',
        };
      });

      const { error } = await supabase.from('attendance_change_requests').insert(payloads);
      if (error) {
        showError('Gagal membuat bulk correction request', error);
        return false;
      }

      showSuccess(`Berhasil membuat ${records.length} request bulk correction dan menunggu approval.`);
      return true;
    } catch (error: any) {
      showError('Gagal membuat bulk correction request', error);
      return false;
    }
  }, [authUser?.id, authUser?.profile.id, showError, showSuccess]);

  return {
    handleSavePersonalAttendance,
    handleSaveOperationalAttendance,
    loadPendingAttendanceChangeRequests,
    loadAttendanceRevisionHistory,
    handleApproveAttendanceChangeRequest,
    handleRejectAttendanceChangeRequest,
    createBulkAttendanceCorrectionRequests,
  };
};

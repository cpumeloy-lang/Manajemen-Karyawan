/**
 * Hikvision DS-K1T321MFX Integration Service
 *
 * Sync attendance data from Hikvision device to HRMS Pro via ISAPI.
 * Device config from env vars (VITE_HIKVISION_*).
 *
 * ISAPI Endpoints used:
 *  - GET /ISAPI/AccessControl/AcsEvent?format=json  -> attendance events
 *  - GET /ISAPI/System/deviceInfo?format=json        -> device info
 *  - POST /ISAPI/AccessControl/UserInfo/SetUp        -> push employee data
 *  - POST /ISAPI/Intelligent/FDLib/FaceDataRecord    -> push face template
 */

import { supabase } from './supabaseClient';
import logger from './logger.ts';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export interface HikvisionConfig {
  ip: string;
  port: number;
  username: string;
  password: string;
  deviceLocation: string;
  syncIntervalMinutes: number;
  syncEnabled: boolean;
}

export function getHikvisionConfig(): HikvisionConfig {
  return {
    ip: import.meta.env.VITE_HIKVISION_DEVICE_IP || '',
    port: Number(import.meta.env.VITE_HIKVISION_DEVICE_PORT || '80'),
    username: import.meta.env.VITE_HIKVISION_USERNAME || 'admin',
    password: import.meta.env.VITE_HIKVISION_PASSWORD || '',
    deviceLocation: import.meta.env.VITE_HIKVISION_DEVICE_LOCATION || 'Kantor Utama',
    syncIntervalMinutes: Number(import.meta.env.VITE_HIKVISION_SYNC_INTERVAL_MINUTES || '5'),
    syncEnabled: import.meta.env.VITE_HIKVISION_SYNC_ENABLED === 'true',
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface HikvisionAttendanceEvent {
  employeeNoString: string;   // Employee ID on device
  name: string;               // Employee name on device
  time: string;               // ISO8601 timestamp
  deviceSerial: string;       // Device serial number
  verifyMode?: string;        // face, fingerprint, card, etc.
  matchScore?: number;        // Face match score (0-100)
  pictureName?: string;       // Capture photo filename (if any)
  type?: 'checkIn' | 'checkOut';
}

export interface HikvisionSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  lastSyncTime: string;
}

// ---------------------------------------------------------------------------
// Digest Auth helper (Hikvision uses HTTP Digest Auth)
// ---------------------------------------------------------------------------
function buildBasicAuth(username: string, password: string): string {
  return 'Basic ' + btoa(`${username}:${password}`);
}

function buildBaseUrl(config: HikvisionConfig): string {
  return `http://${config.ip}:${config.port}`;
}

// ---------------------------------------------------------------------------
// API: fetch attendance events from device
// ---------------------------------------------------------------------------
export async function fetchAttendanceEventsFromDevice(
  config: HikvisionConfig,
  startTime: string,
  endTime: string
): Promise<HikvisionAttendanceEvent[]> {
  const url = `${buildBaseUrl(config)}/ISAPI/AccessControl/AcsEvent?format=json`;
  const events: HikvisionAttendanceEvent[] = [];
  
  const maxResults = 500;
  let searchResultPosition = 0;
  let hasMore = true;

  while (hasMore) {
    const body = {
      AcsEventCond: {
        searchID: `HRMS-${Date.now()}`,
        searchResultPosition,
        maxResults,
        major: 5,    // 5 = access control event
        minor: 75,   // 75 = face recognition
        startTime,
        endTime,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildBasicAuth(config.username, config.password),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Hikvision API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawList = data?.AcsEvent?.InfoList ?? [];
    
    for (const item of rawList) {
      events.push({
        employeeNoString: String(item.employeeNoString || item.cardNo || ''),
        name: item.name || '',
        time: item.time || '',
        deviceSerial: item.deviceSerial || config.ip,
        verifyMode: item.currentVerifyMode || 'face',
        matchScore: item.faceMatchScore !== undefined ? item.faceMatchScore : undefined,
        pictureName: item.pictureName || '',
        type: detectEventType(item),
      });
    }

    // [SV-M7] If the device returns fewer events than maxResults, we've reached the end
    const responseStatus = data?.AcsEvent?.responseStatusStrg;
    const isComplete = responseStatus === 'NO MATCH' || rawList.length < maxResults;
    if (isComplete) {
      hasMore = false;
    } else {
      searchResultPosition += rawList.length;
    }
  }

  return events;
}

function detectEventType(item: Record<string, unknown>): 'checkIn' | 'checkOut' {
  // Hikvision minor event code: 75 = check-in, 76 = check-out (device dependent)
  const minor = Number(item.minor);
  if (minor === 76) return 'checkOut';
  return 'checkIn';
}

// ---------------------------------------------------------------------------
// Map Hikvision event → HRMS Pro attendance record
// ---------------------------------------------------------------------------
function mapEventToAttendance(
  event: HikvisionAttendanceEvent,
  config: HikvisionConfig
): Record<string, unknown> {
  const dt = new Date(event.time);
  const tanggal = dt.toISOString().split('T')[0];
  const hhmm = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  const matchScore = typeof event.matchScore === 'number' ? event.matchScore / 100 : null;

  const isCheckOut = event.type === 'checkOut';

  return {
    employee_id: event.employeeNoString,
    tanggal,
    clock_in: isCheckOut ? null : hhmm,
    clock_out: isCheckOut ? hhmm : null,
    location: config.deviceLocation,
    is_late: false,
    overtime_hours: 0,
    status: 'Recorded',
    source: 'hikvision',
    device_id: event.deviceSerial,
    biometric_type: 'face',
    biometric_verified: true,
    face_match_score_check_in: !isCheckOut && matchScore !== null ? matchScore : null,
    face_match_score_check_out: isCheckOut && matchScore !== null ? matchScore : null,
    notes: `Absensi dari device Hikvision (${event.verifyMode})`,
  };
}

// ---------------------------------------------------------------------------
// Lookup UUID from NIK (device employeeNoString → HRMS Pro employee.id)
// ---------------------------------------------------------------------------
async function resolveEmployeeId(nik: string): Promise<string | null> {
  // Try matching by nik field first
  const { data, error } = await (supabase as any)
    .from('employees')
    .select('id')
    .eq('nik', nik)
    .maybeSingle();

  if (!error && (data as any)?.id) return (data as any).id;

  // Fallback: try matching by id directly (in case user entered UUID manually)
  const { data: byId } = await (supabase as any)
    .from('employees')
    .select('id')
    .eq('id', nik)
    .maybeSingle();

  return (byId as any)?.id ?? null;
}

// ---------------------------------------------------------------------------
// Sync: push events to Supabase
// ---------------------------------------------------------------------------
export async function syncAttendanceToSupabase(
  events: HikvisionAttendanceEvent[],
  config: HikvisionConfig
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const event of events) {
    if (!event.employeeNoString) continue;

    try {
      // Resolve NIK → UUID
      const employeeId = await resolveEmployeeId(event.employeeNoString);
      if (!employeeId) {
        failed++;
        errors.push(`[NIK: ${event.employeeNoString}] Karyawan tidak ditemukan di HRMS Pro. Pastikan NIK di device sama dengan field NIK di data karyawan.`);
        continue;
      }

      const record = mapEventToAttendance(event, config);
      record.employee_id = employeeId; // Override dengan UUID yang benar
      const isCheckOut = event.type === 'checkOut';

      if (isCheckOut) {
        // Update existing record's clock_out
        // IMPORTANT: use `employeeId` (UUID resolved from NIK) not `event.employeeNoString` (NIK)
        // Using NIK would cause the filter to never match since the DB stores UUID as employee_id
        const q = supabase.from('attendance') as any;
        const { error } = await q
          .update({
            clock_out: record.clock_out,
            face_match_score_check_out: record.face_match_score_check_out,
          })
          .eq('employee_id', employeeId)
          .eq('tanggal', record.tanggal)
          .is('clock_out', null);

        if (error) throw error;
      } else {
        // Upsert check-in
        const q = supabase.from('attendance') as any;
        const { error } = await q.upsert(record, { onConflict: 'employee_id,tanggal' });

        if (error) throw error;
      }

      synced++;
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${event.employeeNoString}] ${msg}`);
      logger.error('Hikvision sync error', err);
    }
  }

  return { synced, failed, errors };
}

// ---------------------------------------------------------------------------
// Main: full sync cycle
// ---------------------------------------------------------------------------
export async function runHikvisionSync(
  config?: HikvisionConfig,
  hoursBack = 24
): Promise<HikvisionSyncResult> {
  const cfg = config ?? getHikvisionConfig();

  if (!cfg.syncEnabled || !cfg.ip) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['Hikvision sync disabled or device IP not configured'],
      lastSyncTime: new Date().toISOString(),
    };
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000).toISOString();
  const endTime = now.toISOString();

  try {
    const events = await fetchAttendanceEventsFromDevice(cfg, startTime, endTime);
    const result = await syncAttendanceToSupabase(events, cfg);

    return {
      success: true,
      ...result,
      lastSyncTime: now.toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: [msg],
      lastSyncTime: now.toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Scheduler: auto sync every N minutes
// ---------------------------------------------------------------------------
let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startHikvisionAutoSync(
  onResult?: (result: HikvisionSyncResult) => void
): void {
  const cfg = getHikvisionConfig();
  if (!cfg.syncEnabled || !cfg.ip) {
    logger.warn('[Hikvision] Auto-sync skipped: not configured');
    return;
  }

  if (syncTimer) return; // already running

  const intervalMs = cfg.syncIntervalMinutes * 60 * 1000;
  logger.info(`[Hikvision] Auto-sync started`, { intervalMin: cfg.syncIntervalMinutes });

  syncTimer = setInterval(async () => {
    logger.debug('[Hikvision] Running scheduled sync...');
    const result = await runHikvisionSync(cfg, 1); // last 1 hour per tick
    logger.debug('[Hikvision] Sync result', { synced: result.synced, failed: result.failed });
    onResult?.(result);
  }, intervalMs);
}

export function stopHikvisionAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    logger.info('[Hikvision] Auto-sync stopped');
  }
}

// ---------------------------------------------------------------------------
// Device connectivity test
// ---------------------------------------------------------------------------
export async function testHikvisionConnection(
  config?: HikvisionConfig
): Promise<{ connected: boolean; deviceInfo?: Record<string, unknown>; error?: string }> {
  const cfg = config ?? getHikvisionConfig();

  try {
    const response = await fetch(
      `${buildBaseUrl(cfg)}/ISAPI/System/deviceInfo?format=json`,
      {
        method: 'GET',
        headers: { Authorization: buildBasicAuth(cfg.username, cfg.password) },
      }
    );

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { connected: true, deviceInfo: data?.DeviceInfo ?? data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { connected: false, error: msg };
  }
}

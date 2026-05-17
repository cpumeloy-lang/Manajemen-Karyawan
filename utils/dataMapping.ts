/**
 * Data Mapping Utilities
 * Convert between database (snake_case) and UI (camelCase) formats
 */

export const mapEmployeeToDatabase = (data: any) => {
  const {
    // camelCase fields — will be converted to snake_case below
    ktpNumber,
    bpjsKesehatan,
    bpjsKetenagakerjaan,
    maritalStatus,
    emergencyContacts,
    workHistory,
    bankAccount,
    isProfileCompleted,
    isVerified,
    verifiedBy,
    verifiedAt,
    isLocked,
    managedUnitId,
    unitKerjaId,
    // UI-only fields — strip before sending to DB
    compensation,
    documents,
    // These snake_case duplicates come from mapEmployeeFromDatabase spread, must be stripped
    // to avoid sending both camelCase AND snake_case versions simultaneously
    ktp_number: _ktp_number,
    bpjs_kesehatan: _bpjs_kesehatan,
    bpjs_ketenagakerjaan: _bpjs_ketenagakerjaan,
    marital_status: _marital_status,
    emergency_contacts: _emergency_contacts,
    work_history: _work_history,
    bank_account: _bank_account,
    is_profile_completed: _is_profile_completed,
    is_verified: _is_verified,
    verified_by: _verified_by,
    verified_at: _verified_at,
    is_locked: _is_locked,
    managed_unit_id: _managed_unit_id,
    unit_kerja_id: _unit_kerja_id,
    ...rest
  } = data;

  const resolvedUnitKerjaId = unitKerjaId ?? _unit_kerja_id ?? null;

  // Extract salary from compensation object (form state) or use top-level values (from DB load)
  const gajiPokok = compensation?.gajiPokok ?? rest.gajiPokok ?? null;
  const tunjanganProfesi = compensation?.tunjanganProfesi ?? rest.tunjanganProfesi ?? null;

  return {
    ...rest,
    unitKerjaId: resolvedUnitKerjaId,
    user_id: rest.user_id || null,
    gajiPokok,
    tunjanganProfesi,
    ktp_number: ktpNumber ?? _ktp_number,
    bpjs_kesehatan: bpjsKesehatan ?? _bpjs_kesehatan,
    bpjs_ketenagakerjaan: bpjsKetenagakerjaan ?? _bpjs_ketenagakerjaan,
    marital_status: maritalStatus ?? _marital_status,
    emergency_contacts: emergencyContacts ?? _emergency_contacts,
    work_history: workHistory ?? _work_history,
    bank_account: bankAccount ?? _bank_account,
    is_profile_completed: isProfileCompleted ?? _is_profile_completed,
    is_verified: isVerified ?? _is_verified,
    verified_by: verifiedBy ?? _verified_by,
    verified_at: verifiedAt ?? _verified_at,
    is_locked: isLocked ?? _is_locked,
    managed_unit_id: (managedUnitId ?? _managed_unit_id) || null,
  };
};

export const mapEmployeeFromDatabase = (data: any) => {
  return {
    ...data,
    ktpNumber: data.ktp_number,
    bpjsKesehatan: data.bpjs_kesehatan,
    bpjsKetenagakerjaan: data.bpjs_ketenagakerjaan,
    maritalStatus: data.marital_status,
    emergencyContacts: data.emergency_contacts,
    workHistory: data.work_history,
    bankAccount: data.bank_account,
    isProfileCompleted: data.is_profile_completed,
    isVerified: data.is_verified,
    verifiedBy: data.verified_by,
    verifiedAt: data.verified_at,
    isLocked: data.is_locked,
    managedUnitId: data.managed_unit_id ?? data.managedUnitId,
    unitKerjaId: data.unitKerjaId ?? data.unit_kerja_id,
  };
};

/**
 * Attendance record mapping for handling both camelCase and snake_case column names
 */
export const mapAttendanceRecordToUI = (record: any) => ({
  ...record,
  employeeId: record.employeeId ?? record.employee_id ?? '',
  tanggal: record.tanggal ?? record.date ?? '',
  clockIn: record.clockIn ?? record.check_in ?? '',
  clockOut: record.clockOut ?? record.check_out ?? '',
  location: record.location ?? record.lokasi ?? '',
  latitude: record.latitude ?? record.lat ?? undefined,
  longitude: record.longitude ?? record.lng ?? undefined,
  isLate:
    record.isLate ??
    record.is_late ??
    String(record.status || '').toLowerCase() === 'terlambat',
  overtimeHours: Number(record.overtimeHours ?? record.overtime_hours ?? 0),
  status: record.status ?? record.status ?? undefined,
  source: record.source ?? undefined,
  notes: record.notes ?? undefined,
  photoUrl: record.photoUrl ?? record.photo_url ?? undefined,
  deviceId: record.deviceId ?? record.device_id ?? undefined,
  biometricType: record.biometricType ?? record.biometric_type ?? undefined,
  biometricVerified: record.biometricVerified ?? record.biometric_verified ?? undefined,
  faceMatchScoreCheckIn: record.faceMatchScoreCheckIn ?? record.face_match_score_check_in ?? undefined,
  faceMatchScoreCheckOut: record.faceMatchScoreCheckOut ?? record.face_match_score_check_out ?? undefined,
});

export const sortAttendanceByDateDesc = (records: any[]) => {
  return [...records].sort(
    (a, b) =>
      new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime()
  );
};

/**
 * Data Mapping Utilities
 * Convert between database (snake_case) and UI (camelCase) formats
 */

export const mapEmployeeToDatabase = (data: any) => {
  const {
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
    ...rest
  } = data;

  return {
    ...rest,
    ktp_number: ktpNumber,
    bpjs_kesehatan: bpjsKesehatan,
    bpjs_ketenagakerjaan: bpjsKetenagakerjaan,
    marital_status: maritalStatus,
    emergency_contacts: emergencyContacts,
    work_history: workHistory,
    bank_account: bankAccount,
    is_profile_completed: isProfileCompleted,
    is_verified: isVerified,
    verified_by: verifiedBy,
    verified_at: verifiedAt,
    is_locked: isLocked,
    managed_unit_id: managedUnitId,
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
    managedUnitId: data.managed_unit_id,
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
  isLate:
    record.isLate ??
    record.is_late ??
    String(record.status || '').toLowerCase() === 'terlambat',
  overtimeHours: Number(record.overtimeHours ?? record.overtime_hours ?? 0),
});

export const sortAttendanceByDateDesc = (records: any[]) => {
  return [...records].sort(
    (a, b) =>
      new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime()
  );
};

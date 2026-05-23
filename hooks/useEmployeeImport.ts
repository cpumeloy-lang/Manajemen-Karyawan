import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { useAppData, useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import {
  excelDateToIso,
  toSafeString,
  normalizeStatus,
} from '../utils/dateUtils';
import {
  getImportField,
  normalizeImportMaritalStatus,
  shouldSkipExistingEmail,
  validateRequiredImportFields,
  validateImportInternalDuplicates,
  ImportValidationError,
} from '../utils/employeeImportUtils';
import { getAuthHeaders } from '../utils/apiUtils.ts';
import {
  mapEmployeeToDatabase,
  mapEmployeeFromDatabase,
} from '../utils/dataMapping';

export const useEmployeeImport = () => {
  const { employees } = useAppData();
  const { setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const getField = useCallback(getImportField, []);

  const normalizeMaritalStatus = useCallback(normalizeImportMaritalStatus, []);

  const downloadErrorReport = useCallback((errorRows: ImportValidationError[]) => {
    if (errorRows.length === 0) return;

    const reportRows = errorRows.map((item) => ({
      Baris: item.baris,
      Kategori: item.kategori || 'ERROR',
      Nama: item.nama,
      Email: item.email,
      NIK: item.nik,
      Error: item.error,
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 28 },
      { wch: 32 },
      { wch: 18 },
      { wch: 80 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Import');
    XLSX.writeFile(
      workbook,
      `error_report_import_karyawan_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  }, []);

  const checkSchemaSupport = useCallback(async () => {
    try {
      const nikProbe = await supabase
        .from('employees')
        .select('id,nik')
        .limit(1);
      const supportsNik = !nikProbe.error;

      const extendedProbe = await supabase
        .from('employees')
        .select('id,ktp_number')
        .limit(1);
      const supportsExtendedProfileColumns = !extendedProbe.error;

      if (!supportsNik || !supportsExtendedProfileColumns) {
        throw new Error(
          'Schema database belum lengkap untuk import data karyawan full. Jalankan migration kolom NIK dan data lengkap employees terlebih dahulu.'
        );
      }

      return true;
    } catch (error: any) {
      showError('Schema validation gagal', error);
      throw error;
    }
  }, [showError]);

  const fetchUnits = useCallback(async (): Promise<Map<string, string>> => {
    const { data, error } = await supabase.from('units').select('id, nama');
    if (error || !data) return new Map();
    const map = new Map<string, string>();
    (data as any[]).forEach((u) => map.set(String(u.nama).toLowerCase().trim(), u.id));
    return map;
  }, []);

  const fetchExistingEmails = useCallback(async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('email')
      .limit(10000);

    if (error) {
      throw new Error(`Gagal membaca email existing: ${error.message}`);
    }

    return new Set(
      (data || [])
        .map((item: any) => toSafeString(item.email).toLowerCase())
        .filter(Boolean)
    );
  }, []);

  const validateInternalDuplicates = useCallback(
    (importedData: any[]) => validateImportInternalDuplicates(importedData),
    []
  );

  const handleImportEmployees = useCallback(
    async (importedData: any[]): Promise<void> => {
      try {
        // Validate schema
        await checkSchemaSupport();

        // Validate internal duplicates in the import file
        const { errors: duplicateErrors, errorRows: duplicateErrorRows } =
          validateInternalDuplicates(importedData);

        if (duplicateErrors.length > 0) {
          let message =
            'Import dibatalkan karena ditemukan data duplikat di file.\n\n';
          message += `❌ Total error: ${duplicateErrors.length}\n\n`;
          message += `Detail error:\n${duplicateErrors.slice(0, 10).join('\n')}`;
          if (duplicateErrors.length > 10) {
            message += `\n... dan ${duplicateErrors.length - 10} error lainnya`;
          }
          downloadErrorReport(duplicateErrorRows);
          showError('Validasi import gagal', message);
          return;
        }

        // Process rows
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];
        const errorRows: ImportValidationError[] = [];
        const existingEmails = await fetchExistingEmails();
        const unitNameMap = await fetchUnits();
        // [HK-M2] Fetch auth headers ONCE outside the loop.
        // Previously called inside each iteration (N+1 pattern: one getSession() per employee row).
        const authHeaders = await getAuthHeaders();

        for (let i = 0; i < importedData.length; i++) {
          try {
            const row = importedData[i];
            const nama = toSafeString(getField(row, 'Nama', 'nama'));
            const email = toSafeString(getField(row, 'Email', 'email')).toLowerCase();
            const nik = toSafeString(getField(row, 'NIK', 'nik'));
            const telepon = toSafeString(getField(row, 'Telepon', 'telepon'));
            const birthDate = excelDateToIso(getField(row, 'Tanggal_Lahir', 'Tanggal Lahir', 'birthDate', 'Birth Date'));
            const hireDate = excelDateToIso(getField(row, 'Tanggal_Masuk', 'Tanggal Masuk', 'hireDate', 'Hire Date'));
            const status = normalizeStatus(getField(row, 'Status', 'status'));
            const gajiPokok = Number(getField(row, 'Gaji_Pokok', 'Gaji Pokok', 'gajiPokok')) || 0;
            const tunjanganProfesi = Number(getField(row, 'Tunjangan_Profesi', 'Tunjangan Profesi', 'tunjanganProfesi')) || 0;
            const ktpNumber = toSafeString(getField(row, 'KTP', 'KTP_Number', 'ktpNumber'));
            const npwp = toSafeString(getField(row, 'NPWP', 'npwp'));
            const bpjsKesehatan = toSafeString(getField(row, 'BPJS_Kesehatan', 'BPJS Kesehatan', 'bpjsKesehatan'));
            const bpjsKetenagakerjaan = toSafeString(getField(row, 'BPJS_Ketenagakerjaan', 'BPJS Ketenagakerjaan', 'bpjsKetenagakerjaan'));
            const agama = toSafeString(getField(row, 'Agama', 'agama')) || undefined;
            const jabatan = toSafeString(getField(row, 'Jabatan', 'jabatan')) || undefined;
            const departemen = toSafeString(getField(row, 'Departemen', 'departemen')) || undefined;
            const unitKerjaName = toSafeString(getField(row, 'Unit_Kerja', 'Unit Kerja', 'unitKerjaId', 'unitkerja'));
            const unitKerjaId = unitNameMap.get(unitKerjaName.toLowerCase().trim()) || unitKerjaName || null;
            const maritalStatus = normalizeMaritalStatus(getField(row, 'Status_Nikah', 'Status Nikah', 'maritalStatus'));
            const dependents = Number(getField(row, 'Jumlah_Tanggungan', 'Jumlah Tanggungan', 'dependents')) || 0;
            const addressKtp = toSafeString(getField(row, 'Alamat_KTP', 'Alamat KTP'));
            const addressDomisili = toSafeString(getField(row, 'Alamat_Domisili', 'Alamat Domisili'));
            const province = toSafeString(getField(row, 'Provinsi', 'province'));
            const city = toSafeString(getField(row, 'Kota', 'city'));
            const postalCode = toSafeString(getField(row, 'Kode_Pos', 'Kode Pos', 'postalCode'));
            const bankName = toSafeString(getField(row, 'Bank', 'bankName'));
            const accountNumber = toSafeString(getField(row, 'No_Rekening', 'No Rekening', 'accountNumber'));
            const accountHolder = toSafeString(getField(row, 'Nama_Rekening', 'Nama Rekening', 'accountHolder')) || nama;

            // Validate required fields
            const requiredValidation = validateRequiredImportFields(row);
            if (!requiredValidation.valid) {
              const msg = requiredValidation.error;
              errors.push(`Baris ${i + 2}: ${msg}`);
              errorRows.push({
                baris: i + 2,
                nama: requiredValidation.nama,
                email: requiredValidation.email,
                nik,
                error: msg,
              });
              errorCount++;
              continue;
            }

            // Check if unit kerja exists (warn but don't block)
            if (unitKerjaName && !unitKerjaId) {
              const msg = `Unit Kerja "${unitKerjaName}" tidak ditemukan di database (karyawan akan diimport tanpa unit)`;
              errorRows.push({
                baris: i + 2,
                nama,
                email,
                nik,
                kategori: 'WARNING',
                error: msg,
              });
            }

            // Check if email already exists
            if (shouldSkipExistingEmail(existingEmails, email)) {
              const msg = `Email ${email} sudah terdaftar (baris dilewati)`;
              errorRows.push({
                baris: i + 2,
                nama,
                email,
                nik,
                kategori: 'SKIP',
                error: msg,
              });
              skippedCount++;
              continue;
            }

            // Create employee record
            const newEmployee = {
              nik: nik || null,
              nama,
              email,
              telepon,
              jabatan: jabatan || null,
              departemen: departemen || null,
              birthDate: birthDate || null,
              hireDate: hireDate || null,
              status,
              gajiPokok,
              tunjanganProfesi,
              ktpNumber: ktpNumber || null,
              npwp: npwp || null,
              bpjsKesehatan: bpjsKesehatan || null,
              bpjsKetenagakerjaan: bpjsKetenagakerjaan || null,
              agama: agama || null,
              unitKerjaId: unitKerjaId || null,
              maritalStatus,
              dependents,
              address: addressKtp || addressDomisili || province || city || postalCode ? {
                ktp: addressKtp,
                domisili: addressDomisili,
                province,
                city,
                postalCode,
              } : null,
              bankAccount: bankName || accountNumber || accountHolder ? {
                bankName,
                accountNumber,
                accountHolder,
              } : null,
            };

            const profileData = mapEmployeeToDatabase(newEmployee);
            const response = await fetch('/api/employees', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders, // [HK-M2] reuse single token fetched before loop
              },
              body: JSON.stringify({ employeeData: profileData }),
            });

            const result = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(result?.error || 'Gagal mengimpor karyawan');
            }

            const insertedEmployee = result?.data;
            if (!insertedEmployee) {
              throw new Error('Data karyawan tidak berhasil dibuat di server.');
            }

            const employeeWithCompensation = mapEmployeeFromDatabase({
              ...insertedEmployee,
              compensation: {
                gajiPokok: insertedEmployee.gajiPokok || 0,
                tunjanganProfesi: insertedEmployee.tunjanganProfesi || 0,
              },
            });

            setEmployees((prev) => [...prev, employeeWithCompensation]);
            existingEmails.add(email);
            successCount++;
          } catch (rowError: any) {
            const row = importedData[i];
            const msg = rowError.message || 'Gagal memproses baris';

            const normalizedMessage = String(msg).toLowerCase();
            const email = toSafeString(getField(row, 'Email', 'email')).toLowerCase();
            if (
              email &&
              (normalizedMessage.includes('duplicate key') || normalizedMessage.includes('already exists')) &&
              normalizedMessage.includes('email')
            ) {
              errorRows.push({
                baris: i + 2,
                nama: toSafeString(getField(row, 'Nama', 'nama')),
                email,
                nik: toSafeString(getField(row, 'NIK', 'nik')),
                kategori: 'SKIP',
                error: `Email ${email} sudah terdaftar (baris dilewati)`,
              });
              skippedCount++;
              existingEmails.add(email);
              continue;
            }

            errors.push(`Baris ${i + 2}: ${msg}`);
            errorRows.push({
              baris: i + 2,
              nama: toSafeString(getField(row, 'Nama', 'nama')),
              email: toSafeString(getField(row, 'Email', 'email')),
              nik: toSafeString(getField(row, 'NIK', 'nik')),
              kategori: 'ERROR',
              error: msg,
            });
            errorCount++;
          }
        }

        // Show summary
        if (errorCount > 0 || skippedCount > 0) {
          downloadErrorReport(errorRows);
          if (errorCount > 0) {
            const topErrors = errors.slice(0, 5).join('\n');
            showError(
              'Import selesai dengan catatan',
              `${successCount} data berhasil, ${skippedCount} data dilewati (sudah ada), ${errorCount} data gagal.\n\nDetail error utama:\n${topErrors}`
            );
          } else {
            showSuccess(
              `✅ Import selesai. ${successCount} data berhasil ditambahkan, ${skippedCount} data dilewati karena email sudah terdaftar.`
            );
          }
        } else {
          showSuccess(
            `✅ Import berhasil! ${successCount} karyawan telah ditambahkan.`
          );
        }
      } catch (error: any) {
        showError('Gagal mengimport karyawan', error);
        throw error;
      }
    },
    [
      employees,
      setEmployees,
      showSuccess,
      showError,
      checkSchemaSupport,
      fetchExistingEmails,
      validateInternalDuplicates,
      downloadErrorReport,
      getField,
      normalizeMaritalStatus,
      getAuthHeaders,
    ]
  );

  return {
    handleImportEmployees,
  };
};

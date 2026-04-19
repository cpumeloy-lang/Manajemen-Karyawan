import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { AttendanceRecord } from '../types';
import { useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { mapAttendanceRecordToUI } from '../utils/dataMapping';

export const useAttendanceHandlers = () => {
  const { setAttendanceRecords } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleSaveAttendance = useCallback(
    async (record: Omit<AttendanceRecord, 'id'>): Promise<boolean> => {
      try {
        const normalizedRecord: any = {
          ...record,
          employeeId: (record as any).employeeId || (record as any).employee_id,
          tanggal: (record as any).tanggal || (record as any).date,
          clockIn: (record as any).clockIn || (record as any).check_in,
          clockOut: (record as any).clockOut || (record as any).check_out,
        };

        const mapForDb = (isSnakeCase: boolean) => {
          if (!isSnakeCase) return normalizedRecord;

          return {
            ...normalizedRecord,
            employee_id: normalizedRecord.employeeId,
            date: normalizedRecord.tanggal,
            check_in: normalizedRecord.clockIn,
            check_out: normalizedRecord.clockOut,
          };
        };

        const tryInsert = async (isSnakeCase: boolean) => {
          return supabase
            .from('attendance')
            .insert(mapForDb(isSnakeCase))
            .select('*')
            .single();
        };

        const tryUpdate = async (isSnakeCase: boolean) => {
          let query = supabase
            .from('attendance')
            .update(mapForDb(isSnakeCase))
            .eq(isSnakeCase ? 'employee_id' : 'employeeId', normalizedRecord.employeeId)
            .eq(isSnakeCase ? 'date' : 'tanggal', normalizedRecord.tanggal)
            .select('*');

          const { data, error } = await query.limit(1);
          if (error) return { data: null, error };
          return { data: data?.[0] || null, error: null };
        };

        let saveResult = await tryInsert(false);
        let usedSnakeCase = false;

        if (saveResult.error) {
          const errorMessage = String(saveResult.error.message || '').toLowerCase();

          if (errorMessage.includes('duplicate key') || errorMessage.includes('unique')) {
            const updated = await tryUpdate(false);
            if (updated.error) {
              showError('Gagal menyimpan kehadiran', updated.error);
              return false;
            }
            saveResult = { data: updated.data, error: null } as any;
          } else {
            const fallbackInsert = await tryInsert(true);
            if (fallbackInsert.error) {
              const fallbackMessage = String(fallbackInsert.error.message || '').toLowerCase();
              if (fallbackMessage.includes('duplicate key') || fallbackMessage.includes('unique')) {
                const updated = await tryUpdate(true);
                if (updated.error) {
                  showError('Gagal menyimpan kehadiran', updated.error);
                  return false;
                }
                saveResult = { data: updated.data, error: null } as any;
                usedSnakeCase = true;
              } else {
                showError('Gagal menyimpan kehadiran', fallbackInsert.error);
                return false;
              }
            } else {
              saveResult = fallbackInsert as any;
              usedSnakeCase = true;
            }
          }
        }

        const savedRow = saveResult.data ? mapAttendanceRecordToUI(saveResult.data) : null;
        if (!savedRow) return false;

        setAttendanceRecords((prev) => {
          const existingIndex = prev.findIndex(
            (r) => r.employeeId === savedRow.employeeId && r.tanggal === savedRow.tanggal
          );

          if (existingIndex === -1) {
            return [savedRow, ...prev];
          }

          return prev.map((item, index) => (index === existingIndex ? savedRow : item));
        });

        showSuccess(
          usedSnakeCase
            ? 'Data kehadiran berhasil disimpan (mode kompatibilitas).'
            : 'Data kehadiran berhasil disimpan.'
        );
        return true;
      } catch (error: any) {
        showError('Gagal menyimpan kehadiran', error);
        return false;
      }
    },
    [setAttendanceRecords, showSuccess, showError]
  );

  return {
    handleSaveAttendance,
  };
};

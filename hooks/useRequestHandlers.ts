import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { AllRequest, RequestType, RequestStatus, LeaveRequest, Employee } from '../types';
import { useAppData, useAppDataActions, useAuth, useUI } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { canManageOperationalRequests, ensurePortalAccess } from '../services/portalAccessService';
import { createAuditLog } from '../services/auditLogService';

const calculateWorkingDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  let current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const useRequestHandlers = () => {
  const { employees } = useAppData();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { setAllRequests, setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleUpdateRequestStatus = useCallback(
    async (
      requestId: string,
      type: RequestType,
      newStatus: RequestStatus
    ) => {
      try {
        const portalError = ensurePortalAccess(activePortal, 'operational', 'Update status permohonan');
        if (portalError) {
          showError('Akses ditolak', portalError);
          return;
        }

        if (!canManageOperationalRequests(authUser?.profile.role)) {
          showError('Akses ditolak', 'Role Anda tidak memiliki izin untuk memproses permohonan.');
          return;
        }

        const { data: updatedRequest, error } = await supabase
          .from('requests')
          .update({ status: newStatus })
          .eq('id', requestId)
          .select()
          .single();

        if (error) {
          showError('Gagal memperbarui status', error);
          return;
        }

        // If approving leave request, update employee's sisa cuti
        if (
          type === RequestType.Cuti &&
          newStatus === RequestStatus.Approved &&
          updatedRequest
        ) {
          const leaveReq = updatedRequest as LeaveRequest;
          const diffDays = calculateWorkingDays(leaveReq.startDate, leaveReq.endDate);
          const employeeToUpdate = employees.find((emp) => emp.id === leaveReq.employeeId);

          if (employeeToUpdate) {
            const newSisaCuti = (employeeToUpdate.sisaCuti ?? 0) - diffDays;

            // [HK-M1] Guard: prevent sisaCuti from going negative
            if (newSisaCuti < 0) {
              showError(
                'Sisa cuti tidak mencukupi',
                `Karyawan hanya memiliki ${employeeToUpdate.sisaCuti ?? 0} hari cuti tersisa, tetapi permohonan membutuhkan ${diffDays} hari.`
              );
              // Rollback request status back to Pending
              await supabase
                .from('requests')
                .update({ status: RequestStatus.Pending })
                .eq('id', requestId);
              return;
            }

            const { error: empError } = await supabase
              .from('employees')
              .update({ sisaCuti: newSisaCuti })
              .eq('id', employeeToUpdate.id);

            if (!empError) {
              setEmployees((prev) =>
                prev.map((emp) =>
                  emp.id === leaveReq.employeeId ? { ...emp, sisaCuti: newSisaCuti } : emp
                )
              );
            }
          }
        }

        setAllRequests((prev) =>
          prev.map((req) => (req.id === requestId ? { ...req, status: newStatus } : req))
        );

        await createAuditLog({
          action: 'UPDATE',
          entityType: 'request',
          entityId: requestId,
          entityName: type,
          newData: { status: newStatus },
          description: `Mengubah status permohonan ${type} menjadi ${newStatus}`,
          portalType: 'operational',
          metadata: { source: 'useRequestHandlers.handleUpdateRequestStatus' },
        });

        showSuccess('Status permohonan berhasil diperbarui.');
      } catch (error: any) {
        showError('Gagal memperbarui status permohonan', error);
      }
    },
    [activePortal, authUser, setAllRequests, setEmployees, showSuccess, showError]
  );

  const handleNewRequest = useCallback(
    async (request: Omit<AllRequest, 'id' | 'status' | 'requestedAt'>) => {
      try {
        const portalError = ensurePortalAccess(activePortal, 'personal', 'Pengajuan permohonan');
        if (portalError) {
          showError('Akses ditolak', portalError);
          return;
        }

        if (authUser && request.employeeId !== authUser.profile.id) {
          showError('Akses ditolak', 'Anda hanya dapat mengajukan permohonan untuk akun sendiri.');
          return;
        }

        const newRequestPayload = {
          ...request,
          status: 'Pending',
          requestedAt: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('requests')
          .insert(newRequestPayload)
          .select()
          .single();

        if (error) {
          showError('Gagal mengajukan permohonan', error);
          return;
        }

        if (data) {
          setAllRequests((prev) => [...prev, data as AllRequest]);

          await createAuditLog({
            action: 'CREATE',
            entityType: 'request',
            entityId: (data as any).id,
            entityName: request.type,
            newData: {
              type: request.type,
              employeeId: request.employeeId,
            },
            description: `Mengajukan permohonan ${request.type}`,
            portalType: 'personal',
            metadata: { source: 'useRequestHandlers.handleNewRequest' },
          });

          showSuccess('Permohonan berhasil diajukan.');
        }
      } catch (error: any) {
        showError('Gagal mengajukan permohonan', error);
      }
    },
    [activePortal, authUser, setAllRequests, showSuccess, showError]
  );

  return {
    handleUpdateRequestStatus,
    handleNewRequest,
  };
};

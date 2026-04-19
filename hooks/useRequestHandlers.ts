import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { AllRequest, RequestType, RequestStatus, LeaveRequest, Employee } from '../types';
import { useAppData, useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';

export const useRequestHandlers = () => {
  const { employees } = useAppData();
  const { setAllRequests, setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleUpdateRequestStatus = useCallback(
    async (
      requestId: string,
      type: RequestType,
      newStatus: RequestStatus
    ) => {
      try {
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
          const diffTime = Math.abs(
            new Date(leaveReq.endDate).getTime() - new Date(leaveReq.startDate).getTime()
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const employeeToUpdate = employees.find((emp) => emp.id === leaveReq.employeeId);

          if (employeeToUpdate) {
            const newSisaCuti = employeeToUpdate.sisaCuti - diffDays;
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
        showSuccess('Status permohonan berhasil diperbarui.');
      } catch (error: any) {
        showError('Gagal memperbarui status permohonan', error);
      }
    },
    [setAllRequests, setEmployees, showSuccess, showError]
  );

  const handleNewRequest = useCallback(
    async (request: Omit<AllRequest, 'id' | 'status' | 'requestedAt'>) => {
      try {
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
          showSuccess('Permohonan berhasil diajukan.');
        }
      } catch (error: any) {
        showError('Gagal mengajukan permohonan', error);
      }
    },
    [setAllRequests, showSuccess, showError]
  );

  return {
    handleUpdateRequestStatus,
    handleNewRequest,
  };
};

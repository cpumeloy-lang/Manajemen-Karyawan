import { useCallback, useRef } from 'react';
import logger from '../services/logger.ts';

import { supabase } from '../services/supabaseClient';

import { Employee } from '../types';

import type { NewEmployeeData } from '../components/EmployeeForm';

import { useAppData, useAppDataActions, useUIActions, useAuth, useUI } from '../stores/appStore';

import { useMessageHandlers } from './useMessageHandlers';

import { mapEmployeeToDatabase, mapEmployeeFromDatabase } from '../utils/dataMapping';

import { sanitizeDateFields } from '../utils/dateUtils';
import { getAuthHeaders } from '../utils/apiUtils.ts';

import { canManageEmployees, ensurePortalAccess } from '../services/portalAccessService';

import { createAuditLog } from '../services/auditLogService';

import { useConfirm } from '../components/ConfirmDialog';



export const useEmployeeCRUD = () => {

  const confirm = useConfirm();

  const { employees } = useAppData();

  const { authUser } = useAuth();

  const { activePortal, employeeToView } = useUI();

  const { setEmployees, setDocuments } = useAppDataActions();

  const { setIsFormOpen, setEmployeeToEdit, setEmployeeToView } = useUIActions();

  const { showSuccess, showError } = useMessageHandlers();  // [HK-K5] Track setTimeout ID to clear on unmount or before new operation
  const formCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFormClose = (delay = 2000) => {
    if (formCloseTimerRef.current) clearTimeout(formCloseTimerRef.current);
    formCloseTimerRef.current = setTimeout(() => {
      formCloseTimerRef.current = null;
      setIsFormOpen(false);
      setEmployeeToEdit(null);
    }, delay);
  };


  const ensureCanManageEmployeeData = (actionLabel: string): boolean => {

    const portalError = ensurePortalAccess(activePortal, 'operational', actionLabel);

    if (portalError) {

      showError('Akses ditolak', portalError);

      return false;

    }



    if (!canManageEmployees(authUser?.profile.role)) {

      showError('Akses ditolak', 'Role Anda tidak memiliki izin mengelola data karyawan.');

      return false;

    }



    return true;

  };



  const handleSaveEmployee = useCallback(

    async (

      employeeData: Employee | NewEmployeeData,

      newPassword?: string

    ): Promise<void> => {

      if (!ensureCanManageEmployeeData('Kelola data karyawan')) {

        return;

      }



      try {

        if ('id' in employeeData && employeeData.id) {

          // UPDATE EMPLOYEE

          await updateEmployee(employeeData as Employee, newPassword, Array.isArray((employeeData as any).documents) ? (employeeData as any).documents : []);

          // [HK-K5] Use tracked timer to close form after success message
          scheduleFormClose();

        } else if ('password' in employeeData) {

          // CREATE EMPLOYEE (with login)

          await createEmployeeWithLogin(employeeData, Array.isArray((employeeData as any).documents) ? (employeeData as any).documents : []);

          // [HK-K5] Use tracked timer to close form after success message
          scheduleFormClose();

        } else {

          // CREATE EMPLOYEE (profile only)

          await createEmployee(employeeData, Array.isArray((employeeData as any).documents) ? (employeeData as any).documents : []);

          // [HK-K5] Use tracked timer to close form after success message
          scheduleFormClose();

        }

      } catch (error: any) {

        showError('Gagal menyimpan data karyawan', error);

        // Jangan tutup form jika ada error, biarkan user coba lagi

        // setIsFormOpen(false);

        // setEmployeeToEdit(null);

      }

    },

    [activePortal, authUser, setEmployees, setDocuments, setIsFormOpen, setEmployeeToEdit, showSuccess, showError]

  );



  const updateEmployee = async (

    employeeData: Employee,

    newPassword?: string,
    documents: any[] = []

  ) => {

    const { id } = employeeData;

    

    // Sanitize and map data to database format

    const sanitized = sanitizeDateFields(employeeData);

    const updateData = mapEmployeeToDatabase(sanitized);



    logger.debug('[updateEmployee] Sending update', { id });

    logger.debug('[updateEmployee] Payload keys', { keys: Object.keys(updateData) });



    const authHeaders = await getAuthHeaders();

    const response = await fetch(`/api/employees/${id}`, {

      method: 'PUT',

      headers: {

        'Content-Type': 'application/json',

        ...authHeaders,

      },

      body: JSON.stringify({ updateData, documents, ...(newPassword && { newPassword }) }),

    });



    const result = await response.json().catch(() => null);

    if (!response.ok) {

      throw new Error(result?.error || 'Database error');

    }



    const updatedEmployee = result?.data;



    if (!updatedEmployee) {

      throw new Error(

        'Pembaruan data gagal: tidak ada baris yang diperbarui. ' +

        'Pastikan Anda memiliki izin untuk mengubah data karyawan ini (RLS Policy).'

      );

    }



    logger.debug('[updateEmployee] DB returned updated', { nama: updatedEmployee.nama });



    // Transform back to UI format

    const employeeWithCompensation = mapEmployeeFromDatabase({

      ...updatedEmployee,

      compensation: {

        gajiPokok: updatedEmployee.gajiPokok || 0,

        tunjanganProfesi: updatedEmployee.tunjanganProfesi || 0,

      },

    });



    // Update local state after successful database response
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? employeeWithCompensation : e))
    );
    // Keep detail drawer in sync if it's currently viewing this employee
    try {
      if (employeeToView && employeeToView.id === id) {
        setEmployeeToView(employeeWithCompensation);
      }
    } catch (syncErr) {
      logger.warn('[updateEmployee] sync employeeToView failed', { error: syncErr?.message });
    }

    if (Array.isArray(documents)) {
      await reloadDocuments(id);
    }



    await createAuditLog({

      action: 'UPDATE',

      entityType: 'employee',

      entityId: updatedEmployee.id,

      entityName: updatedEmployee.nama,

      oldData: { id: employeeData.id },

      newData: {

        nama: updatedEmployee.nama,

        email: updatedEmployee.email,

        jabatan: updatedEmployee.jabatan,

        departemen: updatedEmployee.departemen,

      },

      description: `Memperbarui data karyawan ${updatedEmployee.nama}`,

      portalType: 'operational',

      metadata: { source: 'useEmployeeCRUD.updateEmployee' },

    });



    showSuccess(`✅ Data karyawan ${updatedEmployee.nama} berhasil diperbarui dan tersimpan.`);

  };



  const createEmployeeWithLogin = async (

    employeeData: any,

    documents: any[] = []

  ) => {

    if (!employeeData.password?.trim()) {

      throw new Error('Password akun login karyawan wajib diisi.');

    }



    // Create employee profile

    const sanitized = sanitizeDateFields({

      ...employeeData,

    });

    const profileData = mapEmployeeToDatabase(sanitized);



    const authHeaders = await getAuthHeaders();

    const response = await fetch('/api/employees', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        ...authHeaders,

      },

      body: JSON.stringify({

        employeeData: profileData,

        password: employeeData.password,

        documents,

      }),

    });



    const result = await response.json().catch(() => null);

    if (!response.ok) {

      throw new Error(result?.error || 'Gagal menyimpan profil karyawan');

    }



    const newEmployee = result?.data;

    if (!newEmployee) {

      throw new Error('Pengguna tidak berhasil dibuat di server.');

    }



    // Transform to UI format

    const employeeWithCompensation = mapEmployeeFromDatabase({

      ...newEmployee,

      compensation: {

        gajiPokok: newEmployee.gajiPokok || 0,

        tunjanganProfesi: newEmployee.tunjanganProfesi || 0,

      },

    });



    // Add to store

    setEmployees((prev) => [...prev, employeeWithCompensation]);



    // Handle documents

    if (documents.length > 0) {

      // Reload documents

      await reloadDocuments(newEmployee.id);

    }



    showSuccess(

      `✅ Karyawan baru ${newEmployee.nama} berhasil ditambahkan dengan akun login siap digunakan.`

    );



    await createAuditLog({

      action: 'CREATE',

      entityType: 'employee',

      entityId: newEmployee.id,

      entityName: newEmployee.nama,

      newData: {

        nama: newEmployee.nama,

        email: newEmployee.email,

        role: newEmployee.role,

      },

      description: `Menambahkan karyawan baru ${newEmployee.nama} dengan akun login`,

      portalType: 'operational',

      metadata: { source: 'useEmployeeCRUD.createEmployeeWithLogin' },

    });



    return newEmployee;

  };



  const createEmployee = async (employeeData: any, documents: any[] = []) => {

    const sanitized = sanitizeDateFields(employeeData);

    const profileData = mapEmployeeToDatabase(sanitized);



    const authHeaders = await getAuthHeaders();

    const response = await fetch('/api/employees', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        ...authHeaders,

      },

      body: JSON.stringify({

        employeeData: profileData,

        documents,

      }),

    });



    const result = await response.json().catch(() => null);

    if (!response.ok) {

      throw new Error(result?.error || `Gagal menyimpan profil karyawan`);

    }



    const newEmployee = result?.data;

    if (!newEmployee) {

      throw new Error('Profil karyawan tidak berhasil dibuat di server.');

    }



    const employeeWithCompensation = mapEmployeeFromDatabase({

      ...newEmployee,

      compensation: {

        gajiPokok: newEmployee.gajiPokok || 0,

        tunjanganProfesi: newEmployee.tunjanganProfesi || 0,

      },

    });



    setEmployees((prev) => [...prev, employeeWithCompensation]);



    if (documents.length > 0) {

      await reloadDocuments(newEmployee.id);

    }



    showSuccess(`✅ Profil karyawan ${newEmployee.nama} berhasil ditambahkan ke sistem.`);



    await createAuditLog({

      action: 'CREATE',

      entityType: 'employee',

      entityId: newEmployee.id,

      entityName: newEmployee.nama,

      newData: {

        nama: newEmployee.nama,

        email: newEmployee.email,

        role: newEmployee.role,

      },

      description: `Menambahkan profil karyawan baru ${newEmployee.nama}`,

      portalType: 'operational',

      metadata: { source: 'useEmployeeCRUD.createEmployee' },

    });

    // Trigger server-side cache invalidation (best-effort)

    try {

      const key = import.meta.env.VITE_INTERNAL_API_KEY || '';

      fetch('/api/cache/invalidate', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json', ...(key ? { 'x-internal-auth': key } : {}) },

        body: JSON.stringify({ pattern: 'employees:*', userId: newEmployee.id }),

      }).catch(() => {});

    } catch (err) {

      // ignore

    }

    return newEmployee;

  };



  const handleDocumentUpdate = async (

    employeeId: string,

    newDocuments: any[],

    existingDocuments: any[]

  ) => {

    const docsToAdd = newDocuments

      .filter(

        (newDoc) => !existingDocuments.some((oldDoc) => oldDoc.id === newDoc.id)

      )

      .map((d) => ({ ...d, employeeId }));



    const docIdsToDelete = existingDocuments

      .filter(

        (oldDoc) =>

          !newDocuments.some((newDoc) => newDoc.id === oldDoc.id)

      )

      .map((d) => d.id);



    if (docsToAdd.length > 0) {

      const { error: addError } = await supabase

        .from('documents')

        .insert(docsToAdd);

      if (addError) {

        throw new Error(`Gagal menambah dokumen: ${addError.message}`);

      }

    }



    if (docIdsToDelete.length > 0) {

      const { error: deleteError } = await supabase

        .from('documents')

        .delete()

        .in('id', docIdsToDelete);

      if (deleteError) {

        throw new Error(`Gagal menghapus dokumen: ${deleteError.message}`);

      }

    }



    if (docsToAdd.length > 0 || docIdsToDelete.length > 0) {

      await reloadDocuments(employeeId);

    }

  };



  const handleDeleteEmployee = useCallback(

    async (id: string) => {

      if (!ensureCanManageEmployeeData('Hapus data karyawan')) {

        return;

      }



      const employee = employees.find(e => e.id === id);

      const confirmed = await confirm({

        title: 'Hapus Data Karyawan',

        message: `Apakah Anda yakin ingin menghapus data karyawan ${employee?.nama || 'ini'}? Ini tidak akan menghapus akun login mereka.`,

        confirmLabel: 'Hapus',

        variant: 'danger',

      });

      if (!confirmed) {

        return;

      }



      try {

        const authHeaders = await getAuthHeaders();

        const response = await fetch(`/api/employees/${id}`, {

          method: 'DELETE',

          headers: {

            ...authHeaders,

          },

        });



        const result = await response.json().catch(() => null);

        if (!response.ok) throw new Error(result?.error || 'Gagal menghapus karyawan');



        setEmployees((prev) => prev.filter((e) => e.id !== id));

        setDocuments((prev) => prev.filter((d) => d.employeeId !== id));



        await createAuditLog({

          action: 'DELETE',

          entityType: 'employee',

          entityId: id,

          entityName: employee?.nama || 'unknown',

          oldData: {

            id,

            nama: employee?.nama,

            email: employee?.email,

          },

          description: `Menghapus data karyawan ${employee?.nama || id}`,

          portalType: 'operational',

          metadata: { source: 'useEmployeeCRUD.handleDeleteEmployee' },

        });



        showSuccess(`✅ Data karyawan ${employee?.nama || 'berhasil'} telah dihapus dari sistem.`);

      } catch (error: any) {

        showError('Gagal menghapus karyawan', error);

      }

    },

    [activePortal, authUser, employees, setEmployees, setDocuments, showSuccess, showError]

  );



  const reloadDocuments = async (employeeId?: string) => {

    let query = supabase

      .from('documents')

      .select('*');

    if (employeeId) {

      query = query.eq('employeeId', employeeId);

    } else {

      query = query.limit(5000);

    }

    const { data: finalDocs, error: finalDocsError } = await query;



    if (finalDocsError) {

      throw new Error(

        `Gagal memuat ulang dokumen: ${finalDocsError.message}`

      );

    }

    if (employeeId) {
      setDocuments((prev) => {
        const remaining = prev.filter((doc) => doc.employeeId !== employeeId);
        return [...remaining, ...((finalDocs || []) as any[])];
      });
      return;
    }

    setDocuments((finalDocs || []) as any);

  };



  const handleResetPasswordByHR = useCallback(

    async (employeeId: string, newPassword?: string) => {

      if (!ensureCanManageEmployeeData('Reset password karyawan')) {

        return;

      }



      const employee = employees.find(e => e.id === employeeId);

      if (!employee?.user_id) {

        showError('Karyawan ini belum memiliki akun login/user_id.', '');

        return;

      }



      const passToUse = String(newPassword || '').trim();

      if (!passToUse) {

        showError('Password baru harus diisi melalui modal input.', '');

        return false;

      }



      if (passToUse.length < 6) {

        showError('Password baru harus diisi minimal 6 karakter.', '');

        return false;

      }



      if (!newPassword) {

        const ok = await confirm({

          title: 'Reset Password',

          message: `Yakin ingin mereset password akun ${employee.nama} menjadi "${passToUse}"?`,

          confirmLabel: 'Reset',

          variant: 'warning',

        });

        if (!ok) {

          return false;

        }

      }



      try {

        const { error } = await (supabase as any).rpc('admin_reset_employee_password', {

          target_user_id: employee.user_id,

          new_password: passToUse

        });



        if (error) {

          throw new Error(error.message);

        }



        await createAuditLog({

          action: 'UPDATE',

          entityType: 'employee',

          entityId: employee.id,

          entityName: employee.nama,

          newData: { password_reset: true },

          description: `Melakukan reset password untuk ${employee.nama}`,

          portalType: 'operational',

          metadata: { source: 'useEmployeeCRUD.handleResetPasswordByHR' },

        });

        

        showSuccess(`✅ Password untuk ${employee.nama} berhasil direset dan email konfirmasi telah dikirim.`);

        return true;

      } catch (error: any) {

        showError('Gagal mereset password akun', error);

        return false;

      }

    },

    [activePortal, authUser, employees, showSuccess, showError]

  );



  return {

    handleSaveEmployee,

    handleDeleteEmployee,

    handleResetPasswordByHR,

  };

};


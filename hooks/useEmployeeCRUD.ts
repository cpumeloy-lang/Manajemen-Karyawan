import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';
import type { NewEmployeeData } from '../components/EmployeeForm';
import { useAppData, useAppDataActions, useUIActions, useAuth, useUI } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { mapEmployeeToDatabase, mapEmployeeFromDatabase } from '../utils/dataMapping';
import { sanitizeDateFields } from '../utils/dateUtils';
import { canManageEmployees, ensurePortalAccess } from '../services/portalAccessService';
import { createAuditLog } from '../services/auditLogService';
import { useConfirm } from '../components/ConfirmDialog';

export const useEmployeeCRUD = () => {
  const confirm = useConfirm();
  const { employees } = useAppData();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { setEmployees, setDocuments } = useAppDataActions();
  const { setIsFormOpen, setEmployeeToEdit } = useUIActions();
  const { showSuccess, showError } = useMessageHandlers();

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
          await updateEmployee(employeeData as Employee, newPassword);
          // Tunggu sebentar agar user bisa melihat success message sebelum form tertutup
          setTimeout(() => {
            setIsFormOpen(false);
            setEmployeeToEdit(null);
          }, 2000);
        } else if ('password' in employeeData) {
          // CREATE EMPLOYEE (with login)
          await createEmployeeWithLogin(employeeData, []);
          // Tunggu sebentar agar user bisa melihat success message sebelum form tertutup
          setTimeout(() => {
            setIsFormOpen(false);
            setEmployeeToEdit(null);
          }, 2000);
        } else {
          // CREATE EMPLOYEE (profile only)
          await createEmployee(employeeData, []);
          // Tunggu sebentar agar user bisa melihat success message sebelum form tertutup
          setTimeout(() => {
            setIsFormOpen(false);
            setEmployeeToEdit(null);
          }, 2000);
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
    newPassword?: string
  ) => {
    const { id } = employeeData;
    
    // Sanitize and map data to database format
    const sanitized = sanitizeDateFields(employeeData);
    const updateData = mapEmployeeToDatabase(sanitized);

    console.log('[updateEmployee] Sending update for ID:', id);
    console.log('[updateEmployee] Payload keys:', Object.keys(updateData));

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Database error: ${error.message}`);

    // Cek apakah baris benar-benar di-update (bisa null jika RLS memblokir tanpa error)
    if (!updatedEmployee) {
      throw new Error(
        'Pembaruan data gagal: tidak ada baris yang diperbarui. ' +
        'Pastikan Anda memiliki izin untuk mengubah data karyawan ini (RLS Policy).'
      );
    }

    console.log('[updateEmployee] DB returned updated nama:', updatedEmployee.nama);

    // Transform back to UI format
    const employeeWithCompensation = mapEmployeeFromDatabase({
      ...updatedEmployee,
      compensation: {
        gajiPokok: updatedEmployee.gajiPokok || 0,
        tunjanganProfesi: updatedEmployee.tunjanganProfesi || 0,
      },
    });

    // Update local state IMMEDIATELY (optimistic update)
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? employeeWithCompensation : e))
    );

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

    // Create a temporary client that doesn't persist the session
    // This prevents the HR from being logged out when creating a new user
    const tempSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const tempSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!tempSupabaseUrl || !tempSupabaseKey) {
      throw new Error('Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk melanjutkan.');
    }
    
    const tempClient = createClient(tempSupabaseUrl, tempSupabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Create auth account
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: employeeData.email,
      password: employeeData.password,
    });

    if (authError) {
      throw new Error(`Gagal membuat akun login: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error('Pengguna tidak berhasil dibuat di Supabase Auth.');
    }

    // Create employee profile
    const sanitized = sanitizeDateFields({
      ...employeeData,
      user_id: authData.user.id,
    });
    const profileData = mapEmployeeToDatabase(sanitized);

    const { data: newEmployee, error: profileError } = await supabase
      .from('employees')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      throw new Error(`Gagal menyimpan profil karyawan: ${profileError.message}`);
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
      const docsToInsert = documents.map((doc) => ({
        ...doc,
        employeeId: newEmployee.id,
      }));
      const { error: docError } = await supabase
        .from('documents')
        .insert(docsToInsert);

      if (docError) {
        throw new Error(
          `Profil dibuat, tapi gagal menyimpan dokumen: ${docError.message}`
        );
      }

      // Reload documents
      await reloadDocuments();
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

    const { data: newEmployee, error: profileError } = await supabase
      .from('employees')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      throw new Error(`Gagal menyimpan profil karyawan: ${profileError.message}`);
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
      const docsToInsert = documents.map((doc) => ({
        ...doc,
        employeeId: newEmployee.id,
      }));
      const { error: docError } = await supabase
        .from('documents')
        .insert(docsToInsert);

      if (docError) {
        throw new Error(
          `Profil dibuat, tapi gagal menyimpan dokumen: ${docError.message}`
        );
      }

      await reloadDocuments();
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
      await reloadDocuments();
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
        const { error } = await supabase.from('employees').delete().eq('id', id);

        if (error) throw error;

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

  const reloadDocuments = async () => {
    const { data: finalDocs, error: finalDocsError } = await supabase
      .from('documents')
      .select('*');

    if (finalDocsError) {
      throw new Error(
        `Gagal memuat ulang dokumen: ${finalDocsError.message}`
      );
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

      const passToUse = newPassword || prompt(`Masukkan password baru untuk karwayan ${employee.nama}:`);
      
      if (!passToUse || passToUse.trim().length < 6) {
        showError('Password baru harus diisi minimal 6 karakter.', '');
        return;
      }

      if (!newPassword) {
        const ok = await confirm({
          title: 'Reset Password',
          message: `Yakin ingin mereset password akun ${employee.nama} menjadi "${passToUse}"?`,
          confirmLabel: 'Reset',
          variant: 'warning',
        });
        if (!ok) {
          return;
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
      } catch (error: any) {
        showError('Gagal mereset password akun', error);
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

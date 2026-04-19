import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Employee } from '../types';
import type { NewEmployeeData } from '../components/EmployeeForm';
import { useAppData, useAppDataActions, useUIActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { mapEmployeeToDatabase, mapEmployeeFromDatabase } from '../utils/dataMapping';
import { sanitizeDateFields } from '../utils/dateUtils';

export const useEmployeeCRUD = () => {
  const { employees } = useAppData();
  const { setEmployees, setDocuments } = useAppDataActions();
  const { setIsFormOpen, setEmployeeToEdit } = useUIActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleSaveEmployee = useCallback(
    async (
      employeeData: Employee | NewEmployeeData,
      newPassword?: string
    ): Promise<void> => {
      try {
        if ('id' in employeeData && employeeData.id) {
          // UPDATE EMPLOYEE
          await updateEmployee(employeeData as Employee, newPassword);
        } else if ('password' in employeeData) {
          // CREATE EMPLOYEE (with login)
          await createEmployeeWithLogin(employeeData, []);
        } else {
          // CREATE EMPLOYEE (profile only)
          await createEmployee(employeeData, []);
        }
      } catch (error: any) {
        showError('Gagal menyimpan data karyawan', error);
        throw error;
      } finally {
        setIsFormOpen(false);
        setEmployeeToEdit(null);
      }
    },
    [setEmployees, setDocuments, setIsFormOpen, setEmployeeToEdit, showSuccess, showError]
  );

  const updateEmployee = async (
    employeeData: Employee,
    newPassword?: string
  ) => {
    const { id } = employeeData;
    
    // Sanitize and map data to database format
    const sanitized = sanitizeDateFields(employeeData);
    const updateData = mapEmployeeToDatabase(sanitized);

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Database error: ${error.message}`);

    // Transform back to UI format
    const employeeWithCompensation = mapEmployeeFromDatabase({
      ...updatedEmployee,
      compensation: {
        gajiPokok: updatedEmployee.gajiPokok || 0,
        tunjanganProfesi: updatedEmployee.tunjanganProfesi || 0,
      },
    });

    // Update local state
    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? employeeWithCompensation : e))
    );

    showSuccess(`Data karyawan ${updatedEmployee.nama} berhasil diperbarui.`);
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
      `Karyawan baru ${newEmployee.nama} berhasil ditambahkan. Akun login telah dibuat.`
    );
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

    showSuccess(`Karyawan baru ${newEmployee.nama} berhasil ditambahkan.`);
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
      const employee = employees.find(e => e.id === id);
      if (
        !window.confirm(
          `Apakah Anda yakin ingin menghapus data karyawan ${employee?.nama || 'ini'}? Ini tidak akan menghapus akun login mereka.`
        )
      ) {
        return;
      }

      try {
        const { error } = await supabase.from('employees').delete().eq('id', id);

        if (error) throw error;

        setEmployees((prev) => prev.filter((e) => e.id !== id));
        setDocuments((prev) => prev.filter((d) => d.employeeId !== id));
        showSuccess(`Data karyawan ${employee?.nama || 'berhasil'} berhasil dihapus.`);
      } catch (error: any) {
        showError('Gagal menghapus karyawan', error);
      }
    },
    [employees, setEmployees, setDocuments, showSuccess, showError]
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

    setDocuments(finalDocs || []);
  };

  const handleResetPasswordByHR = useCallback(
    async (employeeId: string, newPassword?: string) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee?.user_id) {
        showError('Karyawan ini belum memiliki akun login/user_id.');
        return;
      }

      const passToUse = newPassword || prompt(`Masukkan password baru untuk karwayan ${employee.nama}:`);
      
      if (!passToUse || passToUse.trim().length < 6) {
        showError('Password baru harus diisi minimal 6 karakter.');
        return;
      }

      if (!newPassword) {
        if (!window.confirm(`Yakin ingin mereset password akun ${employee.nama} menjadi "${passToUse}"?`)) {
          return;
        }
      }

      try {
        const { error } = await supabase.rpc('admin_reset_employee_password', {
          target_user_id: employee.user_id,
          new_password: passToUse
        });

        if (error) {
          throw new Error(error.message);
        }
        
        showSuccess(`Password untuk ${employee.nama} berhasil direset!`);
      } catch (error: any) {
        showError('Gagal mereset password akun', error);
      }
    },
    [employees, showSuccess, showError]
  );

  return {
    handleSaveEmployee,
    handleDeleteEmployee,
    handleResetPasswordByHR,
  };
};

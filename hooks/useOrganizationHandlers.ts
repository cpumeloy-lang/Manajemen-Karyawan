import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { WorkUnit, Department, Position } from '../types';
import { useAppData, useAppDataActions, useAuth, useUI } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { canManageOrganization, ensurePortalAccess } from '../services/portalAccessService';
import { createAuditLog } from '../services/auditLogService';
import { useConfirm } from '../components/ConfirmDialog';

export const useOrganizationHandlers = () => {
  const confirm = useConfirm();
  const { departments, positions, workUnits } = useAppData();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { setWorkUnits, setDepartments, setPositions, setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const ensureCanManageMasterData = (actionLabel: string): boolean => {
    const portalError = ensurePortalAccess(activePortal, 'operational', actionLabel);
    if (portalError) {
      showError('Akses ditolak', portalError);
      return false;
    }

    if (!canManageOrganization(authUser?.profile.role)) {
      showError('Akses ditolak', 'Role Anda tidak memiliki izin mengelola master data organisasi.');
      return false;
    }

    return true;
  };

  const handleSaveWorkUnit = useCallback(
    async (unit: WorkUnit) => {
      if (!ensureCanManageMasterData('Kelola unit kerja')) return;

      // Client-side validation for duplicates and empty names
      const isDuplicate = workUnits?.some(
        (u) => String(u.nama || '').toLowerCase() === String(unit.nama || '').toLowerCase() && u.id !== unit.id
      );
      if (isDuplicate) {
        showError('Nama unit kerja sudah ada', `Unit kerja dengan nama "${unit.nama}" sudah terdaftar.`);
        return;
      }
      if (!unit.nama?.trim()) {
        showError('Validasi Gagal', 'Nama unit kerja tidak boleh kosong.');
        return;
      }

      try {
        const isCreate = !unit.id;
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/organization/units', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ unit }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 409) throw new Error(result?.error || 'Nama sudah ada');
          throw new Error(result?.error || 'Gagal menyimpan unit kerja');
        }

        const savedUnit = result?.data as WorkUnit;

        if (savedUnit) {
          setWorkUnits((prev) => {
            const index = prev.findIndex((u) => u.id === savedUnit!.id);
            return index > -1
              ? prev.map((u) => (u.id === savedUnit!.id ? savedUnit! : u))
              : [...prev, savedUnit];
          });
          showSuccess('Unit kerja berhasil disimpan.');

          await createAuditLog({
            action: isCreate ? 'CREATE' : 'UPDATE',
            entityType: 'unit',
            entityId: savedUnit.id,
            entityName: savedUnit.nama,
            newData: savedUnit,
            description: `${isCreate ? 'Menambahkan' : 'Memperbarui'} unit kerja ${savedUnit.nama}`,
            portalType: 'operational',
            metadata: { source: 'useOrganizationHandlers.handleSaveWorkUnit' },
          });
        }
      } catch (error: any) {
        showError('Gagal menyimpan unit kerja', error);
      }
    },
    [activePortal, authUser, workUnits, setWorkUnits, showSuccess, showError]
  );

  const handleDeleteWorkUnit = useCallback(
    async (id: string) => {
      if (!ensureCanManageMasterData('Hapus unit kerja')) return;

      const ok = await confirm({
        title: 'Hapus Unit Kerja',
        message: 'Menghapus unit kerja juga akan menghapus tautannya dari karyawan. Lanjutkan?',
        confirmLabel: 'Hapus',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`/api/organization/units/${id}`, {
          method: 'DELETE',
          headers: {
            ...authHeaders,
          },
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || 'Gagal menghapus unit kerja');

        setWorkUnits((prev) => prev.filter((u) => u.id !== id));
        setEmployees((prev) =>
          prev.map((e) => (e.unitKerjaId === id ? { ...e, unitKerjaId: undefined } : e))
        );

        await createAuditLog({
          action: 'DELETE',
          entityType: 'unit',
          entityId: id,
          entityName: 'unit',
          oldData: { id },
          description: `Menghapus unit kerja dengan id ${id}`,
          portalType: 'operational',
          metadata: { source: 'useOrganizationHandlers.handleDeleteWorkUnit' },
        });

        showSuccess('Unit kerja berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus unit kerja', error);
      }
    },
    [activePortal, authUser, setWorkUnits, setEmployees, showSuccess, showError]
  );

  const handleSaveDepartment = useCallback(
    async (dept: Department) => {
      if (!ensureCanManageMasterData('Kelola departemen')) return;

      // Client-side validation for duplicates and empty names
      const isDuplicate = departments?.some(
        (d) => String(d.nama || '').toLowerCase() === String(dept.nama || '').toLowerCase() && d.id !== dept.id
      );
      if (isDuplicate) {
        showError('Nama departemen sudah ada', `Departemen dengan nama "${dept.nama}" sudah terdaftar.`);
        return;
      }
      if (!dept.nama?.trim()) {
        showError('Validasi Gagal', 'Nama departemen tidak boleh kosong.');
        return;
      }

      try {
        const isCreate = !dept.id;
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/organization/departments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ department: dept }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 409) throw new Error(result?.error || 'Nama sudah ada');
          throw new Error(result?.error || 'Gagal menyimpan departemen');
        }

        const savedDept = result?.data as Department;

        if (savedDept) {
          setDepartments((prev) => {
            const index = prev.findIndex((d) => d.id === savedDept!.id);
            return index > -1
              ? prev.map((d) => (d.id === savedDept!.id ? savedDept! : d))
              : [...prev, savedDept];
          });
          showSuccess('Departemen berhasil disimpan.');

          await createAuditLog({
            action: isCreate ? 'CREATE' : 'UPDATE',
            entityType: 'department',
            entityId: savedDept.id,
            entityName: savedDept.nama,
            newData: savedDept,
            description: `${isCreate ? 'Menambahkan' : 'Memperbarui'} departemen ${savedDept.nama}`,
            portalType: 'operational',
            metadata: { source: 'useOrganizationHandlers.handleSaveDepartment' },
          });
        }
      } catch (error: any) {
        showError('Gagal menyimpan departemen', error);
      }
    },
    [activePortal, authUser, departments, setDepartments, showSuccess, showError]
  );

  const handleDeleteDepartment = useCallback(
    async (id: string) => {
      if (!ensureCanManageMasterData('Hapus departemen')) return;

      const ok = await confirm({
        title: 'Hapus Departemen',
        message: 'Menghapus departemen juga akan menghapus tautannya dari karyawan. Lanjutkan?',
        confirmLabel: 'Hapus',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`/api/organization/departments/${id}`, {
          method: 'DELETE',
          headers: {
            ...authHeaders,
          },
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || 'Gagal menghapus departemen');

        const deptName = departments.find((d) => d.id === id)?.nama;
        setDepartments((prev) => prev.filter((d) => d.id !== id));
        setEmployees((prev) =>
          prev.map((e) => (e.departemen === deptName ? { ...e, departemen: '' } : e))
        );

        await createAuditLog({
          action: 'DELETE',
          entityType: 'department',
          entityId: id,
          entityName: deptName || 'department',
          oldData: { id, nama: deptName },
          description: `Menghapus departemen ${deptName || id}`,
          portalType: 'operational',
          metadata: { source: 'useOrganizationHandlers.handleDeleteDepartment' },
        });

        showSuccess('Departemen berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus departemen', error);
      }
    },
    [activePortal, authUser, departments, setDepartments, setEmployees, showSuccess, showError]
  );

  const handleSavePosition = useCallback(
    async (position: Position) => {
      if (!ensureCanManageMasterData('Kelola jabatan')) return;

      // Client-side validation for duplicates and empty names
      const isDuplicate = positions?.some(
        (p) => String(p.nama || '').toLowerCase() === String(position.nama || '').toLowerCase() && p.id !== position.id
      );
      if (isDuplicate) {
        showError('Nama jabatan sudah ada', `Jabatan dengan nama "${position.nama}" sudah terdaftar.`);
        return;
      }
      if (!position.nama?.trim()) {
        showError('Validasi Gagal', 'Nama jabatan tidak boleh kosong.');
        return;
      }

      try {
        const isCreate = !position.id;
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/organization/positions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ position }),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 409) throw new Error(result?.error || 'Nama sudah ada');
          throw new Error(result?.error || 'Gagal menyimpan jabatan');
        }

        const savedPos = result?.data as Position;

        if (savedPos) {
          setPositions((prev) => {
            const index = prev.findIndex((p) => p.id === savedPos!.id);
            return index > -1
              ? prev.map((p) => (p.id === savedPos!.id ? savedPos! : p))
              : [...prev, savedPos];
          });
          showSuccess('Jabatan berhasil disimpan.');

          await createAuditLog({
            action: isCreate ? 'CREATE' : 'UPDATE',
            entityType: 'position',
            entityId: savedPos.id,
            entityName: savedPos.nama,
            newData: savedPos,
            description: `${isCreate ? 'Menambahkan' : 'Memperbarui'} jabatan ${savedPos.nama}`,
            portalType: 'operational',
            metadata: { source: 'useOrganizationHandlers.handleSavePosition' },
          });
        }
      } catch (error: any) {
        showError('Gagal menyimpan jabatan', error);
      }
    },
    [activePortal, authUser, positions, setPositions, showSuccess, showError]
  );

  const handleDeletePosition = useCallback(
    async (id: string) => {
      if (!ensureCanManageMasterData('Hapus jabatan')) return;

      const ok = await confirm({
        title: 'Hapus Jabatan',
        message: 'Menghapus jabatan juga akan menghapus tautannya dari karyawan. Lanjutkan?',
        confirmLabel: 'Hapus',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`/api/organization/positions/${id}`, {
          method: 'DELETE',
          headers: {
            ...authHeaders,
          },
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || 'Gagal menghapus jabatan');

        const posName = positions.find((p) => p.id === id)?.nama;
        setPositions((prev) => prev.filter((p) => p.id !== id));
        setEmployees((prev) =>
          prev.map((e) => (e.jabatan === posName ? { ...e, jabatan: '' } : e))
        );

        await createAuditLog({
          action: 'DELETE',
          entityType: 'position',
          entityId: id,
          entityName: posName || 'position',
          oldData: { id, nama: posName },
          description: `Menghapus jabatan ${posName || id}`,
          portalType: 'operational',
          metadata: { source: 'useOrganizationHandlers.handleDeletePosition' },
        });

        showSuccess('Jabatan berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus jabatan', error);
      }
    },
    [activePortal, authUser, positions, setPositions, setEmployees, showSuccess, showError]
  );

  return {
    handleSaveWorkUnit,
    handleDeleteWorkUnit,
    handleSaveDepartment,
    handleDeleteDepartment,
    handleSavePosition,
    handleDeletePosition,
  };
};

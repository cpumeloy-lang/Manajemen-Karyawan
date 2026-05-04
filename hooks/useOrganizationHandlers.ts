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
  const { departments, positions } = useAppData();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { setWorkUnits, setDepartments, setPositions, setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

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

      try {
        let savedUnit: WorkUnit | null = null;
        const isCreate = !unit.id;

        if (unit.id) {
          const { data, error } = await supabase
            .from('units')
            .update({ nama: unit.nama })
            .eq('id', unit.id)
            .select()
            .single();

          if (error) throw error;
          savedUnit = data as unknown as WorkUnit;
        } else {
          const { data, error } = await supabase
            .from('units')
            .insert({ nama: unit.nama })
            .select()
            .single();

          if (error) throw error;
          savedUnit = data as unknown as WorkUnit;
        }

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
    [activePortal, authUser, setWorkUnits, showSuccess, showError]
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
        const { error } = await supabase.from('units').delete().eq('id', id);

        if (error) throw error;

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

      try {
        let savedDept: Department | null = null;
        const isCreate = !dept.id;

        if (dept.id) {
          const { data, error } = await supabase
            .from('departments')
            .update({ nama: dept.nama })
            .eq('id', dept.id)
            .select()
            .single();

          if (error) throw error;
          savedDept = data;
        } else {
          const { data, error } = await supabase
            .from('departments')
            .insert({ nama: dept.nama })
            .select()
            .single();

          if (error) throw error;
          savedDept = data;
        }

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
    [activePortal, authUser, setDepartments, showSuccess, showError]
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
        const { error } = await supabase.from('departments').delete().eq('id', id);

        if (error) throw error;

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

      try {
        let savedPos: Position | null = null;
        const isCreate = !position.id;

        if (position.id) {
          const { data, error } = await supabase
            .from('positions')
            .update({ nama: position.nama })
            .eq('id', position.id)
            .select()
            .single();

          if (error) throw error;
          savedPos = data;
        } else {
          const { data, error } = await supabase
            .from('positions')
            .insert({ nama: position.nama })
            .select()
            .single();

          if (error) throw error;
          savedPos = data;
        }

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
    [activePortal, authUser, setPositions, showSuccess, showError]
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
        const { error } = await supabase.from('positions').delete().eq('id', id);

        if (error) throw error;

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

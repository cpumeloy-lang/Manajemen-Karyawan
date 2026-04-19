import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { WorkUnit, Department, Position } from '../types';
import { useAppData, useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';

export const useOrganizationHandlers = () => {
  const { departments, positions } = useAppData();
  const { setWorkUnits, setDepartments, setPositions, setEmployees } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleSaveWorkUnit = useCallback(
    async (unit: WorkUnit) => {
      try {
        let savedUnit: WorkUnit | null = null;

        if (unit.id) {
          const { data, error } = await supabase
            .from('units')
            .update({ nama: unit.nama })
            .eq('id', unit.id)
            .select()
            .single();

          if (error) throw error;
          savedUnit = data;
        } else {
          const { data, error } = await supabase
            .from('units')
            .insert({ nama: unit.nama })
            .select()
            .single();

          if (error) throw error;
          savedUnit = data;
        }

        if (savedUnit) {
          setWorkUnits((prev) => {
            const index = prev.findIndex((u) => u.id === savedUnit!.id);
            return index > -1
              ? prev.map((u) => (u.id === savedUnit!.id ? savedUnit! : u))
              : [...prev, savedUnit];
          });
          showSuccess('Unit kerja berhasil disimpan.');
        }
      } catch (error: any) {
        showError('Gagal menyimpan unit kerja', error);
      }
    },
    [setWorkUnits, showSuccess, showError]
  );

  const handleDeleteWorkUnit = useCallback(
    async (id: string) => {
      if (!window.confirm('Menghapus unit kerja juga akan menghapus tautannya dari karyawan. Lanjutkan?')) {
        return;
      }

      try {
        const { error } = await supabase.from('units').delete().eq('id', id);

        if (error) throw error;

        setWorkUnits((prev) => prev.filter((u) => u.id !== id));
        setEmployees((prev) =>
          prev.map((e) => (e.unitKerjaId === id ? { ...e, unitKerjaId: undefined } : e))
        );
        showSuccess('Unit kerja berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus unit kerja', error);
      }
    },
    [setWorkUnits, setEmployees, showSuccess, showError]
  );

  const handleSaveDepartment = useCallback(
    async (dept: Department) => {
      try {
        let savedDept: Department | null = null;

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
        }
      } catch (error: any) {
        showError('Gagal menyimpan departemen', error);
      }
    },
    [setDepartments, showSuccess, showError]
  );

  const handleDeleteDepartment = useCallback(
    async (id: string) => {
      if (!window.confirm('Menghapus departemen juga akan menghapus tautannya dari karyawan. Lanjutkan?')) {
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
        showSuccess('Departemen berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus departemen', error);
      }
    },
    [departments, setDepartments, setEmployees, showSuccess, showError]
  );

  const handleSavePosition = useCallback(
    async (position: Position) => {
      try {
        let savedPos: Position | null = null;

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
        }
      } catch (error: any) {
        showError('Gagal menyimpan jabatan', error);
      }
    },
    [setPositions, showSuccess, showError]
  );

  const handleDeletePosition = useCallback(
    async (id: string) => {
      if (!window.confirm('Menghapus jabatan juga akan menghapus tautannya dari karyawan. Lanjutkan?')) {
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
        showSuccess('Jabatan berhasil dihapus.');
      } catch (error: any) {
        showError('Gagal menghapus jabatan', error);
      }
    },
    [positions, setPositions, setEmployees, showSuccess, showError]
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

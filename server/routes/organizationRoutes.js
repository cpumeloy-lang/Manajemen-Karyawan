import express from 'express';
import { validate } from '../middleware/validate.js';
import { saveUnitSchema, saveDepartmentSchema, savePositionSchema } from '../schemas/organizationSchemas.js';

export const setupOrganizationRoutes = (deps) => {
  const router = express.Router();
  const {
    getRequesterContext,
    canManageOrganizationRole,
    logDetailedError,
    getClientErrorMessage,
    invalidateOrganizationCaches,
    normalizeUnitData,
    normalizeSimpleNameEntity,
  } = deps;

  // ── Units ──
  router.post('/units', validate(saveUnitSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola unit kerja' });
      }

      const { unit } = req.body || {};
      if (!unit || typeof unit !== 'object') {
        return res.status(400).json({ success: false, error: 'unit is required' });
      }

      const safeUnit = normalizeUnitData(unit);
      const payload = {
        nama: safeUnit.nama,
        shifts: safeUnit.shifts ?? null,
        shift_assignments: safeUnit.shift_assignments ?? null,
      };
      let result;
      if (unit.id) {
        const { data, error } = await context.dbClient
          .from('units')
          .update(payload)
          .eq('id', unit.id)
          .select('*')
          .single();
        if (error || !data) {
          logDetailedError('Unit.update', error, { unitId: unit.id });
          return res.status(400).json({ success: false, error: getClientErrorMessage('unit_save_failed', 'Gagal menyimpan unit kerja') });
        }
        result = data;
      } else {
        const { data, error } = await context.dbClient
          .from('units')
          .insert(payload)
          .select('*')
          .single();
        if (error || !data) {
          logDetailedError('Unit.create', error, { unitName: payload.nama });
          return res.status(400).json({ success: false, error: getClientErrorMessage('unit_save_failed', 'Gagal menyimpan unit kerja') });
        }
        result = data;
      }

      await invalidateOrganizationCaches();
      return res.json({ success: true, data: result });
    } catch (err) {
      logDetailedError('Unit.save.endpoint', err);
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  router.delete('/units/:id', async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus unit kerja' });
      }

      const { data: targetUnit, error: fetchError } = await context.dbClient
        .from('units')
        .select('id, nama')
        .eq('id', req.params.id)
        .maybeSingle();

      if (fetchError || !targetUnit) {
        return res.status(404).json({ success: false, error: 'Unit kerja tidak ditemukan' });
      }

      // [BE-K3] Check cleanup error before deleting unit — if nullification fails, abort
      const { error: cleanupError } = await context.dbClient
        .from('employees')
        .update({ unitKerjaId: null })
        .eq('unitKerjaId', req.params.id);

      if (cleanupError) {
        logDetailedError('Unit.cleanupEmployees', cleanupError, { unitId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('cleanup_failed', 'Gagal memperbarui data karyawan terkait, unit tidak dihapus') });
      }

      const { error } = await context.dbClient.from('units').delete().eq('id', req.params.id);
      if (error) {
        logDetailedError('Unit.delete', error, { unitId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus unit kerja') });
      }

      await invalidateOrganizationCaches();
      return res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      logDetailedError('Unit.delete.endpoint', err, { unitId: req.params.id });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  // ── Departments ──
  router.post('/departments', validate(saveDepartmentSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola departemen' });
      }

      const { department } = req.body || {};
      if (!department || typeof department !== 'object') {
        return res.status(400).json({ success: false, error: 'department is required' });
      }

      const payload = normalizeSimpleNameEntity(department);
      let result;
      if (department.id) {
        const { data, error } = await context.dbClient.from('departments').update(payload).eq('id', department.id).select('*').single();
        if (error || !data) {
          logDetailedError('Department.update', error, { departmentId: department.id });
          return res.status(400).json({ success: false, error: getClientErrorMessage('department_save_failed', 'Gagal menyimpan departemen') });
        }
        result = data;
      } else {
        const { data, error } = await context.dbClient.from('departments').insert(payload).select('*').single();
        if (error || !data) {
          logDetailedError('Department.create', error, { departmentName: payload.nama });
          return res.status(400).json({ success: false, error: getClientErrorMessage('department_save_failed', 'Gagal menyimpan departemen') });
        }
        result = data;
      }

      await invalidateOrganizationCaches();
      return res.json({ success: true, data: result });
    } catch (err) {
      logDetailedError('Department.save.endpoint', err);
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  router.delete('/departments/:id', async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus departemen' });
      }

      const { data: targetDept, error: fetchError } = await context.dbClient.from('departments').select('id, nama').eq('id', req.params.id).maybeSingle();
      if (fetchError || !targetDept) {
        return res.status(404).json({ success: false, error: 'Departemen tidak ditemukan' });
      }

      // [BE-K4] Use departmentId (UUID) for employee cleanup — NOT name string.
      // String match is fragile: two similarly-named departments would corrupt wrong employees.
      // Also set null (not '') to be consistent with the schema.
      const { error: cleanupError } = await context.dbClient
        .from('employees')
        .update({ departemen: null })
        .eq('departemenId', req.params.id);

      // Fallback: also clear by name for legacy rows that only store name
      if (!cleanupError) {
        await context.dbClient
          .from('employees')
          .update({ departemen: null })
          .eq('departemen', targetDept.nama);
      }

      if (cleanupError) {
        logDetailedError('Department.cleanupEmployees', cleanupError, { departmentId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('cleanup_failed', 'Gagal memperbarui departemen karyawan terkait') });
      }

      const { error } = await context.dbClient.from('departments').delete().eq('id', req.params.id);
      if (error) {
        logDetailedError('Department.delete', error, { departmentId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus departemen') });
      }

      await invalidateOrganizationCaches();
      return res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      logDetailedError('Department.delete.endpoint', err, { departmentId: req.params.id });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  // ── Positions ──
  router.post('/positions', validate(savePositionSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat mengelola jabatan' });
      }

      const { position } = req.body || {};
      if (!position || typeof position !== 'object') {
        return res.status(400).json({ success: false, error: 'position is required' });
      }

      const payload = normalizeSimpleNameEntity(position);
      let result;
      if (position.id) {
        const { data, error } = await context.dbClient.from('positions').update(payload).eq('id', position.id).select('*').single();
        if (error || !data) {
          logDetailedError('Position.update', error, { positionId: position.id });
          return res.status(400).json({ success: false, error: getClientErrorMessage('position_save_failed', 'Gagal menyimpan jabatan') });
        }
        result = data;
      } else {
        const { data, error } = await context.dbClient.from('positions').insert(payload).select('*').single();
        if (error || !data) {
          logDetailedError('Position.create', error, { positionName: payload.nama });
          return res.status(400).json({ success: false, error: getClientErrorMessage('position_save_failed', 'Gagal menyimpan jabatan') });
        }
        result = data;
      }

      await invalidateOrganizationCaches();
      return res.json({ success: true, data: result });
    } catch (err) {
      logDetailedError('Position.save.endpoint', err);
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  router.delete('/positions/:id', async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus jabatan' });
      }

      const { data: targetPos, error: fetchError } = await context.dbClient.from('positions').select('id, nama').eq('id', req.params.id).maybeSingle();
      if (fetchError || !targetPos) {
        return res.status(404).json({ success: false, error: 'Jabatan tidak ditemukan' });
      }

      // [BE-K5] Use position name as fallback but log a warning — ideally jabatan column
      // should store positionId. For now, clear by name match with null (not '') for consistency.
      const { error: cleanupError } = await context.dbClient
        .from('employees')
        .update({ jabatan: null })
        .eq('jabatan', targetPos.nama);

      if (cleanupError) {
        logDetailedError('Position.cleanupEmployees', cleanupError, {
          positionId: req.params.id,
          positionName: targetPos.nama,
        });
        return res.status(400).json({
          success: false,
          error: getClientErrorMessage('cleanup_failed', 'Gagal memperbarui jabatan karyawan terkait'),
        });
      }

      const { error } = await context.dbClient.from('positions').delete().eq('id', req.params.id);
      if (error) {
        logDetailedError('Position.delete', error, { positionId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus jabatan') });
      }

      try {
        await invalidateOrganizationCaches();
      } catch (cacheError) {
        logDetailedError('Position.invalidateCache', cacheError, { positionId: req.params.id });
      }

      return res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      logDetailedError('Position.delete.endpoint', err, { positionId: req.params.id });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  return router;
};

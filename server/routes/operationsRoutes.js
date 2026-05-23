import express from 'express';
import { validate } from '../middleware/validate.js';
import { bulkAttendanceChangeSchema, deleteAuditLogsSchema } from '../schemas/operationsSchemas.js';

export const setupOperationsRoutes = (deps) => {
  const router = express.Router();
  const {
    getRequesterContext,
    canManageOperationalRequestsRole,
    canManageOrganizationRole,
    normalizeRequestPayload,
    logDetailedError,
    getClientErrorMessage,
  } = deps;

  // ── Attendance Change Requests ──
  router.post('/attendance-change-requests/bulk', validate(bulkAttendanceChangeSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOperationalRequestsRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Tidak memiliki izin membuat request perubahan absensi' });
      }

      const { payloads } = req.body || {};
      if (!Array.isArray(payloads) || payloads.length === 0) {
        return res.status(400).json({ success: false, error: 'payloads is required' });
      }

      // [BE-M7] Prevent DoS or Memory Exhaustion from excessively large bulk requests
      if (payloads.length > 500) {
        return res.status(400).json({ success: false, error: 'Maksimal 500 perubahan dapat diajukan dalam satu permintaan' });
      }

      const normalizedPayloads = payloads.map((payload) => ({
        ...normalizeRequestPayload(payload),
        maker_user_id: context.user.id,
        maker_employee_id: context.employee.id,
        source_portal: payload.source_portal || 'operational',
        status: payload.status || 'pending',
      }));

      const { error } = await context.dbClient
        .from('attendance_change_requests')
        .insert(normalizedPayloads);

      if (error) {
        logDetailedError('AttendanceRequest.bulkCreate', error, { count: normalizedPayloads.length });
        return res.status(400).json({ success: false, error: getClientErrorMessage('request_save_failed', 'Gagal menyimpan request') });
      }

      return res.json({ success: true, count: normalizedPayloads.length });
    } catch (err) {
      logDetailedError('AttendanceRequest.bulkCreate.endpoint', err);
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  // ── Audit Log Cleanup (Admin only) ──
  router.delete('/audit-logs', validate(deleteAuditLogsSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageOrganizationRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin yang dapat menghapus audit log' });
      }

      const { mode = 'all', days = 90 } = req.body || {};

      if (mode !== 'all' && mode !== 'old') {
        return res.status(400).json({ success: false, error: 'Mode audit log tidak valid' });
      }

      // [BE-M8] Validate days parameter to prevent accidental deletion of very recent logs
      // Minimum 30 days old to protect recent audit trails, maximum 365 days.
      if (mode === 'old') {
        if (typeof days !== 'number' || days < 30 || days > 365) {
          return res.status(400).json({ success: false, error: 'Parameter days harus berada di antara 30 dan 365 hari' });
        }
        
        const { error } = await context.dbClient.rpc('cleanup_old_audit_logs', { days_old: days });
        if (error) {
          logDetailedError('AuditLog.cleanup', error, { days });
          return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal membersihkan audit log lama') });
        }
        return res.json({ success: true, data: { deletedCount: 0 } });
      } else {
        const { error } = await context.dbClient.rpc('delete_all_audit_logs');
        if (error) {
          logDetailedError('AuditLog.deleteAll', error, {});
          return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus semua audit log') });
        }
        return res.json({ success: true, data: { deletedCount: 0 } });
      }
    } catch (err) {
      logDetailedError('AuditLog.delete.endpoint', err, {});
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
    }
  });

  return router;
};

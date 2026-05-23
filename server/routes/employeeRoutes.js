import express from 'express';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employeeSchemas.js';

export const setupEmployeeRoutes = (deps) => {
  const router = express.Router();
  const {
    getRequesterContext,
    canManageEmployeesRole,
    canDeleteEmployeesRole,
    adminSupabase,
    logDetailedError,
    getClientErrorMessage,
    invalidateEmployeeCaches,
    normalizeEmployeeData,
    normalizeEmployeeUpdateData,
    loggingService,
  } = deps;

  router.post('/', validate(createEmployeeSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageEmployeesRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin & HRD yang dapat membuat karyawan baru' });
      }

      const { employeeData, password, documents = [] } = req.body || {};
      if (!employeeData || typeof employeeData !== 'object') {
        return res.status(400).json({ success: false, error: 'employeeData is required' });
      }

      let userId = employeeData.user_id || employeeData.userId || null;

      // [BE-M3] Fail-fast email validation: Check if email is already used in profiles
      // to prevent creating an orphan auth user if profile insert fails.
      // Skip check if email is empty (allows import without email to be filled manually later)
      if (employeeData.email && String(employeeData.email).trim()) {
        const { data: existingEmail } = await context.dbClient
          .from('employees')
          .select('id')
          .eq('email', employeeData.email)
          .maybeSingle();

        if (existingEmail) {
          return res.status(400).json({ success: false, error: getClientErrorMessage('auth_create_failed', 'Gagal membuat karyawan: Email sudah terdaftar di sistem.') });
        }
      }

      // Only create auth user if both password AND email are provided
      if (password && String(password).trim() && employeeData.email && String(employeeData.email).trim()) {
        const authClient = adminSupabase || context.dbClient;
        const { data: authData, error: authError } = await authClient.auth.admin.createUser({
          email: employeeData.email,
          password: String(password),
          email_confirm: true,
          user_metadata: {
            name: employeeData.nama || employeeData.name || employeeData.email,
          },
        });

        if (authError || !authData?.user) {
          logDetailedError('Employee.create.auth', authError, { email: employeeData.email });
          return res.status(400).json({ success: false, error: getClientErrorMessage('auth_create_failed', 'Gagal membuat akun login') });
        }

        userId = authData.user.id;
      }

      const profilePayload = normalizeEmployeeData(employeeData);
      if (userId) {
        profilePayload.user_id = userId;
      }

      const { data: newEmployee, error: profileError } = await context.dbClient
        .from('employees')
        .insert(profilePayload)
        .select('*')
        .single();

      if (profileError || !newEmployee) {
        if (userId && password) {
          await (adminSupabase || context.dbClient).auth.admin.deleteUser(userId);
        }
        logDetailedError('Employee.create.profile', profileError, { userId, email: employeeData.email });
        return res.status(400).json({ success: false, error: getClientErrorMessage('profile_save_failed', 'Gagal menyimpan profil karyawan') });
      }

      if (Array.isArray(documents) && documents.length > 0) {
        const docsToInsert = documents.map((doc) => ({
          employeeId: newEmployee.id,
          name: doc?.name,
          type: doc?.type,
          fileUrl: doc?.fileUrl,
          uploadedAt: doc?.uploadedAt || new Date().toISOString(),
        }));

        const { error: docError } = await context.dbClient.from('documents').insert(docsToInsert);
        if (docError) {
          loggingService.warn('Document insert failed after employee creation', { error: docError.message });
        }
      }

      await invalidateEmployeeCaches(newEmployee);

      return res.status(201).json({
        success: true,
        data: newEmployee,
      });
    } catch (err) {
      logDetailedError('Employee.create.endpoint', err, { email: req.body?.employeeData?.email });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'Terjadi kesalahan internal. Silakan coba lagi.') });
    }
  });

  router.put('/:id', validate(updateEmployeeSchema), async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canManageEmployeesRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin & HRD yang dapat mengubah data karyawan' });
      }

      const { updateData, documents = [], newPassword = '' } = req.body || {};
      if (!updateData || typeof updateData !== 'object') {
        return res.status(400).json({ success: false, error: 'updateData is required' });
      }

      const sanitizedUpdate = normalizeEmployeeUpdateData(updateData);

      // Log sanitized payload for debugging compensation sync issues
      try {
        loggingService.info('Employee.update.received', { employeeId: req.params.id, updateKeys: Object.keys(sanitizedUpdate) });
      } catch (logErr) {
        // ignore logging failures
      }
      const updateKeys = Object.keys(sanitizedUpdate);

      if (updateKeys.length === 0) {
        loggingService.warn('Employee.update skipped empty profile payload', { employeeId: req.params.id });
      }

      const { data: targetEmployee, error: targetError } = await context.dbClient
        .from('employees')
        .select('id, user_id, nama, email')
        .eq('id', req.params.id)
        .maybeSingle();

      if (targetError || !targetEmployee) {
        logDetailedError('Employee.update.target', targetError, { employeeId: req.params.id });
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      let updatedEmployee = targetEmployee;

      if (updateKeys.length > 0) {
        const { data: dbUpdatedEmployee, error } = await context.dbClient
          .from('employees')
          .update(sanitizedUpdate)
          .eq('id', req.params.id)
          .select('*')
          .single();

        // Log DB result for debugging
        try {
          loggingService.info('Employee.update.dbResult', { employeeId: req.params.id, dbSuccess: !!dbUpdatedEmployee, dbError: error ? error.message : null });
        } catch (logErr) {
          // ignore
        }

        if (error || !dbUpdatedEmployee) {
          logDetailedError('Employee.update', error, { employeeId: req.params.id, updateKeys });
          return res.status(400).json({ success: false, error: getClientErrorMessage('profile_update_failed', 'Gagal memperbarui profil karyawan') });
        }

        updatedEmployee = dbUpdatedEmployee;
      }

      if (Array.isArray(documents)) {
        const docsToInsert = documents
          .filter((doc) => doc && doc.name && doc.fileUrl)
          .map((doc) => ({
            employeeId: req.params.id,
            name: doc.name,
            type: doc.type,
            fileUrl: doc.fileUrl,
            uploadedAt: doc.uploadedAt || new Date().toISOString(),
          }));

        try {
          // [BE-M4] Backup existing documents before deletion so we can restore on failure
          const { data: existingDocs } = await context.dbClient
            .from('documents')
            .select('*')
            .eq('employeeId', req.params.id);

          await context.dbClient
            .from('documents')
            .delete()
            .eq('employeeId', req.params.id);

          if (docsToInsert.length > 0) {
            const { error: insertDocsError } = await context.dbClient
              .from('documents')
              .insert(docsToInsert);

            if (insertDocsError) {
              logDetailedError('Employee.update.documentsInsert', insertDocsError, { employeeId: req.params.id });
              // Compensating restore: re-insert the backup snapshot
              if (existingDocs && existingDocs.length > 0) {
                await context.dbClient.from('documents').insert(existingDocs).catch((restoreErr) => {
                  logDetailedError('Employee.update.documentsRestore', restoreErr, { employeeId: req.params.id });
                });
              }
            }
          }
        } catch (docSyncError) {
          logDetailedError('Employee.update.documentsSync', docSyncError, { employeeId: req.params.id });
        }
      }

      const passwordToUse = String(newPassword || '').trim();
      if (passwordToUse) {
        if (!targetEmployee.user_id) {
          return res.status(400).json({ success: false, error: 'Karyawan belum memiliki akun login untuk direset password-nya' });
        }

        const authClient = adminSupabase || context.dbClient;
        const { error: passwordError } = await authClient.auth.admin.updateUserById(targetEmployee.user_id, {
          password: passwordToUse,
        });

        if (passwordError) {
          logDetailedError('Employee.update.password', passwordError, { employeeId: req.params.id, userId: targetEmployee.user_id });
          return res.status(400).json({ success: false, error: getClientErrorMessage('password_update_failed', 'Gagal memperbarui password akun login') });
        }
      }

      await invalidateEmployeeCaches(updatedEmployee);

      return res.json({ success: true, data: updatedEmployee });
    } catch (err) {
      logDetailedError('Employee.update.endpoint', err, { employeeId: req.params.id });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'Terjadi kesalahan internal. Silakan coba lagi.') });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const context = await getRequesterContext(req);
      if (!context.ok) {
        return res.status(context.status).json({ success: false, error: context.error });
      }

      if (!canDeleteEmployeesRole(context.role)) {
        return res.status(403).json({ success: false, error: 'Hanya admin dan HRD yang dapat menghapus karyawan' });
      }

      const { data: targetEmployee, error: fetchError } = await context.dbClient
        .from('employees')
        .select('id, user_id, nama')
        .eq('id', req.params.id)
        .maybeSingle();

      if (fetchError || !targetEmployee) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      const { error } = await context.dbClient
        .from('employees')
        .delete()
        .eq('id', req.params.id);

      if (error) {
        logDetailedError('Employee.delete', error, { employeeId: req.params.id });
        return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus data') });
      }

      await invalidateEmployeeCaches(targetEmployee);

      return res.json({ success: true, data: { id: req.params.id } });
    } catch (err) {
      logDetailedError('Employee.delete.endpoint', err, { employeeId: req.params.id });
      return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'Terjadi kesalahan internal. Silakan coba lagi.') });
    }
  });

  return router;
};

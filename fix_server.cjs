const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const startTarget = "app.delete('/api/organization/departments/:id'";
const endTarget = "app.delete('/api/organization/positions/:id'";

const startIndex = code.indexOf(startTarget);
const endIndex = code.indexOf(endTarget);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find start or end index');
    process.exit(1);
}

const cleanCode = `app.delete('/api/organization/departments/:id', async (req, res) => {
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

    const { error } = await context.dbClient.from('departments').delete().eq('id', req.params.id);
    if (error) {
      logDetailedError('Department.delete', error, { departmentId: req.params.id });
      return res.status(400).json({ success: false, error: getClientErrorMessage('delete_failed', 'Gagal menghapus departemen') });
    }

    try {
      const { error: _deptUpdateError } = await context.dbClient
        .from('employees')
        .update({ departemen: '' })
        .eq('departemen', targetDept.nama);
    } catch (e) {
      // ignore
    }

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    logDetailedError('Department.delete.endpoint', err, { departmentId: req.params.id });
    return res.status(500).json({ success: false, error: getClientErrorMessage('internal_error', 'internal_error') });
  }
});

app.post('/api/organization/positions', async (req, res) => {
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
    
    if (!payload.nama || typeof payload.nama !== 'string' || payload.nama.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nama jabatan tidak boleh kosong' });
    }

    let result;
    if (position.id) {
      const { data: existingPos } = await context.dbClient.from('positions').select('id, nama').eq('id', position.id).maybeSingle();
      if (!existingPos) return res.status(404).json({ success: false, error: 'Jabatan tidak ditemukan' });
      
      if (existingPos.nama !== payload.nama) {
        const { data: duplicatePos } = await context.dbClient.from('positions').select('id').eq('nama', payload.nama).maybeSingle();
        if (duplicatePos) return res.status(409).json({ success: false, error: \`Jabatan dengan nama "\${payload.nama}" sudah ada. Gunakan nama yang berbeda.\` });
      }

      const { data, error } = await context.dbClient.from('positions').update(payload).eq('id', position.id).select('*').single();
      if (error) {
        logDetailedError('Position.update', error, { positionId: position.id, errorCode: error.code });
        if (error.code === '23505') return res.status(409).json({ success: false, error: \`Jabatan dengan nama "\${payload.nama}" sudah ada.\` });
        return res.status(400).json({ success: false, error: 'Gagal menyimpan jabatan' });
      }
      result = data;
    } else {
      const { data: duplicatePos } = await context.dbClient.from('positions').select('id').eq('nama', payload.nama).maybeSingle();
      if (duplicatePos) return res.status(409).json({ success: false, error: \`Jabatan dengan nama "\${payload.nama}" sudah ada. Gunakan nama yang berbeda.\` });

      const { data, error } = await context.dbClient.from('positions').insert(payload).select('*').single();
      if (error) {
        logDetailedError('Position.create', error, { positionName: payload.nama, errorCode: error.code });
        if (error.code === '23505') return res.status(409).json({ success: false, error: \`Jabatan dengan nama "\${payload.nama}" sudah ada.\` });
        return res.status(400).json({ success: false, error: 'Gagal menyimpan jabatan' });
      }
      result = data;
    }
    
    if (!result) return res.status(400).json({ success: false, error: 'Gagal menyimpan jabatan' });

    await invalidateOrganizationCaches();
    return res.json({ success: true, data: result });
  } catch (err) {
    logDetailedError('Position.save.endpoint', err);
    return res.status(500).json({ success: false, error: 'Terjadi kesalahan server saat menyimpan jabatan.' });
  }
});

`;

const newCode = code.substring(0, startIndex) + cleanCode + code.substring(endIndex);
fs.writeFileSync('server.js', newCode);
console.log('Fixed server.js');

# 🎯 Quick Guide: Menggunakan Audit Log Service

## 📚 Import Service

```typescript
import { createAuditLog, getAuditLogs, getEntityHistory, getUserActivity, getRecentActivity } from '../services/auditLogService';
```

---

## ✅ Manual Logging (Custom Actions)

### **1. Log Approve/Reject Request**

```typescript
// Saat approve cuti karyawan
await createAuditLog({
    action: 'UPDATE',
    entityType: 'request',
    entityId: request.id,
    entityName: `Cuti ${employee.nama}`,
    description: `Menyetujui pengajuan cuti ${employee.nama} (${request.startDate} - ${request.endDate})`,
    oldData: { status: 'pending' },
    newData: { status: 'approved' }
});

// Saat reject reimbursement
await createAuditLog({
    action: 'UPDATE',
    entityType: 'request',
    entityId: request.id,
    entityName: `Reimbursement ${employee.nama}`,
    description: `Menolak pengajuan reimbursement ${employee.nama} - Alasan: ${rejectionReason}`,
    oldData: { status: 'pending' },
    newData: { status: 'rejected', rejectionReason }
});
```

### **2. Log Payroll Processing**

```typescript
// Saat proses payroll
await createAuditLog({
    action: 'CREATE',
    entityType: 'payroll',
    entityId: payroll.id,
    entityName: `Payroll ${month} ${year}`,
    description: `Memproses payroll untuk ${employeeCount} karyawan - Periode ${month}/${year}`,
    newData: {
        month,
        year,
        totalEmployees: employeeCount,
        totalAmount: totalPayroll
    }
});
```

### **3. Log Bulk Operations**

```typescript
// Saat import data karyawan dari Excel
await createAuditLog({
    action: 'CREATE',
    entityType: 'custom',
    description: `Mengimport ${importedCount} karyawan baru dari file Excel (${filename})`,
    newData: {
        filename,
        totalRows: importedCount,
        successCount: successCount,
        failedCount: failedCount
    }
});

// Saat bulk update gaji
await createAuditLog({
    action: 'UPDATE',
    entityType: 'custom',
    description: `Update gaji massal untuk ${affectedEmployees.length} karyawan - Kenaikan ${percentage}%`,
    oldData: { totalAffected: 0 },
    newData: { 
        totalAffected: affectedEmployees.length,
        percentage,
        employees: affectedEmployees.map(e => e.nama)
    }
});
```

---

## 📊 Query Audit Logs

### **1. Get All Recent Logs**

```typescript
const recentLogs = await getRecentActivity(50); // Last 50 activities
console.log(recentLogs);
```

### **2. Get Logs for Specific Employee**

```typescript
// History perubahan pada karyawan tertentu
const employeeHistory = await getEntityHistory('employees', employeeId);

// Tampilkan history
employeeHistory.forEach(log => {
    console.log(`${log.action} by ${log.user_name} at ${log.created_at}`);
    if (log.changes) {
        console.log('Changes:', log.changes);
    }
});
```

### **3. Get Admin Activity**

```typescript
// Semua aktivitas yang dilakukan admin tertentu
const adminLogs = await getUserActivity('admin@example.com', 100);

// Hitung statistik
const stats = {
    total: adminLogs.length,
    creates: adminLogs.filter(l => l.action === 'CREATE').length,
    updates: adminLogs.filter(l => l.action === 'UPDATE').length,
    deletes: adminLogs.filter(l => l.action === 'DELETE').length
};
```

### **4. Get Logs with Filters**

```typescript
// Semua DELETE dalam 7 hari terakhir
const deleteLogs = await getAuditLogs({
    action: 'DELETE',
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    limit: 100
});

// Semua perubahan pada department
const deptLogs = await getAuditLogs({
    entityType: 'departments',
    limit: 50
});

// Aktivitas admin hari ini
const todayLogs = await getAuditLogs({
    userEmail: 'admin@example.com',
    dateFrom: new Date().toISOString().split('T')[0], // Today
    limit: 100
});
```

---

## 🎨 Display in UI

### **1. Show Employee Change History**

```typescript
// Dalam EmployeeDetail component
const [history, setHistory] = useState([]);

useEffect(() => {
    const loadHistory = async () => {
        const logs = await getEntityHistory('employees', employee.id);
        setHistory(logs);
    };
    loadHistory();
}, [employee.id]);

return (
    <div>
        <h3>Riwayat Perubahan</h3>
        {history.map(log => (
            <div key={log.id}>
                <p>{log.description}</p>
                <small>{log.user_name} - {new Date(log.created_at).toLocaleString()}</small>
                {log.changes && (
                    <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                )}
            </div>
        ))}
    </div>
);
```

### **2. Show Request Approval Trail**

```typescript
// Tracking siapa saja yang approve/reject request
const requestHistory = await getEntityHistory('requests', requestId);

return (
    <div className="approval-trail">
        <h4>Approval Trail</h4>
        {requestHistory.map(log => (
            <div key={log.id} className="timeline-item">
                <div className={`badge ${log.action === 'UPDATE' ? 'blue' : 'green'}`}>
                    {log.action}
                </div>
                <div>
                    <strong>{log.user_name}</strong>
                    <p>{log.description}</p>
                    <small>{new Date(log.created_at).toLocaleString('id-ID')}</small>
                </div>
            </div>
        ))}
    </div>
);
```

---

## 🔔 Notification Examples

### **Alert on Suspicious Activity**

```typescript
// Check for multiple deletes by same user
const checkSuspiciousActivity = async (userEmail: string) => {
    const logs = await getAuditLogs({
        userEmail,
        action: 'DELETE',
        dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
        limit: 100
    });

    if (logs.length > 10) {
        alert(`⚠️ WARNING: ${userEmail} telah menghapus ${logs.length} data dalam 24 jam terakhir!`);
        // Send notification to super admin
    }
};
```

### **Track Salary Changes**

```typescript
// Monitor perubahan gaji
const salaryChanges = await getAuditLogs({
    entityType: 'employees',
    action: 'UPDATE'
});

const bigSalaryChanges = salaryChanges.filter(log => {
    const changes = log.changes?.changed_fields;
    if (changes?.gajiPokok) {
        const oldSalary = changes.gajiPokok.old;
        const newSalary = changes.gajiPokok.new;
        const increase = ((newSalary - oldSalary) / oldSalary) * 100;
        return increase > 20; // More than 20% increase
    }
    return false;
});

if (bigSalaryChanges.length > 0) {
    console.log(`Found ${bigSalaryChanges.length} salary changes > 20%`);
}
```

---

## 📈 Analytics Examples

### **Admin Performance Dashboard**

```typescript
const getAdminStats = async (adminEmail: string, days: number = 30) => {
    const logs = await getAuditLogs({
        userEmail: adminEmail,
        dateFrom: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        limit: 1000
    });

    return {
        totalActivities: logs.length,
        byAction: {
            creates: logs.filter(l => l.action === 'CREATE').length,
            updates: logs.filter(l => l.action === 'UPDATE').length,
            deletes: logs.filter(l => l.action === 'DELETE').length
        },
        byEntity: logs.reduce((acc, log) => {
            acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        avgPerDay: (logs.length / days).toFixed(1)
    };
};

// Usage
const stats = await getAdminStats('admin@example.com', 30);
console.log(`Total aktivitas: ${stats.totalActivities}`);
console.log(`Rata-rata per hari: ${stats.avgPerDay}`);
```

---

## ⚠️ Best Practices

1. **Jangan Over-Log**
   - Log hanya aktivitas penting
   - Jangan log setiap read/query
   - Fokus pada CREATE/UPDATE/DELETE

2. **Use Descriptive Messages**
   ```typescript
   // ❌ BAD
   description: "Updated employee"
   
   // ✅ GOOD
   description: `Mengubah data karyawan ${employee.nama} - Update gaji dari Rp ${oldSalary} ke Rp ${newSalary}`
   ```

3. **Include Context**
   ```typescript
   // ✅ Include relevant data
   await createAuditLog({
       action: 'DELETE',
       entityType: 'employee',
       entityId: employee.id,
       entityName: employee.nama,
       description: `Menghapus karyawan ${employee.nama} (NIK: ${employee.nik})`,
       oldData: employee // Save full data before delete
   });
   ```

4. **Handle Errors Gracefully**
   ```typescript
   try {
       await createAuditLog({ ... });
   } catch (error) {
       // Don't block main operation if logging fails
       console.error('Failed to create audit log:', error);
   }
   ```

---

## 🚀 Advanced: Real-time Audit Log

```typescript
// Subscribe to new audit logs (real-time)
const subscribeToAuditLogs = (callback: (log: any) => void) => {
    return supabase
        .channel('audit-logs')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs'
        }, (payload) => {
            callback(payload.new);
        })
        .subscribe();
};

// Usage
const subscription = subscribeToAuditLogs((newLog) => {
    console.log('New activity:', newLog.description);
    // Show toast notification
    showToast(`${newLog.user_name}: ${newLog.description}`);
});

// Cleanup
subscription.unsubscribe();
```

---

**✅ Sekarang Anda bisa tracking semua aktivitas admin dengan mudah!** 🎉

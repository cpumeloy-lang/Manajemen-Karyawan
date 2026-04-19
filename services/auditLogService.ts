import { supabase } from './supabaseClient';

interface CreateAuditLogParams {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: 'employee' | 'attendance' | 'request' | 'payroll' | 'unit' | 'department' | 'position' | 'custom';
    entityId?: string;
    entityName?: string;
    oldData?: any;
    newData?: any;
    description: string;
}

/**
 * Manual Audit Log Creation
 * Gunakan function ini untuk mencatat aktivitas yang tidak ter-trigger otomatis
 * 
 * @example
 * // Saat approve request
 * await createAuditLog({
 *     action: 'UPDATE',
 *     entityType: 'request',
 *     entityId: request.id,
 *     entityName: request.employeeName,
 *     description: `Menyetujui pengajuan cuti ${request.employeeName}`,
 *     oldData: { status: 'pending' },
 *     newData: { status: 'approved' }
 * });
 */
export const createAuditLog = async (params: CreateAuditLogParams) => {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('Cannot create audit log: User not authenticated');
            return null;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('employees')
            .select('nama')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Cannot create audit log: Profile not found');
            return null;
        }

        // Calculate changes if both old and new data provided
        let changes = null;
        if (params.oldData && params.newData && params.action === 'UPDATE') {
            const changedFields: any = {};
            
            Object.keys(params.newData).forEach(key => {
                if (JSON.stringify(params.oldData[key]) !== JSON.stringify(params.newData[key])) {
                    changedFields[key] = {
                        old: params.oldData[key],
                        new: params.newData[key]
                    };
                }
            });

            if (Object.keys(changedFields).length > 0) {
                changes = { changed_fields: changedFields };
            }
        }

        // Insert audit log
        const { data, error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                user_email: user.email || 'unknown',
                user_name: profile.nama,
                action: params.action,
                entity_type: params.entityType,
                entity_id: params.entityId || null,
                entity_name: params.entityName || null,
                old_data: params.oldData || null,
                new_data: params.newData || null,
                changes: changes,
                description: params.description
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating audit log:', error);
            return null;
        }

        console.log('✅ Audit log created:', data.id);
        return data;

    } catch (error) {
        console.error('Error in createAuditLog:', error);
        return null;
    }
};

/**
 * Get Audit Logs with Filters
 * 
 * @example
 * // Get all logs
 * const logs = await getAuditLogs();
 * 
 * // Get logs for specific user
 * const userLogs = await getAuditLogs({ userEmail: 'admin@example.com' });
 * 
 * // Get logs for specific entity
 * const employeeLogs = await getAuditLogs({ 
 *     entityType: 'employees', 
 *     entityId: 'xxx-xxx-xxx' 
 * });
 */
export const getAuditLogs = async (filters?: {
    action?: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType?: string;
    entityId?: string;
    userEmail?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
}) => {
    try {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.action) {
            query = query.eq('action', filters.action);
        }
        if (filters?.entityType) {
            query = query.eq('entity_type', filters.entityType);
        }
        if (filters?.entityId) {
            query = query.eq('entity_id', filters.entityId);
        }
        if (filters?.userEmail) {
            query = query.eq('user_email', filters.userEmail);
        }
        if (filters?.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }
        if (filters?.limit) {
            query = query.limit(filters.limit);
        } else {
            query = query.limit(100);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching audit logs:', error);
            return [];
        }

        return data || [];

    } catch (error) {
        console.error('Error in getAuditLogs:', error);
        return [];
    }
};

/**
 * Get Audit Logs for Specific Entity
 * Shows history of changes for a specific record
 * 
 * @example
 * const employeeHistory = await getEntityHistory('employees', employeeId);
 */
export const getEntityHistory = async (entityType: string, entityId: string) => {
    return await getAuditLogs({ entityType, entityId });
};

/**
 * Get User Activity
 * Shows all activities performed by a specific user
 * 
 * @example
 * const adminActivity = await getUserActivity('admin@example.com');
 */
export const getUserActivity = async (userEmail: string, limit: number = 100) => {
    return await getAuditLogs({ userEmail, limit });
};

/**
 * Get Recent Activity
 * Shows recent changes across all entities
 * 
 * @example
 * const recentChanges = await getRecentActivity(20);
 */
export const getRecentActivity = async (limit: number = 50) => {
    return await getAuditLogs({ limit });
};

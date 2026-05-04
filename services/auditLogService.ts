import { supabase } from './supabaseClient';

const AUDIT_LOG_UNAVAILABLE_CACHE_KEY = 'hrms.audit_logs_unavailable';

const setAuditLogUnavailableCache = (isUnavailable: boolean): void => {
    try {
        if (isUnavailable) {
            localStorage.setItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY, '1');
        } else {
            localStorage.removeItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY);
        }
    } catch {
        // Ignore storage access errors.
    }
};

const isAuditLogsTableMissingError = (error: any): boolean => {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    return (
        code === 'PGRST205' ||
        (message.includes('could not find the table') && message.includes('audit_logs')) ||
        (message.includes('audit_logs') && (message.includes('does not exist') || message.includes('not found')))
    );
};

interface CreateAuditLogParams {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    entityType: 'employee' | 'attendance' | 'request' | 'payroll' | 'unit' | 'department' | 'position' | 'custom';
    entityId?: string;
    entityName?: string;
    oldData?: any;
    newData?: any;
    description: string;
    metadata?: Record<string, any>;
    portalType?: 'personal' | 'operational';
}

const isPortalTypeColumnError = (error: any): boolean => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('portal_type') && (message.includes('column') || message.includes('does not exist'));
};

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
        let changes: any = null;
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

        if (params.metadata || params.portalType) {
            changes = {
                ...(changes || {}),
                metadata: {
                    ...(params.metadata || {}),
                    ...(params.portalType ? { portal_type: params.portalType } : {}),
                },
            };
        }

        const insertPayload: any = {
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
            description: params.description,
            portal_type: params.portalType || 'unknown',
        };

        let { data, error } = await supabase
            .from('audit_logs')
            .insert(insertPayload)
            .select()
            .single();

        // Backward compatibility for old schema that does not have portal_type column yet.
        if (error && isPortalTypeColumnError(error)) {
            delete insertPayload.portal_type;
            const fallbackResult = await supabase
                .from('audit_logs')
                .insert(insertPayload)
                .select()
                .single();
            data = fallbackResult.data;
            error = fallbackResult.error;
        }

        if (error) {
            if (isAuditLogsTableMissingError(error)) {
                setAuditLogUnavailableCache(true);
                return null;
            }

            console.error('Error creating audit log:', error);
            return null;
        }

        setAuditLogUnavailableCache(false);
        console.log('✅ Audit log created:', data.id);
        return data;

    } catch (error) {
        if (isAuditLogsTableMissingError(error)) {
            setAuditLogUnavailableCache(true);
            return null;
        }

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
    portalType?: 'personal' | 'operational';
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
        if (filters?.portalType) {
            query = query.eq('portal_type', filters.portalType);
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

        let { data, error } = await query;

        // Backward compatibility for old schema that does not have portal_type column yet.
        if (error && filters?.portalType && isPortalTypeColumnError(error)) {
            let fallbackQuery = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .contains('changes', { metadata: { portal_type: filters.portalType } });

            if (filters?.action) {
                fallbackQuery = fallbackQuery.eq('action', filters.action);
            }
            if (filters?.entityType) {
                fallbackQuery = fallbackQuery.eq('entity_type', filters.entityType);
            }
            if (filters?.entityId) {
                fallbackQuery = fallbackQuery.eq('entity_id', filters.entityId);
            }
            if (filters?.userEmail) {
                fallbackQuery = fallbackQuery.eq('user_email', filters.userEmail);
            }
            if (filters?.dateFrom) {
                fallbackQuery = fallbackQuery.gte('created_at', filters.dateFrom);
            }
            if (filters?.dateTo) {
                fallbackQuery = fallbackQuery.lte('created_at', filters.dateTo);
            }
            if (filters?.limit) {
                fallbackQuery = fallbackQuery.limit(filters.limit);
            } else {
                fallbackQuery = fallbackQuery.limit(100);
            }

            const fallbackResult = await fallbackQuery;
            data = fallbackResult.data;
            error = fallbackResult.error;
        }

        if (error) {
            if (isAuditLogsTableMissingError(error)) {
                setAuditLogUnavailableCache(true);
                return [];
            }

            console.error('Error fetching audit logs:', error);
            return [];
        }

        setAuditLogUnavailableCache(false);
        return data || [];

    } catch (error) {
        if (isAuditLogsTableMissingError(error)) {
            setAuditLogUnavailableCache(true);
            return [];
        }

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

import { useState, useEffect, useCallback, useMemo } from 'react';
import logger from '../services/logger.ts';
import { supabase } from '../services/supabaseClient.ts';

const AUDIT_LOG_UNAVAILABLE_CACHE_KEY = 'hrms.audit_logs_unavailable';
const AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY = 'hrms.audit_logs_all_sources_unavailable';

const getCachedFlag = (key: string): boolean => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
};
const setCachedFlag = (key: string, val: boolean): void => {
    try { val ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch {}
};

export interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    portal_type?: 'personal' | 'operational' | 'unknown' | string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    old_data: any;
    new_data: any;
    changes: any;
    description: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

interface BiometricAuditLogRow {
    id: string;
    employee_id: string | null;
    device_id: string | null;
    action: string;
    status: string | null;
    metadata: any;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
}

export interface AuditLogFilter {
    action: string;
    entity_type: string;
    portal_type: string;
    user_email: string;
    date_from: string;
    date_to: string;
    search: string;
}

export const getLogPortalType = (log: AuditLog): string => {
    return log.portal_type || log.changes?.metadata?.portal_type || 'unknown';
};

const mapBiometricToAuditLog = (row: BiometricAuditLogRow): AuditLog => {
    const mappedAction: AuditLog['action'] =
        row.action === 'device_registered' ? 'CREATE' :
        row.action === 'device_removed' ? 'DELETE' : 'UPDATE';

    return {
        id: row.id,
        user_id: row.employee_id || '',
        user_email: 'system@local',
        user_name: 'System',
        action: mappedAction,
        portal_type: 'operational',
        entity_type: 'biometric_device',
        entity_id: row.device_id || row.employee_id,
        entity_name: row.metadata?.device_name || 'Biometric Device Event',
        old_data: mappedAction === 'DELETE' ? row.metadata : null,
        new_data: mappedAction === 'CREATE' ? row.metadata : null,
        changes: {
            ...(mappedAction === 'UPDATE' ? { source_action: row.action } : {}),
            metadata: { ...(row.metadata || {}), portal_type: 'operational' },
        },
        description: `Biometric event: ${row.action}`,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        created_at: row.created_at,
    };
};

export function useAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditLogUnavailable, setAuditLogUnavailable] = useState(getCachedFlag(AUDIT_LOG_UNAVAILABLE_CACHE_KEY));
    const [allAuditSourcesUnavailable, setAllAuditSourcesUnavailable] = useState(getCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY));
    const [unavailableMessage, setUnavailableMessage] = useState(
        getCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY)
            ? 'Tabel audit_logs dan biometric_audit_log belum tersedia. Jalankan script setup audit log lalu klik Coba Lagi.'
            : getCachedFlag(AUDIT_LOG_UNAVAILABLE_CACHE_KEY)
            ? 'Tabel audit_logs belum tersedia. Jalankan script setup audit log terlebih dahulu.'
            : ''
    );
    const [filter, setFilter] = useState<AuditLogFilter>({
        action: 'ALL', entity_type: 'ALL', portal_type: 'ALL',
        user_email: 'ALL', date_from: '', date_to: '', search: ''
    });

    const applyClientFilters = useCallback((items: AuditLog[]): AuditLog[] => {
        return items.filter((item) => {
            if (filter.action !== 'ALL' && item.action !== filter.action) return false;
            if (filter.entity_type !== 'ALL' && item.entity_type !== filter.entity_type) return false;
            if (filter.portal_type !== 'ALL' && getLogPortalType(item) !== filter.portal_type) return false;
            if (filter.user_email !== 'ALL' && item.user_email !== filter.user_email) return false;
            if (filter.search) {
                const needle = String(filter.search || '').toLowerCase();
                const hay = `${item.description || ''} ${item.entity_name || ''}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [filter]);

    const fetchBiometricFallback = useCallback(async (): Promise<void> => {
        let query = (supabase as any)
            .from('biometric_audit_log').select('*')
            .order('created_at', { ascending: false }).limit(500);
        if (filter.date_from) query = query.gte('created_at', filter.date_from);
        if (filter.date_to) query = query.lte('created_at', filter.date_to);

        const { data, error } = await query;
        if (error) throw error;
        const mapped = (data || []).map((row: any) => mapBiometricToAuditLog(row as BiometricAuditLogRow));
        setLogs(applyClientFilters(mapped));
    }, [filter, applyClientFilters]);

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        try {
            if (allAuditSourcesUnavailable) {
                setLogs([]);
                setUnavailableMessage('Tabel audit_logs dan biometric_audit_log belum tersedia. Jalankan script setup audit log lalu klik Coba Lagi.');
                return;
            }

            if (auditLogUnavailable) {
                try {
                    await fetchBiometricFallback();
                    setUnavailableMessage('Tabel audit_logs belum tersedia. Menampilkan data dari biometric_audit_log sebagai fallback.');
                    setAllAuditSourcesUnavailable(false);
                    setCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY, false);
                } catch (fallbackError: any) {
                    setLogs([]);
                    setUnavailableMessage('Tabel audit_logs dan biometric_audit_log belum tersedia. Jalankan script setup audit log lalu klik Coba Lagi.');
                    setAllAuditSourcesUnavailable(true);
                    setCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY, true);
                }
                return;
            }

            let query = supabase.from('audit_logs').select('*')
                .order('created_at', { ascending: false }).limit(500);

            if (filter.action !== 'ALL') query = query.eq('action', filter.action);
            if (filter.entity_type !== 'ALL') query = query.eq('entity_type', filter.entity_type);
            if (filter.user_email !== 'ALL') query = query.eq('user_email', filter.user_email);
            if (filter.portal_type !== 'ALL') query = query.eq('portal_type', filter.portal_type);
            if (filter.date_from) query = query.gte('created_at', filter.date_from);
            if (filter.date_to) query = query.lte('created_at', filter.date_to);
            if (filter.search) query = query.or(`description.ilike.%${filter.search}%,entity_name.ilike.%${filter.search}%`);

            const { data, error } = await query;
            if (error) throw error;

            setLogs((data || []) as unknown as AuditLog[]);
            if (auditLogUnavailable) {
                setCachedFlag(AUDIT_LOG_UNAVAILABLE_CACHE_KEY, false);
                setAuditLogUnavailable(false);
                setUnavailableMessage('');
            }
        } catch (error: any) {
            if (error?.code === 'PGRST205' || error?.message?.includes('audit_logs')) {
                setAuditLogUnavailable(true);
                setCachedFlag(AUDIT_LOG_UNAVAILABLE_CACHE_KEY, true);
                try {
                    await fetchBiometricFallback();
                    setUnavailableMessage('Tabel audit_logs belum tersedia. Menampilkan data dari biometric_audit_log sebagai fallback.');
                    setAllAuditSourcesUnavailable(false);
                    setCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY, false);
                } catch {
                    setLogs([]);
                    setUnavailableMessage('Tabel audit_logs dan biometric_audit_log belum tersedia. Jalankan script setup audit log lalu klik Coba Lagi.');
                    setAllAuditSourcesUnavailable(true);
                    setCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY, true);
                }
                return;
            }
            logger.error('Error fetching audit logs', error);
            setUnavailableMessage(`Gagal memuat audit log: ${error?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, [filter, auditLogUnavailable, allAuditSourcesUnavailable, fetchBiometricFallback]);

    useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

    const retry = () => {
        setCachedFlag(AUDIT_LOG_UNAVAILABLE_CACHE_KEY, false);
        setCachedFlag(AUDIT_LOG_ALL_SOURCES_UNAVAILABLE_CACHE_KEY, false);
        setAuditLogUnavailable(false);
        setAllAuditSourcesUnavailable(false);
        setUnavailableMessage('');
        fetchAuditLogs();
    };

    return { logs, loading, filter, setFilter, auditLogUnavailable, unavailableMessage, retry };
}

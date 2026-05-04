import { createAuditLog } from './auditLogService';

const AUDIT_LOG_UNAVAILABLE_CACHE_KEY = 'hrms.audit_logs_unavailable';

const isAuditLogUnavailableCached = (): boolean => {
  try {
    return localStorage.getItem(AUDIT_LOG_UNAVAILABLE_CACHE_KEY) === '1';
  } catch {
    return false;
  }
};

type PortalType = 'personal' | 'operational';

export const logPortalSwitch = async (
  fromPortal: PortalType | null,
  toPortal: PortalType,
  source: 'selector' | 'toggle'
): Promise<void> => {
  if (isAuditLogUnavailableCached()) {
    return;
  }

  try {
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'custom',
      entityName: 'portal_context',
      oldData: { portal: fromPortal },
      newData: { portal: toPortal, source },
      description: `Berpindah portal dari ${fromPortal || 'none'} ke ${toPortal} melalui ${source}`,
    });
  } catch (error) {
    if (String((error as any)?.code || '').toUpperCase() === 'PGRST205') {
      return;
    }

    console.error('Failed to log portal switch:', error);
  }
};

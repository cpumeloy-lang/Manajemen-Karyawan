import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { SystemSettings } from '../types';
import { useAppDataActions, useAuth, useUI } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';
import { canManageSystemSettings, ensurePortalAccess } from '../services/portalAccessService';
import { createAuditLog } from '../services/auditLogService';

export const useSystemSettingsHandler = () => {
  const { setSystemSettings } = useAppDataActions();
  const { authUser } = useAuth();
  const { activePortal } = useUI();
  const { showSuccess, showError } = useMessageHandlers();

  const handleUpdateSystemSettings = useCallback(
    async (settings: Partial<SystemSettings>, currentSettingsId?: string) => {
      try {
        const portalError = ensurePortalAccess(activePortal, 'operational', 'Perbarui pengaturan sistem');
        if (portalError) {
          showError('Akses ditolak', portalError);
          return;
        }

        if (!canManageSystemSettings(authUser?.profile.role)) {
          showError('Akses ditolak', 'Role Anda tidak memiliki izin memperbarui pengaturan sistem.');
          return;
        }

        if (!currentSettingsId) {
          throw new Error('System settings ID tidak ditemukan');
        }

        const { data, error } = await supabase
          .from('system_settings')
          .update(settings as any)
          .eq('id', currentSettingsId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setSystemSettings(data as unknown as SystemSettings);

          await createAuditLog({
            action: 'UPDATE',
            entityType: 'custom',
            entityId: currentSettingsId,
            entityName: 'system_settings',
            newData: settings,
            description: 'Memperbarui pengaturan sistem',
            portalType: 'operational',
            metadata: { source: 'useSystemSettingsHandler.handleUpdateSystemSettings' },
          });

          showSuccess('Pengaturan sistem berhasil diperbarui!');
        }
      } catch (error: any) {
        showError('Gagal memperbarui pengaturan sistem', error);
        throw error;
      }
    },
    [activePortal, authUser, setSystemSettings, showSuccess, showError]
  );

  return {
    handleUpdateSystemSettings,
  };
};

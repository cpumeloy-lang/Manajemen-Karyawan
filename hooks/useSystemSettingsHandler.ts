import { useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { SystemSettings } from '../types';
import { useAppDataActions } from '../stores/appStore';
import { useMessageHandlers } from './useMessageHandlers';

export const useSystemSettingsHandler = () => {
  const { setSystemSettings } = useAppDataActions();
  const { showSuccess, showError } = useMessageHandlers();

  const handleUpdateSystemSettings = useCallback(
    async (settings: Partial<SystemSettings>, currentSettingsId?: string) => {
      try {
        if (!currentSettingsId) {
          throw new Error('System settings ID tidak ditemukan');
        }

        const { data, error } = await supabase
          .from('system_settings')
          .update(settings)
          .eq('id', currentSettingsId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setSystemSettings(data);
          showSuccess('Pengaturan sistem berhasil diperbarui!');
        }
      } catch (error: any) {
        showError('Gagal memperbarui pengaturan sistem', error);
        throw error;
      }
    },
    [setSystemSettings, showSuccess, showError]
  );

  return {
    handleUpdateSystemSettings,
  };
};

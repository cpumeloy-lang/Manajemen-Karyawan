import { supabase } from '../services/supabaseClient.ts';

/**
 * Retrieves the current session token and formats it as an Authorization header
 * [HK-min6] Extracted to shared utility to prevent duplication across hooks
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

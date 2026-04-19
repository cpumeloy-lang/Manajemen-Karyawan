import { useEffect, useState } from 'react';
import { getSupabaseHealthCheckUrl } from '../config/supabase';

export function useConnectivity() {
  const [isLanReachable, setIsLanReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      setIsChecking(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(getSupabaseHealthCheckUrl(), { signal: controller.signal });
        clearTimeout(timeout);
        if (mounted) setIsLanReachable(response.ok);
      } catch {
        if (mounted) setIsLanReachable(false);
      } finally {
        if (mounted) setIsChecking(false);
      }
    };

    void ping();
    const timer = setInterval(() => void ping(), 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return { isLanReachable, isChecking };
}

import { useEffect, useState } from 'react';
import { offlineQueue, type QueuedAttendanceAction } from '../services/offlineQueue';

/** React hook ringan untuk membaca isi antrian offline secara reaktif. */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedAttendanceAction[]>([]);

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe(setQueue);
    return () => {
      unsubscribe();
    };
  }, []);

  return queue;
}

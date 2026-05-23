import { createClient } from 'redis';
import { loggingService } from './loggingService.js';

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

let client;
let connecting = false;

export const getRedisClient = async () => {
  if (client && client.isOpen) return client;
  if (connecting) {
    // wait until connected
    let attempts = 0;
    while (connecting && attempts < 50) {
      // small sleep
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (client && client.isOpen) return client;
  }

  client = createClient({ url: REDIS_URL, password: process.env.REDIS_PASSWORD || undefined, disableOfflineQueue: true });
  connecting = true;
  client.on('error', (err) => {
    loggingService.error('Redis client error', { error: err.message || err });
  });
  try {
    await client.connect();
  } catch (err) {
    loggingService.error('Failed to connect redis client', { error: err && err.message ? err.message : err });
  }
  connecting = false;
  return client;
};

export const getRedisInfo = async () => {
  const c = await getRedisClient().catch(() => null);
  if (!c || !c.isOpen) return null;
  try {
    const info = await c.info();
    const lines = info.split('\n').map(l => l.trim()).filter(Boolean);
    const stats = {};
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const [k, v] = line.split(':');
      if (!k || v === undefined) continue;
      stats[k] = v;
    }
    return {
      connected_clients: parseInt(stats.connected_clients || '0', 10),
      used_memory: parseInt(stats.used_memory || '0', 10),
      total_connections_received: parseInt(stats.total_connections_received || '0', 10),
      keyspace_hits: parseInt(stats.keyspace_hits || '0', 10),
      keyspace_misses: parseInt(stats.keyspace_misses || '0', 10),
    };
  } catch (err) {
    return null;
  }
};

export default { getRedisClient, getRedisInfo };

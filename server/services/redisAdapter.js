import { getRedisInfo } from './redisClient.js';

export async function getRedisStats() {
  try {
    return await getRedisInfo();
  } catch (err) {
    return null;
  }
}

export default getRedisStats;

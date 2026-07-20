import { redisConnection } from '../redis';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 900;
const COUNTER_WINDOW_SECONDS = 300;

export class RateLimiterService {
  async recordFailedAttempt(identifier: string): Promise<void> {
    try {
      const key = `failed_login:${identifier}`;
      const attempts = await redisConnection.incr(key);
      if (attempts === 1) await redisConnection.expire(key, COUNTER_WINDOW_SECONDS);
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await redisConnection.set(`lockout:${identifier}`, '1', { EX: LOCKOUT_DURATION_SECONDS });
      }
    } catch {
      // Redis unavailable; fail safe by doing nothing
    }
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    try {
      const locked = await redisConnection.get(`lockout:${identifier}`);
      return locked === '1';
    } catch {
      return true;
    }
  }

  async getFailedAttempts(identifier: string): Promise<number> {
    try {
      const val = await redisConnection.get(`failed_login:${identifier}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async clearFailedAttempts(identifier: string): Promise<void> {
    try {
      await redisConnection.del(`failed_login:${identifier}`);
      await redisConnection.del(`lockout:${identifier}`);
    } catch {
      // Best effort clear
    }
  }
}

export const rateLimiter = new RateLimiterService();

import * as crypto from 'crypto';
import { redisConnection } from '../redis';

const SESSION_TTL_SECONDS = 900;

interface SessionData {
  sessionToken: string;
  username: string;
  role: string;
  loginTime: string;
  ip?: string;
  deviceFingerprint?: string;
  invalidated?: boolean;
}

export class SessionService {
  async createSession(userId: string, sessionData: Omit<SessionData, 'sessionToken'>): Promise<string> {
    const key = `session:${userId}`;
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const data: SessionData = { ...sessionData, sessionToken };
    await redisConnection.set(key, JSON.stringify(data), { EX: SESSION_TTL_SECONDS });
    return sessionToken;
  }

  async validateSession(userId: string, sessionToken: string): Promise<boolean> {
    try {
      const session = await redisConnection.get(`session:${userId}`);
      if (!session) return false;
      const data: SessionData = JSON.parse(session);
      if (data.invalidated) return false;
      return data.sessionToken === sessionToken;
    } catch {
      return false;
    }
  }

  async invalidateSession(userId: string): Promise<void> {
    await redisConnection.del(`session:${userId}`);
  }

  async refreshSessionTtl(userId: string): Promise<void> {
    await redisConnection.expire(`session:${userId}`, SESSION_TTL_SECONDS);
  }
}

export const sessionService = new SessionService();

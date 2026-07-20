import * as crypto from 'crypto';
import { redisConnection } from '../redis';

const OTP_TTL_SECONDS = 300;
const KNOWN_DEVICE_TTL_SECONDS = 2592000;

export class OtpService {
  async isKnownDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      const key = `known_device:${userId}:${deviceFingerprint}`;
      const exists = await redisConnection.exists(key);
      if (exists) await redisConnection.expire(key, KNOWN_DEVICE_TTL_SECONDS);
      return exists === 1;
    } catch {
      return false;
    }
  }

  async registerDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const key = `known_device:${userId}:${deviceFingerprint}`;
    await redisConnection.set(key, '1', { EX: KNOWN_DEVICE_TTL_SECONDS });
  }

  async generateOtp(userId: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    await redisConnection.set(`otp:${userId}`, otp, { EX: OTP_TTL_SECONDS });
    return otp;
  }

  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    try {
      const stored = await redisConnection.get(`otp:${userId}`);
      if (!stored || stored !== otp) return false;
      await redisConnection.del(`otp:${userId}`);
      return true;
    } catch {
      return false;
    }
  }
}

export const otpService = new OtpService();

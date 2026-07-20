import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { retrieveSecret, storeSecret } from '../services/secretStore';

const JWT_SECRET_KEY = 'jwt-secret';

export interface TokenPayload {
  userId: string;
  username: string;
  role: '1-Administrator' | '1-Bank Officer';
  type: 'access' | 'refresh' | 'otp_challenge' | 'unlock_session';
  deviceFingerprint?: string;
  nonce?: string;
}

export interface UnlockSessionPayload {
  type: 'unlock_session';
  officer_id: string;
  admin_id: string;
  nonce: string;
  iat?: number;
  exp?: number;
}

export async function getJwtSecret(): Promise<string> {
  const existing = await retrieveSecret(JWT_SECRET_KEY);
  if (existing) return existing;
  const newSecret = crypto.randomBytes(64).toString('hex');
  await storeSecret(JWT_SECRET_KEY, newSecret);
  return newSecret;
}

export async function issueAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const secret = await getJwtSecret();
  return jwt.sign(
    { ...payload, type: 'access' },
    secret,
    { expiresIn: '15m' }
  );
}

export async function issueRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const secret = await getJwtSecret();
  return jwt.sign(
    { ...payload, type: 'refresh' },
    secret,
    { expiresIn: '7d' }
  );
}

export async function issueOtpChallengeToken(payload: Pick<TokenPayload, 'userId' | 'username' | 'role' | 'deviceFingerprint'>): Promise<string> {
  const secret = await getJwtSecret();
  return jwt.sign(
    { ...payload, type: 'otp_challenge' },
    secret,
    { expiresIn: '5m' }
  );
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = await getJwtSecret();
  return jwt.verify(token, secret) as TokenPayload;
}

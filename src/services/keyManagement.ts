import * as crypto from 'crypto';
import { storeSecret, retrieveSecret } from './secretStore';

const KEY_NAME = 'aes-256-key';

export async function getEncryptionKey(): Promise<string> {
  const existingKey = await retrieveSecret(KEY_NAME);
  if (existingKey) {
    return existingKey;
  }
  const newKey = crypto.randomBytes(32).toString('hex');
  await storeSecret(KEY_NAME, newKey);
  return newKey;
}

export async function rotateEncryptionKey(): Promise<string> {
  const newKey = crypto.randomBytes(32).toString('hex');
  await storeSecret(KEY_NAME, newKey);
  return newKey;
}

export function generateCryptoKey(): { key: string; iv: string } {
  const key = crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(12).toString('hex');
  return { key, iv };
}

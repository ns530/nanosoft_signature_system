import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const STORE_DIR = path.join(process.env.APPDATA || process.env.HOME || '.', 'holcemlk_secure');
const STORE_PATH = path.join(STORE_DIR, 'secrets.json');
const TEMP_PATH = `${STORE_PATH}.tmp`;
const FILE_LOCK_KEY = 'SECRETS_FILE_LOCK';

// Simple mutex implementation
const locks = new Map<string, Promise<void>>();

async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  while (locks.has(FILE_LOCK_KEY)) {
    await locks.get(FILE_LOCK_KEY);
  }

  const promise = fn().finally(() => {
    locks.delete(FILE_LOCK_KEY);
  });

  locks.set(FILE_LOCK_KEY, promise.then(() => {}));
  return promise;
}

async function ensureSecureStore() {
  try {
    // Only set directory ACLs if we actually create the directory
    try {
      await fs.access(STORE_DIR);
    } catch {
      await fs.mkdir(STORE_DIR, { recursive: true });
      if (process.platform === 'win32') {
        execSync(`icacls "${STORE_DIR}" /inheritance:r /grant:r "${process.env.USERNAME}":F`);
      }
    }

    // Always set file ACLs when creating the file
    try {
      await fs.access(STORE_PATH);
    } catch {
      await fs.writeFile(STORE_PATH, '{}');
      if (process.platform === 'win32') {
        execSync(`icacls "${STORE_PATH}" /inheritance:r /grant:r "${process.env.USERNAME}":F`);
      }
    }
  } catch (err) {
    console.error('Failed to initialize secure store:', err);
    throw err;
  }
}

export async function storeSecret(key: string, value: string): Promise<void> {
  return withFileLock(async () => {
    await ensureSecureStore();
    const secrets = JSON.parse(await fs.readFile(STORE_PATH, 'utf-8'));
    secrets[key] = value;
    
    // Atomic write via temp file
    await fs.writeFile(TEMP_PATH, JSON.stringify(secrets));
    await fs.rename(TEMP_PATH, STORE_PATH);
  });
}

export async function retrieveSecret(key: string): Promise<string | null> {
  return withFileLock(async () => {
    await ensureSecureStore();
    const secrets = JSON.parse(await fs.readFile(STORE_PATH, 'utf-8'));
    return secrets[key] || null;
  });
}
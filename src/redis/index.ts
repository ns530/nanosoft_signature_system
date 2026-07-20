import { createClient } from 'redis';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

const CA_CERT_PATH = path.join(__dirname, '../../config/redis-ca.pem');

export enum RedisConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

function getRedisTlsConfig(): Record<string, unknown> {
  if (!fs.existsSync(CA_CERT_PATH)) {
    throw new Error(
      `Redis CA certificate not found at ${CA_CERT_PATH}. ` +
      'TLS verification requires the CA cert. Place it in config/ directory.'
    );
  }
  return {
    ca: fs.readFileSync(CA_CERT_PATH),
    rejectUnauthorized: true
  };
}

class RedisConnection extends EventEmitter {
  private client: ReturnType<typeof createClient> | null = null;
  private state: RedisConnectionState = RedisConnectionState.DISCONNECTED;
  private readonly maxRetries = 5;

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    const tlsConfig = getRedisTlsConfig();
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        tls: true,
        ca: tlsConfig.ca as Buffer,
        rejectUnauthorized: true,
        reconnectStrategy: (retries: number) => {
          if (retries >= this.maxRetries) {
            this.state = RedisConnectionState.DISCONNECTED;
            this.emit('maxRetriesReached');
            return new Error('Redis max reconnection attempts reached');
          }
          this.state = RedisConnectionState.RECONNECTING;
          this.emit('stateChange', RedisConnectionState.RECONNECTING);
          return Math.min(retries * 100, 5000);
        }
      }
    });

    this.client.on('connect', () => {
      this.state = RedisConnectionState.CONNECTED;
      this.emit('stateChange', RedisConnectionState.CONNECTED);
    });

    this.client.on('error', (err: Error) => {
      this.state = RedisConnectionState.DISCONNECTED;
      this.emit('error', err);
      this.emit('stateChange', RedisConnectionState.DISCONNECTED);
    });

    this.client.on('end', () => {
      this.state = RedisConnectionState.DISCONNECTED;
      this.emit('stateChange', RedisConnectionState.DISCONNECTED);
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.isOpen) {
      return false;
    }
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  getState(): RedisConnectionState {
    return this.state;
  }

  getClient() {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    return this.client.get(key);
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<void> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    await this.client.set(key, value, options);
  }

  async exists(key: string): Promise<number> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    return this.client.exists(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    await this.client.expire(key, seconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    await this.client.del(key);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    if (!this.client || !this.client.isOpen) throw new Error('Redis not connected');
    return (this.client as any).eval(script, {
      keys,
      arguments: args
    });
  }
}

export const redisConnection = new RedisConnection();

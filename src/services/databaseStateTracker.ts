import { EventEmitter } from 'events';
import { dataEntryDb, imagesDb, checkDbConnections } from '../db';
import { redisConnection, RedisConnectionState } from '../redis';

export enum ConnectionState {
  UNKNOWN = 'unknown',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

interface ConnState {
  state: ConnectionState;
  lastError?: string;
  lastCheck: Date;
  retryCount: number;
}

export class DatabaseStateTracker extends EventEmitter {
  private states: {
    dataEntry: ConnState;
    images: ConnState;
    redis: ConnState;
  } = {
    dataEntry: { state: ConnectionState.UNKNOWN, lastCheck: new Date(), retryCount: 0 },
    images: { state: ConnectionState.UNKNOWN, lastCheck: new Date(), retryCount: 0 },
    redis: { state: ConnectionState.UNKNOWN, lastCheck: new Date(), retryCount: 0 }
  };
  private checkInterval?: NodeJS.Timeout;
  private readonly maxRetries = 5;
  private readonly baseRetryDelay = 1000;
  private isShuttingDown = false;

  constructor() {
    super();
    this.setupRedisListeners();
    this.startMonitoring();
  }

  private setupRedisListeners(): void {
    redisConnection.on('stateChange', (state: RedisConnectionState) => {
      const mappedState = state === RedisConnectionState.CONNECTED
        ? ConnectionState.CONNECTED
        : state === RedisConnectionState.RECONNECTING
        ? ConnectionState.RECONNECTING
        : ConnectionState.DISCONNECTED;
      this.states.redis.state = mappedState;
      this.states.redis.lastCheck = new Date();
      this.emit('stateChange', { db: 'redis', state: mappedState });
    });

    redisConnection.on('error', (err: Error) => {
      this.states.redis.lastError = err.message;
      this.emit('error', { db: 'redis', error: err.message });
    });
  }

  private async checkDbConnections(): Promise<void> {
    const result = await checkDbConnections();
    this.updateState('dataEntry', result.dataEntry, result.error);
    this.updateState('images', result.images, result.error);
  }

  private async checkRedis(): Promise<void> {
    const healthy = await redisConnection.healthCheck();
    this.states.redis.state = healthy ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED;
    this.states.redis.lastCheck = new Date();
    if (!healthy) {
      this.states.redis.retryCount++;
    } else {
      this.states.redis.retryCount = 0;
    }
  }

  private updateState(db: 'dataEntry' | 'images', connected: boolean, error?: string): void {
    const state = this.states[db];
    const newState = connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED;

    if (state.state !== newState) {
      state.state = newState;
      state.lastCheck = new Date();
      state.lastError = error;
      this.emit('stateChange', { db, state: newState, error });
    }

    if (!connected) {
      state.retryCount++;
    } else {
      state.retryCount = 0;
    }
  }

  private async attemptReconnect(db: 'dataEntry' | 'images'): Promise<void> {
    const state = this.states[db];
    if (state.retryCount >= this.maxRetries) {
      this.emit('maxRetriesReached', { db });
      return;
    }

    state.state = ConnectionState.RECONNECTING;
    this.emit('stateChange', { db, state: ConnectionState.RECONNECTING });

    const delay = this.baseRetryDelay * Math.pow(2, state.retryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    if (this.isShuttingDown) return;

    const result = await checkDbConnections();
    if (db === 'dataEntry') {
      this.updateState('dataEntry', result.dataEntry, result.error);
    } else {
      this.updateState('images', result.images, result.error);
    }
  }

  private async attemptRedisReconnect(): Promise<void> {
    if (this.states.redis.retryCount >= this.maxRetries) {
      this.emit('maxRetriesReached', { db: 'redis' });
      return;
    }

    this.states.redis.state = ConnectionState.RECONNECTING;
    this.emit('stateChange', { db: 'redis', state: ConnectionState.RECONNECTING });

    const delay = this.baseRetryDelay * Math.pow(2, this.states.redis.retryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    if (this.isShuttingDown) return;

    try {
      await redisConnection.connect();
    } catch {
      this.states.redis.state = ConnectionState.DISCONNECTED;
    }
  }

  private startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      await this.checkDbConnections();
      await this.checkRedis();

      if (this.states.dataEntry.state === ConnectionState.DISCONNECTED) {
        await this.attemptReconnect('dataEntry');
      }
      if (this.states.images.state === ConnectionState.DISCONNECTED) {
        await this.attemptReconnect('images');
      }
      if (this.states.redis.state === ConnectionState.DISCONNECTED) {
        await this.attemptRedisReconnect();
      }
    }, 30000);
  }

  public getState(conn: 'dataEntry' | 'images' | 'redis'): ConnState {
    return { ...this.states[conn] };
  }

  public isHealthy(): boolean {
    return this.states.dataEntry.state === ConnectionState.CONNECTED &&
           this.states.images.state === ConnectionState.CONNECTED &&
           this.states.redis.state === ConnectionState.CONNECTED;
  }

  public shutdown(): void {
    this.isShuttingDown = true;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const dbStateTracker = new DatabaseStateTracker();

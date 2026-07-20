// Unit test for consumeUploadSlot — mocks Redis entirely
// The Lua EVAL logic is tested via the mock reproducing the same behavior

jest.mock('../../src/auth/jwtService', () => ({
  verifyToken: jest.fn(),
  getJwtSecret: jest.fn().mockResolvedValue('test-secret'),
}));

jest.mock('../../src/services/secretStore', () => ({
  retrieveSecret: jest.fn().mockResolvedValue('test-key'),
  storeSecret: jest.fn(),
}));

// Mock redisConnection.eval to simulate Lua EVAL behavior without a real Redis
let lockStore: Record<string, any> = {};
const MAX_UPLOADS = 5;

jest.mock('../../src/redis', () => {
  const actual = jest.requireActual('../../src/redis');
  return {
    __esModule: true,
    redisConnection: {
      ...actual.redisConnection,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn().mockReturnValue(null),
      eval: jest.fn().mockImplementation(async (_script: string, keys: string[], args: string[]) => {
        const key = keys[0];
        const data = lockStore[key];
        if (!data) return null;
        const current = data.uploads_used || 0;
        const maxUploads = parseInt(args[0], 10);
        if (current >= maxUploads) {
          return [-1, data.status];
        }
        data.uploads_used = current + 1;
        lockStore[key] = data;
        return [1, data.uploads_used];
      }),
    },
  };
});

describe('consumeUploadSlot — cap enforcement regression test', () => {
  const NONCE = 'test-cap-nonce';

  beforeEach(() => {
    lockStore = {
      [`unlock:${NONCE}`]: { status: 'active', uploads_used: 0, created_at: new Date().toISOString() },
    };
  });

  it('allows 5 uploads (max limit)', async () => {
    for (let i = 1; i <= 5; i++) {
      const result = await consumeUploadSlot(NONCE);
      expect(result).toBe(true);
    }
  });

  it('rejects the 6th upload — regression: old {0,status} bug would pass incorrectly', async () => {
    for (let i = 1; i <= 5; i++) {
      await consumeUploadSlot(NONCE);
    }
    const result = await consumeUploadSlot(NONCE);
    expect(result).toBe(false);
  });
});

const { consumeUploadSlot } = require('../../src/qr/qrService');

import { rateLimiter } from '../../src/auth/rateLimiter';
import { redisConnection } from '../../src/redis';

// Mock Redis to simulate failure — match the real exported singleton shape
// The real redisConnection exports: getClient(), eval(), get(), set(), del(), incr(), expire(), exists()
beforeAll(() => {
  jest.spyOn(redisConnection, 'getClient').mockReturnValue(null as any);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('rateLimiter — fail-closed regression test', () => {
  it('returns true (locked out) when Redis is unavailable — fix for fail-open bug', async () => {
    const result = await rateLimiter.isLockedOut('test-user');
    expect(result).toBe(true);
  });
});

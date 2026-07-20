import { verifyToken, TokenPayload, UnlockSessionPayload } from '../../src/auth/jwtService';

jest.mock('../../src/services/secretStore', () => ({
  retrieveSecret: jest.fn().mockResolvedValue('my-secret-key-with-64-chars-hex-hex-hex-hex'),
  storeSecret: jest.fn(),
}));

const MOCK_SECRET = 'my-secret-key-with-64-chars-hex-hex-hex-hex';

describe('Token type discrimination', () => {
  it('verifies unlock_session token type correctly', async () => {
    const jwt = require('jsonwebtoken');
    const unlockPayload: UnlockSessionPayload = {
      type: 'unlock_session',
      officer_id: 'USR-002',
      admin_id: 'USR-001',
      nonce: 'test-nonce',
      iat: Math.floor(Date.now() / 1000),
    };
    const token = jwt.sign(unlockPayload, MOCK_SECRET);

    const payload = await verifyToken(token) as unknown as UnlockSessionPayload;
    expect(payload.type).toBe('unlock_session');
    expect(payload.officer_id).toBe('USR-002');
  });

  it('rejects access tokens as unlock_session', async () => {
    const jwt = require('jsonwebtoken');
    const accessPayload = { userId: 'USR-001', type: 'access', role: '1-Administrator' };
    const token = jwt.sign(accessPayload, MOCK_SECRET);

    const payload = await verifyToken(token);
    expect(payload.type).not.toBe('unlock_session');
  });
});

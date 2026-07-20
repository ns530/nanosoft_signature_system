import { Router, Request, Response } from 'express';
import { authService } from './authService';
import { findUserByUsername, SystemUser } from './userRepository';
import { issueAccessToken, issueRefreshToken, issueOtpChallengeToken } from './jwtService';
import { otpService } from './otpService';
import { sessionService } from './sessionService';
import { rateLimiter } from './rateLimiter';
import { AuthenticatedRequest, authenticateToken } from './rbacMiddleware';
import { logEvent } from '../audit/auditLogService';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (forwarded as string).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function getValidPassword(user: SystemUser): string | null {
  if (user.web_password) return user.web_password;
  if (user.MobilePassword) return user.MobilePassword;
  return null;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, deviceFingerprint } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const ip = getClientIp(req);
    const identifier = username;

    const locked = await rateLimiter.isLockedOut(identifier);
    if (locked) {
      res.status(429).json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' });
      return;
    }

    const user = await findUserByUsername(username);
    if (!user) {
      await rateLimiter.recordFailedAttempt(identifier);
      await logEvent('LOGIN_FAILED', username, ip, deviceFingerprint || null, { reason: 'user_not_found' });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = getValidPassword(user);
    if (!validPassword) {
      await rateLimiter.recordFailedAttempt(identifier);
      await logEvent('LOGIN_FAILED', user.UserID, ip, deviceFingerprint || null, { reason: 'no_valid_password_field' });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordValid = await authService.verifyPassword(password, validPassword);
    if (!passwordValid) {
      await rateLimiter.recordFailedAttempt(identifier);
      await logEvent('LOGIN_FAILED', user.UserID, ip, deviceFingerprint || null, { reason: 'password_mismatch' });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.role !== '1-Administrator' && user.role !== '1-Bank Officer') {
      await logEvent('LOGIN_FAILED', user.UserID, ip, deviceFingerprint || null, { reason: 'invalid_role', role: user.role });
      res.status(403).json({ error: 'Access denied: invalid role' });
      return;
    }

    await rateLimiter.clearFailedAttempts(identifier);

    const userPayload = {
      userId: user.UserID,
      username: user.UserName,
      role: user.role as '1-Administrator' | '1-Bank Officer',
      deviceFingerprint
    };

    if (deviceFingerprint) {
      const known = await otpService.isKnownDevice(user.UserID, deviceFingerprint);
      if (!known) {
        const otp = await otpService.generateOtp(user.UserID);
        const otpToken = await issueOtpChallengeToken(userPayload);
        await logEvent('LOGIN', user.UserID, ip, deviceFingerprint || null, { status: 'otp_required' });
        res.status(202).json({
          otpRequired: true,
          otpToken,
          message: 'OTP sent to registered mobile number'
        });
        return;
      }
    }

    const sessionToken = await sessionService.createSession(user.UserID, {
      username: user.UserName,
      role: user.role,
      loginTime: new Date().toISOString(),
      ip,
      deviceFingerprint
    });

    const accessToken = await issueAccessToken(userPayload);
    const refreshToken = await issueRefreshToken(userPayload);

    await logEvent('LOGIN', user.UserID, ip, deviceFingerprint || null, { status: 'success' });

    res.json({
      accessToken,
      refreshToken,
      sessionToken,
      role: user.role,
      username: user.UserName
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/otp/verify', async (req: Request, res: Response) => {
  try {
    const { otpToken, otp } = req.body;
    if (!otpToken || !otp) {
      res.status(400).json({ error: 'OTP token and code required' });
      return;
    }

    const ip = getClientIp(req);
    const { verifyToken } = await import('./jwtService');
    const payload = await verifyToken(otpToken);
    if (payload.type !== 'otp_challenge') {
      res.status(401).json({ error: 'Invalid OTP token type' });
      return;
    }

    const valid = await otpService.verifyOtp(payload.userId, otp);
    if (!valid) {
      await logEvent('LOGIN_FAILED', payload.userId, ip, payload.deviceFingerprint || null, { reason: 'invalid_otp' });
      res.status(401).json({ error: 'Invalid or expired OTP' });
      return;
    }

    await otpService.registerDevice(payload.userId, payload.deviceFingerprint || '');

    const userPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      deviceFingerprint: payload.deviceFingerprint
    };

    const otpSessionToken = await sessionService.createSession(payload.userId, {
      username: payload.username,
      role: payload.role,
      loginTime: new Date().toISOString()
    });

    const accessToken = await issueAccessToken(userPayload);
    const refreshToken = await issueRefreshToken(userPayload);

    await logEvent('LOGIN', payload.userId, ip, payload.deviceFingerprint || null, { status: 'otp_success' });

    res.json({ accessToken, refreshToken, sessionToken: otpSessionToken, role: payload.role, username: payload.username });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const { verifyToken, issueAccessToken, issueRefreshToken } = await import('./jwtService');
    const payload = await verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const userPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      deviceFingerprint: payload.deviceFingerprint
    };

    const newAccessToken = await issueAccessToken(userPayload);
    const newRefreshToken = await issueRefreshToken(userPayload);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user) {
      await sessionService.invalidateSession(req.user.userId);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/session/validate', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const sessionToken = req.headers['x-session-token'] as string;
    if (!sessionToken) {
      res.status(401).json({ error: 'Session token required' });
      return;
    }
    const valid = await sessionService.validateSession(req.user.userId, sessionToken);
    if (!valid) {
      res.status(401).json({ error: 'Session invalidated - concurrent login detected' });
      return;
    }
    await sessionService.refreshSessionTtl(req.user.userId);
    res.json({ valid: true, role: req.user.role, username: req.user.username });
  } catch (err) {
    console.error('Session validate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

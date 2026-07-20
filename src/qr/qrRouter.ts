import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../auth/rbacMiddleware';
import { generateQrSession, validateQrToken } from './qrService';
import { logEvent } from '../audit/auditLogService';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (forwarded as string).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

router.post('/admin/qr/generate',
  authenticateToken,
  requireRole('1-Administrator'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const qrToken = await generateQrSession(req.user.userId);
      const ip = getClientIp(req);
      const detail = { admin_id: req.user.userId };
      await logEvent('QR_GENERATED', req.user.userId, ip, req.user.deviceFingerprint || null, detail);
      res.json({ qrToken, expiresIn: 900 });
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post('/officer/qr/validate',
  authenticateToken,
  requireRole('1-Bank Officer'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { qrToken } = req.body;
      if (!qrToken) {
        res.status(400).json({ error: 'QR token required' });
        return;
      }

      const result = await validateQrToken(qrToken, req.user.userId);
      const ip = getClientIp(req);
      const detail = { nonce: result.nonce, officer_id: req.user.userId };
      await logEvent('QR_VALIDATED', req.user.userId, ip, req.user.deviceFingerprint || null, detail);
      res.json({ unlockToken: result.unlockToken });
    } catch (err: any) {
      if (err && err.status && err.message) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error('QR validation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

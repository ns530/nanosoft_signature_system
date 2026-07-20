import { Router, Request, Response } from 'express';
import { processImageUpload } from './imageUploadService';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (forwarded as string).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function getRawBody(req: Request): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

router.post('/officer/customer/:customerId/image', async (req: Request, res: Response) => {
  try {
    const unlockToken = req.headers['x-unlock-token'] as string;
    if (!unlockToken) {
      res.status(401).json({ error: 'Unlock session token required' });
      return;
    }

    const rawCustomerId = req.params.customerId;
    const customerId = typeof rawCustomerId === 'string' ? rawCustomerId.trim() : '';
    if (!customerId) {
      res.status(400).json({ error: 'Customer ID required' });
      return;
    }

    const imageType = req.headers['x-image-type'] as string;
    if (!imageType || !['profile_picture', 'signature'].includes(imageType)) {
      res.status(400).json({ error: 'Valid image type required (profile_picture or signature)' });
      return;
    }

    const rawBody = await getRawBody(req);
    if (!rawBody || rawBody.length === 0) {
      res.status(400).json({ error: 'Image data required' });
      return;
    }

    const ip = getClientIp(req);
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string || null;

    const result = await processImageUpload(unlockToken, customerId, rawBody, imageType, ip, deviceFingerprint);
    res.status(201).json({ imageId: result.imageId });
  } catch (err: any) {
    if (err && err.status && err.message) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

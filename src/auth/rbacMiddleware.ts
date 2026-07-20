import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwtService';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: '1-Administrator' | '1-Bank Officer';
    deviceFingerprint?: string;
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = (req as Request).headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = await verifyToken(token);
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      deviceFingerprint: payload.deviceFingerprint
    };
    next();
  } catch (err) {
    const message = err instanceof Error && err.name === 'TokenExpiredError'
      ? 'Token expired'
      : 'Invalid token';
    res.status(401).json({ error: message });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

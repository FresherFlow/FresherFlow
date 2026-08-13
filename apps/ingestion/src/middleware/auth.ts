import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHash } from 'crypto';

const secret = process.env.INTERNAL_API_SECRET || process.env.INGESTION_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
if (!secret) {
  console.error('FATAL: INTERNAL_API_SECRET (or fallbacks) is not set. Auth middleware will reject all requests.');
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  // Timing-safe comparison to prevent side-channel attacks
  // Hash both to ensure equal length buffers (required by timingSafeEqual)
  const tokenHash = createHash('sha256').update(token).digest();
  const secretHash = createHash('sha256').update(secret).digest();

  if (!timingSafeEqual(tokenHash, secretHash)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}

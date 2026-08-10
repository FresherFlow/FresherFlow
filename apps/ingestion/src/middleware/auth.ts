import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.INTERNAL_API_SECRET || 'your-super-secret-access-key-change-this-in-production-min-32-chars';

  if (token !== secret) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}

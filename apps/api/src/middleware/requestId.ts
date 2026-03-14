import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
}


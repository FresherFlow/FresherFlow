import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase';
import { AppError } from './errorHandler';
import { DecodedIdToken } from 'firebase-admin/auth';
import { logger } from '@fresherflow/logger';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            firebaseUser?: DecodedIdToken;
        }
    }
}

/**
 * Middleware to verify Firebase ID Token in the Authorization header.
 * Expected format: Authorization: Bearer <token>
 */
export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        return next(new AppError('No Firebase token provided', 401));
    }

    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
        return next(new AppError('Malformed authorization header', 401));
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        const err = error as { code?: string; message?: string; stack?: string };
        logger.error(`[Firebase] Token verification failed. Error Code: ${err?.code}. Message: ${err?.message}`);
        if (err?.stack) logger.error(`[Firebase] Stack: ${err.stack}`);
        return next(new AppError('Invalid or expired Firebase token', 401));
    }
}

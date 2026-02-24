import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyAdminToken } from '@fresherflow/auth';
import { AppError } from './errorHandler';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            adminId?: string;
        }
    }
}

// Optional User Authentication Middleware
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken;
    if (token) {
        try {
            const userId = verifyAccessToken(token);
            if (userId) {
                req.userId = userId;
            }
        } catch {
            // Ignore token verification errors for optional auth
        }
    }
    next();
}

// User Authentication Middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    // Cookie-based auth only
    const token = req.cookies?.accessToken;

    if (!token) {
        return next(new AppError('No token provided', 401));
    }

    const userId = verifyAccessToken(token);

    if (!userId) {
        return next(new AppError('Invalid or expired token', 401));
    }

    req.userId = userId;
    next();
}

// Admin Authentication Middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    // Cookie-based auth only (assuming admin also sets a cookie, if not currently implemented, this might break admin if admin frontend uses headers)
    // For safety, checking both or just keeping headers if admin is separate?
    // User said "Cookie-based auth only", implying the whole backend.

    const token = req.cookies?.adminAccessToken;

    if (!token) {
        return next(new AppError('No admin token provided', 401));
    }

    const adminId = verifyAdminToken(token);

    if (!adminId) {
        return next(new AppError('Invalid admin token', 403));
    }

    req.adminId = adminId;
    next();
}

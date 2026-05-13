import express, { Response, NextFunction } from 'express';
import { verifyAccessToken, verifyAdminToken } from '@fresherflow/auth';
import { AppError } from './errorHandler';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            userId?: string;
            adminId?: string;
        }
    }
}

// Optional User Authentication Middleware
export function optionalAuth(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;
    const token = req.cookies?.accessToken || bearerToken;
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
export function requireAuth(req: express.Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;
    const token = req.cookies?.accessToken || bearerToken;

    if (!token) {
        return next(new AppError('No token provided', 401));
    }

    let userId: string | null = null;
    try {
        userId = verifyAccessToken(token);
    } catch {
        return next(new AppError('Invalid or expired token', 401));
    }

    if (!userId) {
        return next(new AppError('Invalid or expired token', 401));
    }

    req.userId = userId;
    next();
}

// Admin Authentication Middleware
// Accepts both cookie (web) and Authorization Bearer header (mobile app)
export function requireAdmin(req: express.Request, res: Response, next: NextFunction) {
    const cookieToken = req.cookies?.adminAccessToken as string | undefined;
    const authHeader = req.headers ? req.headers.authorization : undefined;
    const bearerToken =
        authHeader && authHeader.toLowerCase().startsWith('bearer ')
            ? authHeader.slice(7).trim()
            : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
        return next(new AppError('No admin token provided', 401));
    }

    let adminId: string | null = null;
    try {
        adminId = verifyAdminToken(token);
    } catch {
        return next(new AppError('Invalid admin token', 403));
    }

    if (!adminId) {
        return next(new AppError('Invalid admin token', 403));
    }

    req.adminId = adminId;
    next();
}

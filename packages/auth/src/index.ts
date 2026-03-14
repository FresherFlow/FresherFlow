import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@fresherflow/config';

const getAccessSecret = () => {
    return env.JWT_ACCESS_SECRET;
};

const getRefreshSecret = () => {
    return env.JWT_REFRESH_SECRET;
};

export interface TokenPayload {
    userId: string;
    type: 'access' | 'refresh';
}

export interface AdminTokenPayload {
    adminId: string;
    role: 'admin';
}

// User Tokens
export function generateAccessToken(userId: string): string {
    const expiry = '15m';
    return jwt.sign({ userId, type: 'access' }, getAccessSecret(), { expiresIn: expiry });
}

export function generateRefreshToken(userId: string): { token: string; hash: string } {
    const expiry = '90d';
    const token = jwt.sign({ userId, type: 'refresh' }, getRefreshSecret(), { expiresIn: expiry });

    // Hash for DB storage
    const hash = crypto.createHash('sha256').update(token as string).digest('hex');

    return { token: token as string, hash };
}

export function verifyAccessToken(token: string): string | null {
    try {
        const payload = jwt.verify(token, getAccessSecret()) as TokenPayload;
        if (payload.type !== 'access') return null;
        return payload.userId;
    } catch {
        return null;
    }
}

export function verifyRefreshToken(token: string): string | null {
    try {
        const payload = jwt.verify(token, getRefreshSecret()) as TokenPayload;
        if (payload.type !== 'refresh') return null;
        return payload.userId;
    } catch {
        return null;
    }
}

export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Admin Tokens
export function generateAdminToken(adminId: string): string {
    const expiry = '7d';
    return jwt.sign({ adminId, role: 'admin' }, getAccessSecret(), { expiresIn: expiry });
}

export function verifyAdminToken(token: string): string | null {
    try {
        const payload = jwt.verify(token, getAccessSecret()) as AdminTokenPayload;
        if (payload.role !== 'admin') return null;
        return payload.adminId;
    } catch {
        return null;
    }
}

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Placeholder dev values. Refusing to run in production with these is the whole
// point: a missing env var must fail loudly at boot, not silently downgrade
// every JWT in the deployment to a publicly known key.
const DEV_ACCESS_SECRET = 'your-super-secret-access-key-change-this-in-production-min-32-chars';
const DEV_REFRESH_SECRET = 'your-super-secret-refresh-key-change-this-in-production-min-32-chars';
const DEV_ADMIN_SECRET = 'your-super-secret-admin-key-change-this-in-production-min-32-chars';

const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, devFallback: string): string {
    const secret = process.env[name];

    if (!secret || secret.trim().length === 0) {
        if (isProduction) {
            throw new Error(
                `[auth] ${name} is required in production. Refusing to start with a ` +
                'well-known development secret.'
            );
        }
        return devFallback;
    }

    if (isProduction && secret === devFallback) {
        throw new Error(
            `[auth] ${name} is still set to the development placeholder. ` +
            'Generate a real secret before deploying.'
        );
    }

    if (isProduction && secret.length < 32) {
        throw new Error(`[auth] ${name} must be at least 32 characters.`);
    }

    return secret;
}

const getAccessSecret = (): string => requireSecret('JWT_ACCESS_SECRET', DEV_ACCESS_SECRET);

const getRefreshSecret = (): string => requireSecret('JWT_REFRESH_SECRET', DEV_REFRESH_SECRET);

const getAdminSecret = (): string => {
    const secret =
        process.env.JWT_ADMIN_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
        if (isProduction) {
            throw new Error(
                '[auth] JWT_ADMIN_SECRET (or JWT_ACCESS_SECRET / JWT_SECRET) is required ' +
                'in production. Refusing to start with a well-known development secret.'
            );
        }
        return DEV_ADMIN_SECRET;
    }
    if (isProduction && secret.length < 32) {
        throw new Error('[auth] JWT_ADMIN_SECRET must be at least 32 characters.');
    }
    return secret;
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
    const token = jwt.sign({ userId, type: 'refresh', jti: crypto.randomUUID() }, getRefreshSecret(), { expiresIn: expiry });

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
    return jwt.sign({ adminId, role: 'admin', type: 'admin' }, getAdminSecret(), { expiresIn: expiry });
}

export function verifyAdminToken(token: string): string | null {
    try {
        const payload = jwt.verify(token, getAdminSecret()) as AdminTokenPayload & { type?: string };
        if (payload.type !== 'admin') return null;
        if (payload.role !== 'admin') return null;
        return payload.adminId;
    } catch {
        return null;
    }
}

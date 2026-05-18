import prisma from '../../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';

import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { verify as verifyTotpToken } from 'otplib';
import type {
    GenerateRegistrationOptionsOpts,
    GenerateAuthenticationOptionsOpts,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { generateAdminToken, verifyAdminToken } from '@fresherflow/auth';
import { AppError } from '../../middleware/errorHandler';
import { requireAdmin } from '../../middleware/auth';
import rateLimit from 'express-rate-limit';
import logger from '@fresherflow/logger';
import { getAdminSiteUrl, getCookieDomain } from '../../utils/runtimeConfig';

const router: Router = express.Router();


const RP_ID = process.env.RP_ID || 'localhost';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@fresherflow.com').toLowerCase();

function normalizeOrigin(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        return new URL(trimmed).origin;
    } catch {
        try {
            return new URL(`https://${trimmed}`).origin;
        } catch {
            return null;
        }
    }
}

function resolveExpectedOrigins(): string[] {
    const configuredOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        ...(process.env.FRONTEND_URLS || '').split(','),
        process.env.NODE_ENV === 'production' ? getAdminSiteUrl() : null,
    ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(normalizeOrigin)
        .filter((value): value is string => Boolean(value));

    const uniqueOrigins = Array.from(new Set(configuredOrigins));
    return uniqueOrigins.length > 0 ? uniqueOrigins : ['http://localhost:3000'];
}

const EXPECTED_ORIGINS = resolveExpectedOrigins();

const COOKIE_DOMAIN = getCookieDomain();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as 'lax' | 'strict' | 'none',
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {})
};
const ADMIN_SESSION_MARKER_OPTIONS = {
    ...COOKIE_OPTIONS,
    httpOnly: false,
};

function clearCookieVariants(res: Response, name: string, httpOnly = true) {
    const baseOptions = {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as 'lax' | 'strict' | 'none',
        httpOnly,
    };

    res.clearCookie(name, baseOptions);

    if (COOKIE_DOMAIN) {
        const normalizedDomain = COOKIE_DOMAIN.replace(/^\./, '');
        res.clearCookie(name, { ...baseOptions, domain: COOKIE_DOMAIN });
        res.clearCookie(name, { ...baseOptions, domain: normalizedDomain });
    }
}

function clearAdminCookieVariants(res: Response) {
    clearCookieVariants(res, 'adminAccessToken');
    clearCookieVariants(res, 'ff_admin_logged_in', false);
}

function getAdminIdFromRequest(req: Request): string | null {
    const cookieToken = req.cookies.adminAccessToken as string | undefined;
    if (cookieToken) {
        const adminId = verifyAdminToken(cookieToken);
        if (adminId) return adminId;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;
    const bearerToken = authHeader.slice(7).trim();
    if (!bearerToken) return null;
    return verifyAdminToken(bearerToken);
}

function parseDurationToMs(value: string): number | null {
    const trimmed = value.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)\s*([smhd])$/);
    if (!match) return null;
    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (unit === 's') return amount * 1000;
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
}

function getAdminCookieMaxAgeMs(): number {
    const explicitDays = Number(process.env.ADMIN_ACCESS_COOKIE_DAYS || '7');
    if (Number.isFinite(explicitDays) && explicitDays > 0) {
        return Math.floor(explicitDays * 24 * 60 * 60 * 1000);
    }
    const tokenExpiry = process.env.ADMIN_ACCESS_TOKEN_EXPIRY || process.env.ACCESS_TOKEN_EXPIRY || '7d';
    return parseDurationToMs(tokenExpiry) || (7 * 24 * 60 * 60 * 1000);
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

async function setChallenge(key: string, userId: string, type: 'reg' | 'auth', challenge: string) {
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await prisma.webAuthnChallenge.upsert({
        where: { key },
        update: { challenge, type, expiresAt },
        create: { key, userId, challenge, type, expiresAt }
    });
}

async function getChallenge(key: string) {
    const record = await prisma.webAuthnChallenge.findUnique({ where: { key } });
    if (!record) return null;
    if (record.expiresAt < new Date()) {
        await prisma.webAuthnChallenge.delete({ where: { key } });
        return null;
    }
    return record.challenge;
}

async function clearChallenge(key: string) {
    await prisma.webAuthnChallenge.delete({ where: { key } }).catch(() => { });
}

// Rate limiting
const adminAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { error: 'Too many attempts' },
});

/**
 * Helper to get or bootstrap admin user
 */
async function getAdminUser(email: string) {
    const user = await prisma.user.findFirst({
        where: {
            email: { equals: email, mode: 'insensitive' },
            role: 'ADMIN'
        }
    });

    if (user) return user;

    // Bootstrap: If this matches the env admin email and NO admin exists, create it.
    if (email.toLowerCase() === ADMIN_EMAIL) {
        const anyAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!anyAdmin) {
            return await prisma.user.upsert({
                where: { email },
                update: { role: 'ADMIN' },
                create: {
                    email,
                    role: 'ADMIN',
                    fullName: 'System Admin',
                }
            });
        }
    }
    return null;
}

/**
 * 1. Registration Options
 * Only allowed if:
 * a) No authenticators exist (Bootstrap)
 * b) Admin is already logged in (Add new device - TODO: add middleware)
 */
router.post('/register/options', adminAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        if (email?.toLowerCase() !== ADMIN_EMAIL) {
            return next(new AppError('Forbidden', 403));
        }

        const user = await getAdminUser(email);
        if (!user) return next(new AppError('Unauthorized', 401));

        // Security: 
        // 1. If NO authenticators exist, allow bootstrap registration.
        // 2. If authenticators exist, the user MUST be already logged in as admin to add another.
        const userId = user.id as string;
        const authenticators = await prisma.authenticator.findMany({ where: { userId } });

        if (authenticators.length > 0) {
            const adminToken = req.cookies.adminAccessToken;
            const authenticatedAdminId = adminToken ? verifyAdminToken(adminToken) : null;

            if (authenticatedAdminId !== user.id) {
                return next(new AppError('Forbidden: Must be logged in as admin to add more passkeys', 403));
            }
        }

        const options: GenerateRegistrationOptionsOpts = {
            rpName: 'FresherFlow Admin',
            rpID: RP_ID,
            userID: new TextEncoder().encode(user.id as string), // Cast string to Uint8Array
            userName: user.email as string,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'required',
                userVerification: 'preferred',
            },
            excludeCredentials: authenticators.map(auth => ({
                id: auth.credentialID as string,
                type: 'public-key',
                transports: (auth.transports as string) ? ((auth.transports as string).split(',') as AuthenticatorTransportFuture[]) : undefined,
            })),
        };

        const registrationOptions = await generateRegistrationOptions(options);
        await setChallenge(`reg_${user.id}`, user.id as string, 'reg', registrationOptions.challenge as string);

        res.json(registrationOptions);
    } catch (error) {
        next(error);
    }
});

/**
 * 2. Verify Registration
 */
router.post('/register/verify', adminAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, body } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return next(new AppError('Not found', 404));

        const expectedChallenge = await getChallenge(`reg_${user.id}`);
        if (!expectedChallenge) return next(new AppError('Challenge expired', 400));

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: expectedChallenge as string | ((challenge: string) => boolean | Promise<boolean>),
            expectedOrigin: EXPECTED_ORIGINS.length === 1 ? EXPECTED_ORIGINS[0] : EXPECTED_ORIGINS,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential } = verification.registrationInfo;

            await prisma.authenticator.create({
                data: {
                    credentialID: credential.id as string,
                    userId: user.id as string,
                    publicKey: Buffer.from(credential.publicKey),
                    counter: credential.counter,
                    deviceType: verification.registrationInfo.credentialDeviceType,
                    backedUp: verification.registrationInfo.credentialBackedUp,
                    transports: body.response.transports?.join(','),
                },
            });

            await clearChallenge(`reg_${user.id}`);
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * 3. Authenticaton Options (Login)
 */
router.post('/login/options', adminAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (email?.toLowerCase() !== ADMIN_EMAIL) {
            return next(new AppError('Invalid admin email', 401));
        }

        const user = await prisma.user.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' },
                role: 'ADMIN',
            },
            include: { authenticators: true }
        });

        // If no user or no authenticators, tell frontend to trigger bootstrap/registration
        if (!user || user.authenticators.length === 0) {
            return res.json({ registrationRequired: true });
        }

        const allowCredentials = user.authenticators
            .filter((auth) => typeof auth.credentialID === 'string' && auth.credentialID.length > 0)
            .map((auth) => ({
                id: auth.credentialID as string,
                type: 'public-key' as const,
                transports: (auth.transports as string) ? ((auth.transports as string).split(',') as AuthenticatorTransportFuture[]) : undefined,
            }));

        const options: GenerateAuthenticationOptionsOpts = {
            rpID: RP_ID,
            allowCredentials,
            userVerification: 'preferred',
        };

        const authenticationOptions = await generateAuthenticationOptions(options);
        await setChallenge(`auth_${user.id}`, user.id as string, 'auth', authenticationOptions.challenge as string);

        res.json(authenticationOptions);
    } catch (error) {
        next(error);
    }
});

/**
 * 4. Verify Authentication (Login)
 */
router.post('/login/verify', adminAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, body } = req.body;
        const user = await prisma.user.findUnique({
            where: { email },
            include: { authenticators: true }
        });

        if (!user) return next(new AppError('Unauthorized', 401));

        const expectedChallenge = await getChallenge(`auth_${user.id}`);
        if (!expectedChallenge) return next(new AppError('Challenge expired', 400));

        const authenticator = user.authenticators.find(auth => auth.credentialID === body.id);
        if (!authenticator) return next(new AppError('Invalid credential', 400));

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: expectedChallenge as string | ((challenge: string) => boolean | Promise<boolean>),
            expectedOrigin: EXPECTED_ORIGINS.length === 1 ? EXPECTED_ORIGINS[0] : EXPECTED_ORIGINS,
            expectedRPID: RP_ID,
            credential: {
                id: authenticator.credentialID as string,
                publicKey: new Uint8Array(authenticator.publicKey as unknown as ArrayLike<number>) as unknown as Uint8Array<ArrayBuffer>,
                counter: authenticator.counter as number,
                transports: (authenticator.transports as string) ? ((authenticator.transports as string).split(',') as AuthenticatorTransportFuture[]) : undefined,
            },
        });

        if (verification.verified && verification.authenticationInfo) {
            await prisma.authenticator.update({
                where: { credentialID: authenticator.credentialID as string },
                data: { counter: verification.authenticationInfo.newCounter }
            });

            await clearChallenge(`auth_${user.id}`);

            // Set Admin Token
            const token = generateAdminToken(user.id as string);
            const accessMaxAge = getAdminCookieMaxAgeMs();
            clearAdminCookieVariants(res);
            res.cookie('adminAccessToken', token, {
                ...COOKIE_OPTIONS,
                maxAge: accessMaxAge
            });
            res.cookie('ff_admin_logged_in', 'true', {
                ...ADMIN_SESSION_MARKER_OPTIONS,
                maxAge: accessMaxAge
            });
            return res.json({ verified: true, accessToken: token });
        } else {
            res.status(400).json({ verified: false });
        }
    } catch (error) {
        logger.error('[Admin Auth] login/verify failed', {
            message: error instanceof Error ? error.message : String(error),
            expectedOrigins: EXPECTED_ORIGINS,
        });
        next(error);
    }
});

/**
 * 5. Verify TOTP code as an alternative admin login method
 */
router.post('/login/totp', adminAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, code } = req.body as { email?: string; code?: string };
        if (email?.toLowerCase() !== ADMIN_EMAIL) {
            return next(new AppError('Invalid admin email', 401));
        }

        if (!code || !/^\d{6}$/.test(code)) {
            return next(new AppError('Enter a valid 6-digit code', 400));
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, isTwoFactorEnabled: true, totpSecret: true }
        });

        if (!user || user.role !== 'ADMIN' || !user.isTwoFactorEnabled || !user.totpSecret) {
            return next(new AppError('TOTP login is not enabled for this admin', 401));
        }

        const totpVerificationResult = await verifyTotpToken({ token: code, secret: user.totpSecret as string });
        const isValidTotp =
            typeof totpVerificationResult === 'boolean'
                ? totpVerificationResult
                : Boolean((totpVerificationResult as { valid: boolean })?.valid);

        if (!isValidTotp) {
            return next(new AppError('Invalid authenticator code', 400));
        }

        const token = generateAdminToken(user.id);
        const accessMaxAge = getAdminCookieMaxAgeMs();

        clearAdminCookieVariants(res);
        res.cookie('adminAccessToken', token, {
            ...COOKIE_OPTIONS,
            maxAge: accessMaxAge
        });
        res.cookie('ff_admin_logged_in', 'true', {
            ...ADMIN_SESSION_MARKER_OPTIONS,
            maxAge: accessMaxAge
        });
        return res.json({ verified: true, accessToken: token });
    } catch (error) {
        next(error);
    }
});

/**
 * 5. Current Admin Status
 */
router.get('/me', async (req: Request, res: Response) => {
    try {
        const adminId = getAdminIdFromRequest(req);
        if (!adminId) return res.json({ admin: null });

        const user = await prisma.user.findUnique({
            where: { id: adminId },
            select: { id: true, email: true, role: true, fullName: true, isTwoFactorEnabled: true }
        });

        res.json({ admin: user });
    } catch {
        res.json({ admin: null });
    }
});

/**
 * 6. List Registered Passkeys
 */
router.get('/passkeys', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticators = await prisma.authenticator.findMany({
            where: { userId: req.adminId! }, // set by requireAdmin
            select: {
                credentialID: true,
                deviceType: true,
                backedUp: true,
                transports: true
            }
        });

        // Map to friendly format
        const keys = authenticators.map(auth => ({
            id: auth.credentialID, // Use credentialID as stable ID
            name: `${auth.deviceType} (${auth.transports?.split(',').join(', ') || 'unknown'})`
        }));

        res.json({ keys });
    } catch (error) {
        next(error);
    }
});

/**
 * 7. Delete Passkey
 */
router.delete('/passkeys/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        // Prevent deleting the last key (lockout protection)
        const count = await prisma.authenticator.count({ where: { userId: req.adminId! } });
        if (count <= 1) {
            throw new AppError('Cannot delete the last passkey. Add a new one first.', 400);
        }

        await prisma.authenticator.deleteMany({
            where: {
                credentialID: id,
                userId: req.adminId! // Ensure ownership
            }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * 8. Logout
 */
router.post('/logout', (req, res) => {
    clearAdminCookieVariants(res);
    res.json({ success: true });
});

export default router;

import prisma from '../infrastructure/database/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import type { User } from '@fresherflow/types';

import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
    GenerateRegistrationOptionsOpts,
    GenerateAuthenticationOptionsOpts,
    AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';
import { logger } from '@fresherflow/utils';
import { eventService } from '../infrastructure/services/platform/event.service';
import { getPublicSiteUrl } from '../utils/runtimeConfig';
import { setAuthCookies } from './auth';

const router: Router = express.Router();

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = 'FresherFlow';

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

// User-facing origins (public web), not the admin host. Challenge keys are
// prefixed `u*` so they can never collide with the admin `reg_`/`auth_` keys
// in the shared WebAuthnChallenge table.
function resolveUserExpectedOrigins(): string[] {
    const configured = [
        process.env.FRONTEND_URL,
        ...(process.env.FRONTEND_URLS || '').split(','),
        process.env.NODE_ENV === 'production' ? getPublicSiteUrl() : null,
    ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(normalizeOrigin)
        .filter((value): value is string => Boolean(value));

    const unique = Array.from(new Set(configured));
    return unique.length > 0 ? unique : ['http://localhost:3000'];
}

const EXPECTED_ORIGINS = resolveUserExpectedOrigins();
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

const passkeyAuthLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many passkey attempts. Please try again later.',
    keyPrefix: 'rate:auth:passkey'
});

const passkeyManageLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many passkey requests. Please try again later.',
    keyPrefix: 'rate:auth:passkey:manage'
});

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
        await prisma.webAuthnChallenge.delete({ where: { key } }).catch(() => undefined);
        return null;
    }
    return record.challenge;
}

async function clearChallenge(key: string) {
    await prisma.webAuthnChallenge.delete({ where: { key } }).catch(() => undefined);
}

function transportsOf(value: unknown): AuthenticatorTransportFuture[] | undefined {
    return typeof value === 'string' && value.length > 0
        ? (value.split(',') as AuthenticatorTransportFuture[])
        : undefined;
}

/**
 * POST /api/auth/passkeys/register/options
 * Starts credential enrollment for the signed-in verified user.
 */
router.post(
    '/register/options',
    passkeyManageLimiter,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.isAnonymous) return next(new AppError('Verified account required', 401));

            const user = await prisma.user.findUnique({
                where: { id: req.userId as string },
                select: { id: true, email: true, username: true, status: true, trustLevel: true },
            });
            if (!user) return next(new AppError('User not found', 404));
            if (user.status !== 'ACTIVE' || user.trustLevel === 'BANNED') {
                return next(new AppError('Account suspended. Contact support.', 403));
            }

            const authenticators = await prisma.authenticator.findMany({
                where: { userId: req.userId as string },
            });

            const options: GenerateRegistrationOptionsOpts = {
                rpName: RP_NAME,
                rpID: RP_ID,
                userID: new TextEncoder().encode(user.id as string),
                userName: (user.email ?? user.username ?? user.id) as string,
                attestationType: 'none',
                authenticatorSelection: {
                    residentKey: 'preferred',
                    userVerification: 'preferred',
                },
                excludeCredentials: authenticators
                    .filter((auth) => typeof auth.credentialID === 'string' && auth.credentialID.length > 0)
                    .map((auth) => ({
                        id: auth.credentialID as string,
                        type: 'public-key' as const,
                        transports: transportsOf(auth.transports as string),
                    })),
            };

            const registrationOptions = await generateRegistrationOptions(options);
            await setChallenge(`ureg_${user.id}`, user.id as string, 'reg', registrationOptions.challenge as string);

            res.json(registrationOptions);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/auth/passkeys/register/verify
 * Completes enrollment. The ceremony body is opaque WebAuthn JSON: only its
 * presence is checked, never validated into a stripped shape.
 */
router.post(
    '/register/verify',
    passkeyManageLimiter,
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.isAnonymous) return next(new AppError('Verified account required', 401));

            const { body } = req.body as { body?: { id?: string; response?: unknown } };
            if (!body || typeof body.id !== 'string' || !body.response) {
                return next(new AppError('Invalid registration response', 400));
            }

            const userId = req.userId as string;
            const expectedChallenge = await getChallenge(`ureg_${userId}`);
            if (!expectedChallenge) return next(new AppError('Challenge expired', 400));

            const verification = await verifyRegistrationResponse({
                response: body as never,
                expectedChallenge: expectedChallenge as string,
                expectedOrigin: EXPECTED_ORIGINS.length === 1 ? EXPECTED_ORIGINS[0] : EXPECTED_ORIGINS,
                expectedRPID: RP_ID,
            });

            if (!verification.verified || !verification.registrationInfo) {
                return next(new AppError('Passkey verification failed', 400));
            }

            const { credential } = verification.registrationInfo;
            try {
                await prisma.authenticator.create({
                    data: {
                        credentialID: credential.id as string,
                        userId,
                        publicKey: Buffer.from(credential.publicKey),
                        counter: credential.counter,
                        deviceType: verification.registrationInfo.credentialDeviceType,
                        backedUp: verification.registrationInfo.credentialBackedUp,
                        transports: (body as { response?: { transports?: string[] } }).response?.transports?.join(','),
                    },
                });
            } catch (error: unknown) {
                if ((error as { code?: string })?.code === 'P2002') {
                    return next(new AppError('This passkey is already registered', 409));
                }
                throw error;
            }

            await clearChallenge(`ureg_${userId}`);
            res.json({ verified: true });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/auth/passkeys
 * Lists the caller's own passkeys. Ownership comes from the session only.
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.isAnonymous) return next(new AppError('Verified account required', 401));

        const authenticators = await prisma.authenticator.findMany({
            where: { userId: req.userId as string },
            select: { credentialID: true, deviceType: true, backedUp: true, transports: true },
        });

        res.setHeader('Cache-Control', 'private, no-store');
        res.json({
            keys: authenticators.map((auth) => ({
                id: auth.credentialID,
                name: `${auth.deviceType} (${(auth.transports as string)?.split(',').join(', ') || 'unknown'})`,
                backedUp: auth.backedUp,
            })),
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/auth/passkeys/:id
 * Removes one of the caller's own passkeys. The last key is protected so a
 * user cannot lock themselves out of passkey login.
 */
router.delete('/:id', passkeyManageLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.isAnonymous) return next(new AppError('Verified account required', 401));

        const id = String(req.params.id);
        const userId = req.userId as string;

        const count = await prisma.authenticator.count({ where: { userId } });
        if (count <= 1) {
            return next(new AppError('Cannot delete the last passkey. Add a new one first.', 400));
        }

        const removed = await prisma.authenticator.deleteMany({
            where: { credentialID: id, userId },
        });
        if (removed.count === 0) return next(new AppError('Passkey not found', 404));

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/passkeys/login/options
 * Starts a passkey login for the account holding `email`. Unknown emails and
 * accounts without passkeys share one 404 so the endpoint is not an account
 * or enrollment oracle.
 */
router.post('/login/options', passkeyAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body as { email?: string };
        if (!email || typeof email !== 'string') {
            return next(new AppError('Email is required', 400));
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { authenticators: true },
        });

        if (!user || user.authenticators.length === 0) {
            return next(new AppError('Account or passkey not found', 404));
        }
        if (user.status !== 'ACTIVE' || user.trustLevel === 'BANNED') {
            return next(new AppError('Account or passkey not found', 404));
        }

        const allowCredentials = user.authenticators
            .filter((auth) => typeof auth.credentialID === 'string' && auth.credentialID.length > 0)
            .map((auth) => ({
                id: auth.credentialID as string,
                type: 'public-key' as const,
                transports: transportsOf(auth.transports as string),
            }));

        const options: GenerateAuthenticationOptionsOpts = {
            rpID: RP_ID,
            allowCredentials,
            userVerification: 'preferred',
        };

        const authenticationOptions = await generateAuthenticationOptions(options);
        await setChallenge(`uauth_${user.id}`, user.id as string, 'auth', authenticationOptions.challenge as string);

        res.json(authenticationOptions);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/passkeys/login/verify
 * Completes a passkey login and issues the standard session cookies.
 */
router.post('/login/verify', passkeyAuthLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, body } = req.body as { email?: string; body?: { id?: string; response?: unknown } };
        if (!email || typeof email !== 'string' || !body || typeof body.id !== 'string' || !body.response) {
            return next(new AppError('Email and authentication response are required', 400));
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                authenticators: true,
                profile: true,
                organizationMemberships: { include: { organization: true } },
            },
        });
        if (!user) return next(new AppError('Account or passkey not found', 404));
        if (user.status !== 'ACTIVE' || user.trustLevel === 'BANNED') {
            return next(new AppError('Account suspended. Contact support.', 403));
        }

        const expectedChallenge = await getChallenge(`uauth_${user.id}`);
        if (!expectedChallenge) return next(new AppError('Challenge expired', 400));

        const authenticator = user.authenticators.find((auth) => auth.credentialID === body.id);
        if (!authenticator) return next(new AppError('Invalid credential', 400));

        const verification = await verifyAuthenticationResponse({
            response: body as never,
            expectedChallenge: expectedChallenge as string,
            expectedOrigin: EXPECTED_ORIGINS.length === 1 ? EXPECTED_ORIGINS[0] : EXPECTED_ORIGINS,
            expectedRPID: RP_ID,
            credential: {
                id: authenticator.credentialID as string,
                publicKey: new Uint8Array(authenticator.publicKey as unknown as ArrayLike<number>) as unknown as Uint8Array<ArrayBuffer>,
                counter: authenticator.counter as number,
                transports: transportsOf(authenticator.transports as string),
            },
        });

        if (!verification.verified || !verification.authenticationInfo) {
            return next(new AppError('Passkey verification failed', 400));
        }

        await prisma.authenticator.update({
            where: { credentialID: authenticator.credentialID as string },
            data: { counter: verification.authenticationInfo.newCounter },
        });

        await clearChallenge(`uauth_${user.id}`);

        const tokens = await setAuthCookies(user as unknown as User, res);
        await eventService.track({
            type: 'AUTH_STEP',
            source: 'web',
            userId: user.id as string,
            metadata: { isNewUser: false, method: 'passkey' },
        });

        res.json({
            user: {
                id: user.id,
                email: user.email || null,
                fullName: user.fullName || null,
                username: (user as User).username || null,
            },
            profile: (user as User).profile || null,
            ...tokens,
        });
    } catch (error) {
        logger.error('[Auth Passkey] login/verify failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        next(error);
    }
});

export default router;

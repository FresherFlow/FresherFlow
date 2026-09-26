import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generate as generateTotp } from 'otplib';

process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long-enough';
process.env.REDIS_ENABLED = 'false';

const totpState = { secret: null as string | null, enabled: false };

const userMock = {
    findUnique: vi.fn(),
    update: vi.fn(),
};

const authenticatorMock = {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
};

const challengeMock = {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
};

const refreshTokenMock = {
    create: vi.fn(),
    updateMany: vi.fn(),
};

const prismaMock = {
    user: userMock,
    authenticator: authenticatorMock,
    webAuthnChallenge: challengeMock,
    refreshToken: refreshTokenMock,
};

vi.mock('../infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

vi.mock('../infrastructure/services/platform/auth.service', () => ({
    AuthService: {
        generateOtp: vi.fn(() => '123456'),
        verifyOtp: vi.fn(),
        verifyGoogleIdToken: vi.fn(),
        handshake: vi.fn(),
    },
}));

vi.mock('../infrastructure/services/alerts/email.service', () => ({
    EmailService: {
        sendOtp: vi.fn(),
    },
}));

vi.mock('../infrastructure/services/platform/event.service', () => ({
    eventService: { track: vi.fn() },
}));

vi.mock('../lib/firebase', () => ({
    getFirebaseAuth: vi.fn().mockReturnValue({
        createCustomToken: vi.fn().mockResolvedValue('mocked-firebase-custom-token'),
        verifyIdToken: vi.fn(),
    }),
    getFirebaseApp: vi.fn().mockReturnValue({}),
}));

vi.mock('@simplewebauthn/server', () => ({
    generateRegistrationOptions: vi.fn(async () => ({ challenge: 'reg-challenge' })),
    verifyRegistrationResponse: vi.fn(async () => ({
        verified: true,
        registrationInfo: {
            credential: { id: 'cred-1', publicKey: new Uint8Array([1, 2, 3]), counter: 0 },
            credentialDeviceType: 'singleDevice',
            credentialBackedUp: false,
        },
    })),
    generateAuthenticationOptions: vi.fn(async () => ({ challenge: 'auth-challenge' })),
    verifyAuthenticationResponse: vi.fn(async () => ({
        verified: true,
        authenticationInfo: { newCounter: 1 },
    })),
}));

async function buildApp() {
    const { generateAccessToken } = await import('@fresherflow/utils');
    const twoFactorRoutes = (await import('../routes/authTwoFactor')).default;
    const passkeyRoutes = (await import('../routes/authPasskeys')).default;

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth/2fa', twoFactorRoutes);
    app.use('/api/auth/passkeys', passkeyRoutes);
    app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });

    return { app, auth: { Authorization: `Bearer ${generateAccessToken('u1')}` } };
}

beforeEach(() => {
    vi.clearAllMocks();
    totpState.secret = null;
    totpState.enabled = false;

    userMock.findUnique.mockImplementation(async () => ({
        id: 'u1',
        email: 'a@example.com',
        username: 'alice',
        status: 'ACTIVE',
        trustLevel: 'VERIFIED',
        totpSecret: totpState.secret,
        isTwoFactorEnabled: totpState.enabled,
        authenticators: [],
    }));
    userMock.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        if ('totpSecret' in args.data) totpState.secret = args.data.totpSecret as string | null;
        if ('isTwoFactorEnabled' in args.data) totpState.enabled = args.data.isTwoFactorEnabled as boolean;
        return { id: 'u1' };
    });

    authenticatorMock.findMany.mockResolvedValue([]);
    authenticatorMock.create.mockResolvedValue({ credentialID: 'cred-1' });
    authenticatorMock.count.mockResolvedValue(0);
    authenticatorMock.deleteMany.mockResolvedValue({ count: 0 });
    authenticatorMock.update.mockResolvedValue({});

    challengeMock.upsert.mockResolvedValue({});
    challengeMock.findUnique.mockResolvedValue({
        key: 'ureg_u1',
        challenge: 'reg-challenge',
        expiresAt: new Date(Date.now() + 60000),
    });
    challengeMock.delete.mockResolvedValue({});

    refreshTokenMock.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'rt-1',
        ...args.data,
    }));
});

describe('user TOTP/2FA (PHASE 3)', () => {
    it('rejects setup without a token (401)', async () => {
        const { app } = await buildApp();
        expect((await request(app).post('/api/auth/2fa/setup')).status).toBe(401);
    });

    it('rejects setup for anonymous sessions', async () => {
        const { app } = await buildApp();
        const res = await request(app).post('/api/auth/2fa/setup').set('x-fresherflow-anon-id', 'anon-1');
        expect(res.status).toBe(401);
    });

    it('full lifecycle: setup -> verify -> status -> disable', async () => {
        const { app, auth } = await buildApp();

        const setup = await request(app).post('/api/auth/2fa/setup').set(auth);
        expect(setup.status).toBe(200);
        expect(setup.body.secret).toBeTruthy();
        expect(setup.body.qrCode).toBeTruthy();
        expect(totpState.secret).toBe(setup.body.secret);
        expect(totpState.enabled).toBe(false);

        // Wrong code is rejected before enable.
        const bad = await request(app).post('/api/auth/2fa/verify').set(auth).send({ code: '000000' });
        expect(bad.status).toBe(400);
        expect(totpState.enabled).toBe(false);

        const good = await request(app)
            .post('/api/auth/2fa/verify')
            .set(auth)
            .send({ code: await generateTotp({ secret: setup.body.secret as string }) });
        expect(good.status).toBe(200);
        expect(totpState.enabled).toBe(true);

        const status = await request(app).get('/api/auth/2fa/status').set(auth);
        expect(status.status).toBe(200);
        expect(status.body.enabled).toBe(true);

        // Disable requires a current code: a bare session cannot strip 2FA.
        const disableNoCode = await request(app).post('/api/auth/2fa/disable').set(auth).send({});
        expect(disableNoCode.status).toBe(400);

        const disable = await request(app)
            .post('/api/auth/2fa/disable')
            .set(auth)
            .send({ code: await generateTotp({ secret: setup.body.secret as string }) });
        expect(disable.status).toBe(200);
        expect(totpState.enabled).toBe(false);
        expect(totpState.secret).toBeNull();
    });
});

describe('user passkeys (PHASE 3)', () => {
    it('rejects enrollment without a token (401)', async () => {
        const { app } = await buildApp();
        expect((await request(app).post('/api/auth/passkeys/register/options')).status).toBe(401);
    });

    it('enrolls, lists, and deletes a passkey with ownership scoping', async () => {
        const { app, auth } = await buildApp();

        const options = await request(app).post('/api/auth/passkeys/register/options').set(auth);
        expect(options.status).toBe(200);
        expect(challengeMock.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { key: 'ureg_u1' } })
        );

        const verify = await request(app)
            .post('/api/auth/passkeys/register/verify')
            .set(auth)
            .send({ body: { id: 'cred-1', response: { transports: ['usb'] } } });
        expect(verify.status).toBe(200);
        expect(authenticatorMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ credentialID: 'cred-1', userId: 'u1' }),
            })
        );

        authenticatorMock.findMany.mockResolvedValue([
            { credentialID: 'cred-1', deviceType: 'singleDevice', backedUp: false, transports: 'usb' },
            { credentialID: 'cred-2', deviceType: 'singleDevice', backedUp: false, transports: 'usb' },
        ]);
        const list = await request(app).get('/api/auth/passkeys').set(auth);
        expect(list.status).toBe(200);
        expect(list.body.keys).toHaveLength(2);

        authenticatorMock.count.mockResolvedValue(2);
        authenticatorMock.deleteMany.mockResolvedValue({ count: 1 });
        const del = await request(app).delete('/api/auth/passkeys/cred-1').set(auth);
        expect(del.status).toBe(200);
        // Ownership is enforced in the delete filter itself.
        expect(authenticatorMock.deleteMany).toHaveBeenCalledWith({
            where: { credentialID: 'cred-1', userId: 'u1' },
        });
    });

    it('refuses to delete the last passkey', async () => {
        const { app, auth } = await buildApp();
        authenticatorMock.count.mockResolvedValue(1);

        const res = await request(app).delete('/api/auth/passkeys/cred-1').set(auth);

        expect(res.status).toBe(400);
        expect(authenticatorMock.deleteMany).not.toHaveBeenCalled();
    });

    it('passkey login issues the standard session; unknown emails share one 404', async () => {
        const { app } = await buildApp();

        userMock.findUnique.mockResolvedValueOnce(null);
        const unknown = await request(app)
            .post('/api/auth/passkeys/login/options')
            .send({ email: 'ghost@example.com' });
        expect(unknown.status).toBe(404);

        userMock.findUnique.mockResolvedValue({
            id: 'u1',
            email: 'a@example.com',
            fullName: 'Alice',
            username: 'alice',
            status: 'ACTIVE',
            trustLevel: 'VERIFIED',
            profile: { completionPercentage: 100 },
            organizationMemberships: [],
            authenticators: [{ credentialID: 'cred-1', publicKey: Buffer.from([1, 2, 3]), counter: 0, transports: 'usb' }],
        });
        challengeMock.findUnique.mockResolvedValue({
            key: 'uauth_u1',
            challenge: 'auth-challenge',
            expiresAt: new Date(Date.now() + 60000),
        });

        const options = await request(app)
            .post('/api/auth/passkeys/login/options')
            .send({ email: 'a@example.com' });
        expect(options.status).toBe(200);

        const login = await request(app)
            .post('/api/auth/passkeys/login/verify')
            .send({ email: 'a@example.com', body: { id: 'cred-1', response: {} } });
        expect(login.status).toBe(200);
        expect(login.body.accessToken).toBeTruthy();
        expect(login.body.refreshToken).toBeTruthy();
        expect(authenticatorMock.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { credentialID: 'cred-1' } })
        );
    });
});

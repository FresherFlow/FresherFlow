import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long-enough';
process.env.REDIS_ENABLED = 'false';

const refreshTokenMock = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
};

const userMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
};

const profileMock = {
    update: vi.fn(),
};

const prismaMock = {
    user: userMock,
    refreshToken: refreshTokenMock,
    profile: profileMock,
    $transaction: vi.fn(),
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

vi.mock('../lib/firebase', () => ({
    getFirebaseAuth: vi.fn().mockReturnValue({
        createCustomToken: vi.fn().mockResolvedValue('mocked-firebase-custom-token'),
        verifyIdToken: vi.fn(),
    }),
    getFirebaseApp: vi.fn().mockReturnValue({}),
}));

function activeAccount() {
    return { status: 'ACTIVE', trustLevel: 'VERIFIED' };
}

async function buildApp() {
    const { generateAccessToken, generateRefreshToken } = await import('@fresherflow/utils');
    const authRoutes = (await import('../routes/auth')).default;

    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });

    return { app, generateAccessToken, generateRefreshToken };
}

beforeEach(() => {
    vi.clearAllMocks();
    userMock.findUnique.mockResolvedValue(activeAccount());
    refreshTokenMock.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'rt-1',
        ...args.data,
    }));
    refreshTokenMock.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof prismaMock) => Promise<unknown>) =>
        cb(prismaMock)
    );
});

describe('session gates (PHASE 3)', () => {
    it('authenticated request works and exposes the 2FA flag', async () => {
        const { app, generateAccessToken } = await buildApp();
        userMock.findUnique.mockResolvedValue({
            id: 'u1',
            email: 'a@example.com',
            fullName: 'A',
            username: 'alice',
            role: 'USER',
            status: 'ACTIVE',
            trustLevel: 'VERIFIED',
            isTwoFactorEnabled: false,
            organizationMemberships: [],
            profile: { completionPercentage: 100 },
        });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${generateAccessToken('u1')}`);

        expect(res.status).toBe(200);
        expect(res.body.user.id).toBe('u1');
        expect(res.body.user.isTwoFactorEnabled).toBe(false);
    });

    it('unauthenticated request is rejected with 401', async () => {
        const { app } = await buildApp();

        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
    });

    it('refresh rotates a live token and returns a fresh pair', async () => {
        const { app, generateRefreshToken } = await buildApp();
        const { token } = generateRefreshToken('u1');

        // Live token presented: revoke it, issue succeeds.
        refreshTokenMock.findFirst.mockResolvedValueOnce({ id: 'rt-live' });

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [`refreshToken=${token}`]);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
        expect(res.body.refreshToken).toBeTruthy();
        expect(refreshTokenMock.update).toHaveBeenCalled();
        expect(refreshTokenMock.create).toHaveBeenCalled();
        // Rate limiter is wired on the refresh route.
        expect(res.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('revoked refresh token is rejected with 401 and cookies are cleared', async () => {
        const { app, generateRefreshToken } = await buildApp();
        const { token } = generateRefreshToken('u1');

        // Neither live nor recently revoked: genuine expiry/theft.
        refreshTokenMock.findFirst.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [`refreshToken=${token}`]);

        expect(res.status).toBe(401);
        expect(refreshTokenMock.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) })
        );
        const cleared = (res.headers['set-cookie'] as string[] | undefined) ?? [];
        expect(cleared.some((c) => c.startsWith('refreshToken=;'))).toBe(true);
    });

    it('logout/all revokes every live session for the caller only', async () => {
        const { app, generateAccessToken } = await buildApp();

        const res = await request(app)
            .post('/api/auth/logout/all')
            .set('Authorization', `Bearer ${generateAccessToken('u1')}`);

        expect(res.status).toBe(200);
        expect(refreshTokenMock.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', revokedAt: null } })
        );
    });

    it('logout/all without a token is 401 and revokes nothing', async () => {
        const { app } = await buildApp();

        const res = await request(app).post('/api/auth/logout/all');

        expect(res.status).toBe(401);
        expect(refreshTokenMock.updateMany).not.toHaveBeenCalled();
    });

    it('logout is rate-limited (429 after the window budget)', async () => {
        const { app } = await buildApp();
        const ip = 'test-logout-ratelimit';

        let lastStatus = 200;
        for (let i = 0; i < 31; i++) {
            const res = await request(app).post('/api/auth/logout').set('X-Forwarded-For', ip);
            lastStatus = res.status;
        }

        expect(lastStatus).toBe(429);
    });
});

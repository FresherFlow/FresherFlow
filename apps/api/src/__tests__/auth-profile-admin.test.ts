import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

type PrismaMock = {
    user: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        upsert: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
        create: ReturnType<typeof vi.fn>;
    };
    authenticator: {
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
    };
    adminAudit: {
        create: ReturnType<typeof vi.fn>;
    };
};

const prismaMock: PrismaMock = {
    user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
    },
    refreshToken: {
        create: vi.fn(),
    },
    authenticator: {
        findMany: vi.fn(),
        count: vi.fn(),
    },
    adminAudit: {
        create: vi.fn(),
    },
};

vi.mock('@prisma/client', () => {
    class PrismaClient {
        constructor() {
            return prismaMock as unknown as PrismaClient;
        }
    }
    return { PrismaClient };
});

vi.mock('../lib/prisma', () => ({
    default: prismaMock,
}));

vi.mock('../services/auth.service', () => ({
    AuthService: {
        generateOtp: vi.fn(() => '123456'),
        verifyOtp: vi.fn(),
        verifyGoogleIdToken: vi.fn(),
    },
}));

vi.mock('../services/email.service', () => ({
    EmailService: {
        sendOtp: vi.fn(),
    },
}));

describe('auth and profile gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POST /api/auth/otp/send sends OTP', async () => {
        const authRoutes = (await import('../routes/auth')).default;
        const app = express();
        app.use(cookieParser());
        app.use(express.json());
        app.use('/api/auth', authRoutes);

        const res = await request(app)
            .post('/api/auth/otp/send')
            .send({ email: 'test@example.com' });

        expect(res.status).toBe(200);
    });

    it('POST /api/auth/otp/verify sets cookies and returns user', async () => {
        const { AuthService } = await import('../services/auth.service');
        (AuthService.verifyOtp as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            fullName: 'Test User',
            profile: { completionPercentage: 0 },
        });

        const authRoutes = (await import('../routes/auth')).default;
        const app = express();
        app.use(cookieParser());
        app.use(express.json());
        app.use('/api/auth', authRoutes);

        const res = await request(app)
            .post('/api/auth/otp/verify')
            .send({ email: 'test@example.com', code: '123456' });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('test@example.com');
        expect(res.headers['set-cookie']).toBeDefined();
    });
});

describe('middleware: requireAuth, requireAdmin, profileGate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requireAuth blocks when no token', async () => {
        const { requireAuth } = await import('../middleware/auth');
        const req = { cookies: {} } as any;
        const res = {} as any;
        const next = vi.fn();

        requireAuth(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('requireAdmin blocks when no admin token', async () => {
        const { requireAdmin } = await import('../middleware/auth');
        const req = { cookies: {} } as any;
        const res = {} as any;
        const next = vi.fn();

        requireAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('profileGate blocks when profile incomplete', async () => {
        const { profileGate } = await import('../middleware/profileGate');
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'user-1',
            role: 'USER',
            profile: {
                educationLevel: 'DEGREE',
                gradCourse: 'B.Tech',
                gradSpecialization: 'CSE',
                gradYear: 2024,
                tenthYear: null,
                twelfthYear: null,
                interestedIn: [],
                preferredCities: [],
                workModes: [],
                availability: null,
                skills: [],
            },
        });

        const req = { userId: 'user-1' } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;
        const next = vi.fn();

        await profileGate(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('profileGate allows when profile complete', async () => {
        const { profileGate } = await import('../middleware/profileGate');
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'user-1',
            role: 'USER',
            profile: {
                educationLevel: 'DEGREE',
                gradCourse: 'B.Tech',
                gradSpecialization: 'CSE',
                gradYear: 2024,
                tenthYear: 2018,
                twelfthYear: 2020,
                interestedIn: ['JOB'],
                preferredCities: ['Bangalore'],
                workModes: ['ONSITE'],
                availability: 'IMMEDIATE',
                skills: ['TypeScript'],
            },
        });

        const req = { userId: 'user-1' } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;
        const next = vi.fn();

        await profileGate(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('profileGate bypasses admins', async () => {
        const { profileGate } = await import('../middleware/profileGate');
        prismaMock.user.findUnique.mockResolvedValue({
            id: 'admin-1',
            role: 'ADMIN',
            profile: { completionPercentage: 0 },
        });

        const req = { userId: 'admin-1' } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;
        const next = vi.fn();

        await profileGate(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});

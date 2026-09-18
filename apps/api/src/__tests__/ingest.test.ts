import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';
process.env.INTERNAL_API_SECRET = 'test-ingest-secret';

const prismaMock = {
    opportunity: { findFirst: vi.fn(), create: vi.fn() },
    jobSubmission: { findFirst: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('@fresherflow/database', () => ({
    prisma: prismaMock,
    redis: {},
    CommentType: { GENERAL: 'GENERAL' },
    CommentVoteValue: { UPVOTE: 'UPVOTE', DOWNVOTE: 'DOWNVOTE' },
    JobSignalType: { APPLIED: 'APPLIED' },
    NotificationType: { COMMENT_REPLY: 'COMMENT_REPLY' },
    ReportReason: { SPAM: 'SPAM' },
    ReportStatus: { OPEN: 'OPEN' },
    JobSubmissionStatus: { PUBLISHED: 'PUBLISHED' },
}));

let app: express.Application;

beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../routes/ingest/jobs');
    const router = (mod.default ?? mod) as Router;
    app = express();
    app.use(express.json());
    app.use('/api/ingest', router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    });
    prismaMock.opportunity.findFirst.mockResolvedValue(null);
    prismaMock.jobSubmission.findFirst.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-1' });
    prismaMock.opportunity.create.mockResolvedValue({ id: 'opp-1', slug: 'acme-engineer' });
    prismaMock.jobSubmission.create.mockResolvedValue({ id: 'sub-1' });
});

describe('POST /api/ingest/jobs', () => {
    it('returns 401 without a valid x-api-key', async () => {
        const res = await request(app).post('/api/ingest/jobs').send({ title: 'E', company: 'Acme' });
        expect(res.status).toBe(401);
    });

    it('returns 400 when no URL is provided', async () => {
        const res = await request(app)
            .post('/api/ingest/jobs')
            .set('x-api-key', 'test-ingest-secret')
            .send({ title: 'Engineer', company: 'Acme' });
        expect(res.status).toBe(400);
    });

    it('creates a job with a full agent payload', async () => {
        const res = await request(app)
            .post('/api/ingest/jobs')
            .set('x-api-key', 'test-ingest-secret')
            .send({
                title: 'Software Engineer',
                company: 'Acme',
                sourceLink: 'https://careers.acme.com/jobs/123',
                locations: ['Bangalore'],
                workMode: 'REMOTE',
                salaryRange: '6-8 LPA',
                requiredSkills: ['react'],
                tags: ['fresher'],
            });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.verdict).toBe('created');
        expect(prismaMock.opportunity.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ salaryRange: '6-8 LPA', tags: ['fresher'] }) })
        );
    });

    it('folds duplicates into verdict=duplicate', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValueOnce({ id: 'opp-9', slug: 'existing-job' });
        const res = await request(app)
            .post('/api/ingest/jobs')
            .set('x-api-key', 'test-ingest-secret')
            .send({ title: 'Engineer', company: 'Acme', sourceLink: 'https://careers.acme.com/jobs/123' });
        expect(res.status).toBe(200);
        expect(res.body.verdict).toBe('duplicate');
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });
});

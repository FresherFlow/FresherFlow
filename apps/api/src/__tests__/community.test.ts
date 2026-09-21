import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Secrets/env for token + redis-free rate limiting
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    opportunity: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
    },
    opportunityComment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    commentVote: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
    },
    jobSignal: {
        groupBy: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    jobSubmission: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    report: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    notification: {
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    communityPost: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
    },
    communityPostComment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    communityPostVote: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        groupBy: vi.fn(),
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('@fresherflow/database', () => ({
    prisma: prismaMock,
    redis: {},
    CommentType: {
        GENERAL: 'GENERAL',
        QUESTION: 'QUESTION',
        EXPERIENCE: 'EXPERIENCE',
        UPDATE: 'UPDATE',
        CORRECTION: 'CORRECTION',
        WARNING: 'WARNING',
        REFERRAL: 'REFERRAL',
    },
    CommentVoteValue: { UPVOTE: 'UPVOTE', DOWNVOTE: 'DOWNVOTE' },
    JobSignalType: {
        APPLIED: 'APPLIED',
        INTERVIEWED: 'INTERVIEWED',
        OFFER: 'OFFER',
        CLOSED: 'CLOSED',
        HELPFUL: 'HELPFUL',
        INCORRECT: 'INCORRECT',
    },
    NotificationType: {
        COMMENT_REPLY: 'COMMENT_REPLY',
        COMMENT_VOTE: 'COMMENT_VOTE',
        JOB_SIGNAL_MILESTONE: 'JOB_SIGNAL_MILESTONE',
        JOB_UPDATED: 'JOB_UPDATED',
        JOB_CLOSED: 'JOB_CLOSED',
        NEW_MATCHING_JOB: 'NEW_MATCHING_JOB',
        ROOM_HELPFUL: 'ROOM_HELPFUL',
    },
    ReportReason: {
        SPAM: 'SPAM',
        INACCURATE: 'INACCURATE',
        EXPIRED: 'EXPIRED',
        OFFENSIVE: 'OFFENSIVE',
        OTHER: 'OTHER',
    },
    ReportStatus: { OPEN: 'OPEN', REVIEWING: 'REVIEWING', RESOLVED: 'RESOLVED', DISMISSED: 'DISMISSED' },
    JobSubmissionStatus: { PUBLISHED: 'PUBLISHED', MERGED: 'MERGED', PENDING_REVIEW: 'PENDING_REVIEW', REJECTED: 'REJECTED' },
    CommunityPostCategory: {
        DISCUSSION: 'DISCUSSION',
        QUESTION: 'QUESTION',
        EXPERIENCE: 'EXPERIENCE',
        INTERVIEW_EXPERIENCE: 'INTERVIEW_EXPERIENCE',
        HIRING_UPDATE: 'HIRING_UPDATE',
        UPDATE: 'UPDATE',
        REFERRAL: 'REFERRAL',
        OTHER: 'OTHER',
    },
    CommunityPostStatus: {
        ACTIVE: 'ACTIVE',
        ARCHIVED: 'ARCHIVED',
        DELETED: 'DELETED',
    },
}));

// Test auth: caller injects identity via headers so we can exercise 401/403 paths.
vi.mock('../middleware/auth', () => ({
    optionalAuth: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.headers['x-test-user'];
        if (typeof user === 'string' && user) {
            req.userId = user;
            req.isAnonymous = req.headers['x-test-anon'] === 'true';
        }
        next();
    },
    requireAuth: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.headers['x-test-user'];
        if (typeof user !== 'string' || !user) {
            const err: Error & { statusCode?: number } = new Error('Authentication required');
            err.statusCode = 401;
            return next(err);
        }
        req.userId = user;
        req.isAnonymous = req.headers['x-test-anon'] === 'true';
        next();
    },
    requireAdmin: (_req: Request, _res: Response, next: NextFunction) => {
        next();
    },
}));

let app: express.Application;
let resetRateLimitStoreForTests: () => void;

const AUTH = { 'x-test-user': 'user-1' };
const ANON = { 'x-test-user': 'anon-1', 'x-test-anon': 'true' };

function author(id: string) {
    return { id, fullName: `Name ${id}`, username: `user_${id}`, profile: { avatarUrl: null } };
}

beforeAll(async () => {
    // Import after vi.mock so the mocked @fresherflow/database factory is in place.
    ({ resetRateLimitStoreForTests } = await import('../middleware/rateLimit'));

    const [jobs, notifications, users, communityPosts] = await Promise.all([
        import('../routes/community/jobs'),
        import('../routes/community/notifications'),
        import('../routes/community/users'),
        import('../routes/community/communityPosts'),
    ]);

    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobs.default as Router);
    app.use('/api/notifications', notifications.default as Router);
    app.use('/api/users', users.default as Router);
    app.use('/api/community', communityPosts.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message, statusCode: err.statusCode || 500 } });
    });
});

beforeEach(() => {
    vi.clearAllMocks();
    // Rate-limit counters are keyed by IP in the in-memory fallback, so every
    // case in this suite shares one bucket. Reset it so write-heavy cases do not
    // leak 429s into unrelated assertions.
    resetRateLimitStoreForTests();
    prismaMock.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', slug: 'acme-engineer', title: 'Engineer', company: 'Acme', postedByUserId: 'admin' });
    prismaMock.commentVote.findMany.mockResolvedValue([]);
    prismaMock.jobSignal.findMany.mockResolvedValue([]);
    prismaMock.jobSignal.groupBy.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);
    // Community post defaults
    prismaMock.communityPost.findMany.mockResolvedValue([]);
    prismaMock.communityPost.count.mockResolvedValue(0);
    prismaMock.communityPost.findUnique.mockResolvedValue(null);
    prismaMock.communityPost.findFirst.mockResolvedValue(null);
    prismaMock.communityPostComment.findMany.mockResolvedValue([]);
    prismaMock.communityPostComment.findFirst.mockResolvedValue(null);
    prismaMock.communityPostComment.findUnique.mockResolvedValue(null);
    prismaMock.communityPostVote.findMany.mockResolvedValue([]);
    prismaMock.communityPostVote.findUnique.mockResolvedValue(null);
    prismaMock.communityPostVote.groupBy.mockResolvedValue([]);
    // Comment-counts endpoint defaults
    prismaMock.opportunity.findMany.mockResolvedValue([]);
    prismaMock.opportunityComment.groupBy.mockResolvedValue([]);
});

describe('GET /api/jobs/comment-counts', () => {
    it('returns batched counts keyed by the requested slug/id', async () => {
        prismaMock.opportunity.findMany.mockResolvedValue([
            { id: 'opp-1', slug: 'acme-engineer' },
            { id: 'opp-2', slug: 'beta-engineer' },
        ]);
        prismaMock.opportunityComment.groupBy.mockResolvedValue([
            { opportunityId: 'opp-1', _count: { _all: 4 } },
            { opportunityId: 'opp-2', _count: { _all: 1 } },
        ]);

        const res = await request(app).get('/api/jobs/comment-counts?ids=acme-engineer,opp-2');

        expect(res.status).toBe(200);
        expect(res.body.counts).toEqual({ 'acme-engineer': 4, 'opp-2': 1 });
    });

    it('omits opportunities with zero visible comments', async () => {
        prismaMock.opportunity.findMany.mockResolvedValue([{ id: 'opp-1', slug: 'acme-engineer' }]);
        prismaMock.opportunityComment.groupBy.mockResolvedValue([]);

        const res = await request(app).get('/api/jobs/comment-counts?ids=acme-engineer');

        expect(res.status).toBe(200);
        expect(res.body.counts).toEqual({});
    });

    it('returns empty counts for an empty ids param', async () => {
        const res = await request(app).get('/api/jobs/comment-counts?ids=');
        expect(res.status).toBe(200);
        expect(res.body.counts).toEqual({});
    });
});

describe('GET /api/jobs/:id/comments', () => {
    it('returns a threaded tree and null myVote for guests', async () => {
        prismaMock.opportunityComment.findMany.mockResolvedValue([
            { id: 'c1', text: 'root', commentType: 'GENERAL', upvotes: 1, downvotes: 0, createdAt: new Date(), editedAt: null, parentCommentId: null, userId: 'user-2', user: author('user-2') },
            { id: 'c2', text: 'reply', commentType: 'QUESTION', upvotes: 0, downvotes: 0, createdAt: new Date(), editedAt: null, parentCommentId: 'c1', userId: 'user-3', user: author('user-3') },
        ]);

        const res = await request(app).get('/api/jobs/acme-engineer/comments');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(2);
        expect(res.body.comments).toHaveLength(1);
        expect(res.body.comments[0].replies).toHaveLength(1);
        expect(res.body.comments[0].myVote).toBeNull();
    });

    it('returns 404 for an unknown opportunity', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue(null);
        const res = await request(app).get('/api/jobs/missing/comments');
        expect(res.status).toBe(404);
    });
});

describe('POST /api/jobs/:id/comments', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).post('/api/jobs/opp-1/comments').send({ text: 'hi' });
        expect(res.status).toBe(401);
    });

    it('returns 401 for anonymous identities', async () => {
        const res = await request(app).post('/api/jobs/opp-1/comments').set(ANON).send({ text: 'hi' });
        expect(res.status).toBe(401);
    });

    it('returns 400 for empty text', async () => {
        const res = await request(app).post('/api/jobs/opp-1/comments').set(AUTH).send({ text: '' });
        expect(res.status).toBe(400);
    });

    it('creates a comment and returns 201', async () => {
        prismaMock.opportunityComment.create.mockResolvedValue({
            id: 'c-new', text: 'hello', commentType: 'GENERAL', upvotes: 0, downvotes: 0,
            createdAt: new Date(), editedAt: null, user: author('user-1'),
        });

        const res = await request(app).post('/api/jobs/opp-1/comments').set(AUTH).send({ text: 'hello' });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('c-new');
        expect(prismaMock.opportunityComment.create).toHaveBeenCalled();
    });

    it('notifies the parent author on a reply', async () => {
        prismaMock.opportunityComment.findFirst.mockResolvedValue({ id: 'parent', userId: 'user-2' });
        prismaMock.opportunityComment.create.mockResolvedValue({
            id: 'c-reply', text: 'nice', commentType: 'GENERAL', upvotes: 0, downvotes: 0,
            createdAt: new Date(), editedAt: null, user: author('user-1'),
        });

        const res = await request(app)
            .post('/api/jobs/opp-1/comments')
            .set(AUTH)
            .send({ text: 'nice', parentCommentId: 'parent' });

        expect(res.status).toBe(201);
        expect(prismaMock.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ userId: 'user-2', type: 'COMMENT_REPLY', actorId: 'user-1' }) })
        );
    });
});

describe('POST /api/jobs/:id/comments/:commentId/vote', () => {
    it('rejects an invalid vote value with 400', async () => {
        const res = await request(app).post('/api/jobs/opp-1/comments/c1/vote').set(AUTH).send({ value: 'SIDEWAYS' });
        expect(res.status).toBe(400);
    });

    it('recomputes counts and returns myVote', async () => {
        prismaMock.opportunityComment.findFirst.mockResolvedValue({ id: 'c1' });
        prismaMock.commentVote.findUnique.mockResolvedValue(null);
        prismaMock.commentVote.groupBy.mockResolvedValue([{ value: 'UPVOTE', _count: { _all: 1 } }]);
        prismaMock.opportunityComment.update.mockResolvedValue({});

        const res = await request(app).post('/api/jobs/opp-1/comments/c1/vote').set(AUTH).send({ value: 'UPVOTE' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ upvotes: 1, downvotes: 0, myVote: 'UPVOTE' });
    });
});

describe('DELETE /api/jobs/:id/comments/:commentId', () => {
    it('returns 403 for a non-author', async () => {
        prismaMock.opportunityComment.findFirst.mockResolvedValue({ id: 'c1', userId: 'someone-else' });
        const res = await request(app).delete('/api/jobs/opp-1/comments/c1').set(AUTH);
        expect(res.status).toBe(403);
    });

    it('returns 204 for the author', async () => {
        prismaMock.opportunityComment.findFirst.mockResolvedValue({ id: 'c1', userId: 'user-1' });
        prismaMock.opportunityComment.update.mockResolvedValue({});
        const res = await request(app).delete('/api/jobs/opp-1/comments/c1').set(AUTH);
        expect(res.status).toBe(204);
    });
});

describe('signals', () => {
    it('returns summary and empty mySignals for guests', async () => {
        prismaMock.jobSignal.groupBy.mockResolvedValue([{ signalType: 'APPLIED', _count: { _all: 3 } }]);
        const res = await request(app).get('/api/jobs/opp-1/signals');
        expect(res.status).toBe(200);
        expect(res.body.summary.APPLIED).toBe(3);
        expect(res.body.mySignals).toEqual([]);
    });

    it('rejects an invalid signal type with 400 and rate-limits the flood with 429', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 31; i += 1) {
            const res = await request(app).post('/api/jobs/opp-1/signals').set(AUTH).send({ signalType: 'NOPE' });
            statuses.push(res.status);
        }
        expect(statuses[0]).toBe(400);
        expect(statuses[statuses.length - 1]).toBe(429);
    });
});

describe('POST /api/jobs/submit', () => {
    it('returns 400 for a non-https source URL', async () => {
        const res = await request(app)
            .post('/api/jobs/submit')
            .set(AUTH)
            .send({ sourceUrl: 'ftp://example.com/job', title: 'Engineer' });
        expect(res.status).toBe(400);
    });

    it('folds a duplicate URL into the existing job', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValueOnce({ id: 'opp-9', slug: 'existing-job' });
        const res = await request(app)
            .post('/api/jobs/submit')
            .set(AUTH)
            .send({ sourceUrl: 'https://example.com/job', title: 'Engineer' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ existing: true, id: 'opp-9', slug: 'existing-job', status: 'PUBLISHED' });
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('creates a pending opportunity and records provenance', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue(null);
        prismaMock.jobSubmission.findFirst.mockResolvedValue(null);
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
        prismaMock.opportunity.create.mockResolvedValue({ id: 'opp-new', slug: 'acme-engineer' });
        prismaMock.jobSubmission.create.mockResolvedValue({ id: 'sub-new' });

        const res = await request(app)
            .post('/api/jobs/submit')
            .set(AUTH)
            .send({ sourceUrl: 'https://example.com/job', title: 'Engineer', company: 'Acme' });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ existing: false, id: 'opp-new', slug: 'acme-engineer', status: 'PENDING_REVIEW' });
        expect(prismaMock.jobSubmission.create).toHaveBeenCalled();
        // Web shares must never auto-publish.
        expect(prismaMock.opportunity.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) })
        );
    });

    it('allows guests without auth and attributes to a community user', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue(null);
        prismaMock.jobSubmission.findFirst.mockResolvedValue(null);
        prismaMock.user.findFirst.mockResolvedValue({ id: 'community-bot' });
        prismaMock.opportunity.create.mockResolvedValue({ id: 'opp-guest', slug: 'acme-engineer' });
        prismaMock.jobSubmission.create.mockResolvedValue({ id: 'sub-guest' });

        const res = await request(app)
            .post('/api/jobs/submit')
            .send({ sourceUrl: 'https://example.com/guest-job', title: 'Engineer', contact: 'guest@example.com' });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({ existing: false, id: 'opp-guest', slug: 'acme-engineer', status: 'PENDING_REVIEW' });
        expect(prismaMock.opportunity.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ postedByUserId: 'community-bot' }) })
        );
    });

    it('persists full job fields from /contribute', async () => {
        prismaMock.opportunity.findFirst.mockResolvedValue(null);
        prismaMock.jobSubmission.findFirst.mockResolvedValue(null);
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
        prismaMock.opportunity.create.mockResolvedValue({ id: 'opp-full', slug: 'acme-engineer' });
        prismaMock.jobSubmission.create.mockResolvedValue({ id: 'sub-full' });

        const res = await request(app)
            .post('/api/jobs/submit')
            .set(AUTH)
            .send({
                sourceUrl: 'https://example.com/full-job',
                title: 'Engineer',
                company: 'Acme',
                locations: ['Bangalore'],
                workMode: 'REMOTE',
                salaryRange: '6-8 LPA',
                requiredSkills: ['react'],
                tags: ['fresher'],
                allowedCourses: ['B.Tech'],
                allowedPassoutYears: [2025],
                jobFunction: 'Engineering',
            });

        expect(res.status).toBe(201);
        expect(prismaMock.opportunity.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    locations: ['Bangalore'],
                    salaryRange: '6-8 LPA',
                    tags: ['fresher'],
                    allowedCourses: ['B.Tech'],
                    allowedPassoutYears: [2025],
                    jobFunction: 'Engineering',
                }),
            })
        );
    });
});

describe('POST /api/jobs/:id/reports', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).post('/api/jobs/opp-1/reports').send({ reason: 'SPAM' });
        expect(res.status).toBe(401);
    });

    it('dedupes an identical open report', async () => {
        prismaMock.report.findFirst.mockResolvedValue({ id: 'r1' });
        const res = await request(app).post('/api/jobs/opp-1/reports').set(AUTH).send({ reason: 'SPAM' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'r1', deduped: true });
        expect(prismaMock.report.create).not.toHaveBeenCalled();
    });

    it('creates a report', async () => {
        prismaMock.report.findFirst.mockResolvedValue(null);
        prismaMock.report.create.mockResolvedValue({ id: 'r2' });
        const res = await request(app).post('/api/jobs/opp-1/reports').set(AUTH).send({ reason: 'INACCURATE', message: 'stale' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 'r2', deduped: false });
    });
});

describe('notifications', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).get('/api/notifications');
        expect(res.status).toBe(401);
    });

    it('returns a user-scoped list', async () => {
        prismaMock.notification.findMany.mockResolvedValue([
            {
                id: 'n1', type: 'COMMENT_REPLY', commentId: 'c1', payload: { excerpt: 'hi' },
                readAt: null, createdAt: new Date(), actor: author('user-2'),
                opportunity: { id: 'opp-1', slug: 'acme-engineer', title: 'Engineer' },
            },
        ]);
        prismaMock.notification.count.mockResolvedValue(1);

        const res = await request(app).get('/api/notifications').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.unreadCount).toBe(1);
        expect(res.body.notifications[0].actor.id).toBe('user-2');
    });

    it('marks notifications read', async () => {
        prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });
        const res = await request(app).post('/api/notifications/read').set(AUTH).send({ ids: ['n1', 'n2'] });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ updated: 2 });
    });
});

// ========================================
// Community Posts (previously untested)
// ========================================

describe('GET /api/community/feed', () => {
    it('returns paginated posts with author info for guests', async () => {
        prismaMock.communityPost.findMany.mockResolvedValue([
            {
                id: 'post-1', title: 'My first post', body: 'Hello world',
                category: 'DISCUSSION', tags: ['react'], isAnonymous: false, anonId: null,
                likesCount: 5, commentsCount: 2, status: 'ACTIVE',
                createdAt: new Date(), updatedAt: new Date(), expiredAt: null,
                sourceOpportunityId: null,
                author: author('user-1'),
                comments: [],
                votes: [],
            },
        ]);
        prismaMock.communityPost.count.mockResolvedValue(1);

        const res = await request(app).get('/api/community/feed');

        expect(res.status).toBe(200);
        expect(res.body.posts).toHaveLength(1);
        expect(res.body.total).toBe(1);
        expect(res.body.posts[0].author.id).toBe('user-1');
        expect(res.body.posts[0].myVote).toBeNull();
    });

    it('filters by category', async () => {
        prismaMock.communityPost.findMany.mockResolvedValue([]);
        prismaMock.communityPost.count.mockResolvedValue(0);

        const res = await request(app).get('/api/community/feed?category=QUESTION');

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ category: 'QUESTION' }),
            })
        );
    });
});

describe('POST /api/community', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app)
            .post('/api/community')
            .send({ title: 'Test', body: 'Body here' });
        expect(res.status).toBe(401);
    });

    it('returns 401 for anonymous identities', async () => {
        const res = await request(app)
            .post('/api/community')
            .set(ANON)
            .send({ title: 'Test', body: 'Body here' });
        expect(res.status).toBe(401);
    });

    it('returns 400 for empty title', async () => {
        const res = await request(app)
            .post('/api/community')
            .set(AUTH)
            .send({ title: '', body: 'Body here' });
        expect(res.status).toBe(400);
    });

    it('creates a community post and returns 201', async () => {
        prismaMock.communityPost.create.mockResolvedValue({
            id: 'post-new', title: 'Help needed', body: 'How to learn React?',
            category: 'QUESTION', tags: ['react'], isAnonymous: false, anonId: null,
            likesCount: 0, commentsCount: 0, status: 'ACTIVE',
            createdAt: new Date(), updatedAt: new Date(), expiredAt: null,
            sourceOpportunityId: null,
            author: author('user-1'),
        });

        const res = await request(app)
            .post('/api/community')
            .set(AUTH)
            .send({ title: 'Help needed', body: 'How to learn React?', category: 'QUESTION' });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('post-new');
        expect(res.body.title).toBe('Help needed');
        expect(prismaMock.communityPost.create).toHaveBeenCalled();
    });
});

describe('POST /api/community/:id/vote', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app)
            .post('/api/community/post-1/vote')
            .send({ value: 1 });
        expect(res.status).toBe(401);
    });

    it('marks helpful and returns counts', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1', authorId: 'user-2', title: 'Hello', likesCount: 2 });
        prismaMock.communityPostVote.findUnique.mockResolvedValue(null);
        prismaMock.communityPostVote.groupBy.mockResolvedValue([
            { value: 1, _count: { _all: 3 } },
        ]);
        prismaMock.communityPost.update.mockResolvedValue({});

        const res = await request(app)
            .post('/api/community/post-1/vote')
            .set(AUTH)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.helpfulCount).toBe(3);
        expect(res.body.isHelpful).toBe(true);
        expect(prismaMock.communityPostVote.create).toHaveBeenCalledWith({
            data: { postId: 'post-1', userId: 'user-1', value: 1 },
        });
    });

    it('un-marks helpful on second click (toggle off)', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1', authorId: 'user-2', title: 'Hello', likesCount: 3 });
        prismaMock.communityPostVote.findUnique.mockResolvedValue({ id: 'v1' });
        prismaMock.communityPostVote.groupBy.mockResolvedValue([
            { value: 1, _count: { _all: 2 } },
        ]);
        prismaMock.communityPost.update.mockResolvedValue({});

        const res = await request(app)
            .post('/api/community/post-1/vote')
            .set(AUTH)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.helpfulCount).toBe(2);
        expect(res.body.isHelpful).toBe(false);
        expect(prismaMock.communityPostVote.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    });

    it('returns 404 for non-existent post', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue(null);
        const res = await request(app)
            .post('/api/community/missing/vote')
            .set(AUTH)
            .send({ value: 1 });
        expect(res.status).toBe(404);
    });
});

describe('POST /api/community/:id/comments', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app)
            .post('/api/community/post-1/comments')
            .send({ body: 'Nice post!' });
        expect(res.status).toBe(401);
    });

    it('creates a comment and returns 201', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1', commentsCount: 0 });
        prismaMock.communityPostComment.create.mockResolvedValue({
            id: 'c-new', body: 'Nice post!', isAnonymous: false, anonId: null,
            likesCount: 0, createdAt: new Date(), updatedAt: new Date(),
            author: author('user-1'),
        });
        prismaMock.communityPost.update.mockResolvedValue({});

        const res = await request(app)
            .post('/api/community/post-1/comments')
            .set(AUTH)
            .send({ body: 'Nice post!' });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('c-new');
        expect(res.body.body).toBe('Nice post!');
    });

    it('notifies parent author on reply', async () => {
        prismaMock.communityPost.findUnique.mockResolvedValue({ id: 'post-1', commentsCount: 1 });
        prismaMock.communityPostComment.findFirst.mockResolvedValue({ id: 'parent', authorId: 'user-2' });
        prismaMock.communityPostComment.create.mockResolvedValue({
            id: 'c-reply', body: 'Agreed!', isAnonymous: false, anonId: null,
            likesCount: 0, createdAt: new Date(), updatedAt: new Date(),
            author: author('user-1'),
        });
        prismaMock.communityPost.update.mockResolvedValue({});
        prismaMock.notification.create.mockResolvedValue({});

        const res = await request(app)
            .post('/api/community/post-1/comments')
            .set(AUTH)
            .send({ body: 'Agreed!', parentId: 'parent' });

        expect(res.status).toBe(201);
        expect(prismaMock.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'user-2',
                    type: 'COMMENT_REPLY',
                    actorId: 'user-1',
                }),
            })
        );
    });
});

describe('DELETE /api/community/:id/comments/:commentId', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).delete('/api/community/post-1/comments/c1');
        expect(res.status).toBe(401);
    });

    it('returns 403 for non-author', async () => {
        prismaMock.communityPostComment.findFirst.mockResolvedValue({ id: 'c1', authorId: 'someone-else' });
        const res = await request(app).delete('/api/community/post-1/comments/c1').set(AUTH);
        expect(res.status).toBe(403);
    });

    it('soft-deletes comment and decrements count for author', async () => {
        prismaMock.communityPostComment.findFirst.mockResolvedValue({ id: 'c1', authorId: 'user-1' });
        prismaMock.communityPostComment.update.mockResolvedValue({});
        prismaMock.communityPost.update.mockResolvedValue({});

        const res = await request(app).delete('/api/community/post-1/comments/c1').set(AUTH);
        expect(res.status).toBe(204);
        expect(prismaMock.communityPostComment.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ deletedAt: expect.any(Date) }),
            })
        );
    });
});

describe('POST /api/community/:id/comments/:commentId/vote', () => {
    it('returns 401 when unauthenticated', async () => {
        const res = await request(app)
            .post('/api/community/post-1/comments/c1/vote')
            .send({ value: 1 });
        expect(res.status).toBe(401);
    });

    it('marks comment helpful and returns counts', async () => {
        prismaMock.communityPostComment.findUnique.mockResolvedValue({ id: 'c1', postId: 'post-1', authorId: 'user-2', body: 'hey', likesCount: 1 });
        prismaMock.communityPostVote.findUnique.mockResolvedValue(null);
        prismaMock.communityPostVote.groupBy.mockResolvedValue([
            { value: 1, _count: { _all: 2 } },
        ]);
        prismaMock.communityPostComment.update.mockResolvedValue({});

        const res = await request(app)
            .post('/api/community/post-1/comments/c1/vote')
            .set(AUTH)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.helpfulCount).toBe(2);
        expect(res.body.isHelpful).toBe(true);
    });
});

// ========================================
// Search & Tag Filtering (new)
// ========================================

describe('GET /api/community/feed search + tags', () => {
    it('passes search term to the service', async () => {
        prismaMock.communityPost.findMany.mockResolvedValue([]);
        prismaMock.communityPost.count.mockResolvedValue(0);

        const res = await request(app).get('/api/community/feed?search=react%20developer');

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        expect.objectContaining({ title: expect.objectContaining({ contains: 'react developer' }) }),
                    ]),
                }),
            })
        );
    });

    it('passes multiple tags as hasEvery filter', async () => {
        prismaMock.communityPost.findMany.mockResolvedValue([]);
        prismaMock.communityPost.count.mockResolvedValue(0);

        const res = await request(app).get('/api/community/feed?tags=react,typescript');

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    tags: { hasEvery: ['react', 'typescript'] },
                }),
            })
        );
    });

    it('combines search + category + tags', async () => {
        prismaMock.communityPost.findMany.mockResolvedValue([]);
        prismaMock.communityPost.count.mockResolvedValue(0);

        const res = await request(app).get(
            '/api/community/feed?search=job&category=QUESTION&tags=react'
        );

        expect(res.status).toBe(200);
        expect(prismaMock.communityPost.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    category: 'QUESTION',
                    tags: { hasEvery: ['react'] },
                    OR: expect.arrayContaining([
                        expect.objectContaining({ title: expect.objectContaining({ contains: 'job' }) }),
                    ]),
                }),
            })
        );
    });
});

/**
 * Regression tests for authorization and PII-exposure fixes.
 *
 * Deliberately narrow: each case pins a specific defect found by audit. These
 * would otherwise pass CI silently, because a leaked field or a missing guard
 * produces no type error.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long-enough';
process.env.REDIS_ENABLED = 'false';

const userFindFirst = vi.fn();
const userFindUnique = vi.fn();
const userCount = vi.fn();
const membershipFindFirst = vi.fn();
const inviteCreate = vi.fn();
const refreshTokenUpdateMany = vi.fn();
const opportunityFindFirst = vi.fn();
const opportunityFindMany = vi.fn().mockResolvedValue([]);
const savedDeleteMany = vi.fn();
const savedCreate = vi.fn();
const opportunityUpdateMany = vi.fn();
const opportunityUpdate = vi.fn();
const listSocialPostsMock = vi.fn();

vi.mock('../infrastructure/services/alerts/social/socialPost.service', () => ({
  listSocialPosts: (...args: unknown[]) => listSocialPostsMock(...(args as [])),
  retrySocialPost: vi.fn().mockResolvedValue(undefined),
}));

const prismaMock = {
    user: { findFirst: userFindFirst, findUnique: userFindUnique, count: userCount },
    organizationMembership: { findFirst: membershipFindFirst },
    organizationInvite: { create: inviteCreate },
    refreshToken: { updateMany: refreshTokenUpdateMany },
    opportunity: {
        findFirst: opportunityFindFirst,
        findUnique: vi.fn(),
        findMany: opportunityFindMany,
        update: opportunityUpdate,
        updateMany: opportunityUpdateMany,
    },
    savedOpportunity: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: savedCreate,
        deleteMany: savedDeleteMany,
    },
    userAction: { findMany: vi.fn().mockResolvedValue([]) },
};

vi.mock('@fresherflow/database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fresherflow/database')>();
    return { ...actual, prisma: prismaMock, redis: {} };
});

const PUBLIC_PROFILE = {
    id: 'p1',
    userId: 'u1',
    educationLevel: 'DEGREE',
    gradCourse: 'B.Tech',
    gradSpecialization: 'CSE',
    gradYear: 2024,
    collegeName: 'Some College',
    interestedIn: ['EMPLOYMENT'],
    preferredCities: ['Pune'],
    workModes: [],
    availability: 'IMMEDIATELY',
    skills: ['js'],
    homeState: 'Maharashtra',
    expectedCtc: 12,
    willingToRelocate: true,
    headline: 'Developer',
    about: '',
    githubUrl: null,
    linkedinUrl: null,
    portfolioUrl: null,
    avatarUrl: null,
    githubPinnedRepos: [],
    openToRecruiters: true,
    profilePublic: true,
    visibility: 'PUBLIC',
    completionPercentage: 80,
    profilePublishedAt: null,
    // Sensitive: must never reach an anonymous caller.
    dob: new Date('2000-01-01'),
    gender: 'MALE',
    category: 'GENERAL',
    isPwBD: false,
    isExServicemen: false,
    resumeUrl: 'https://example.com/secret-resume.pdf',
};

function mockUser(overrides: Record<string, unknown> = {}) {
    userFindFirst.mockResolvedValue({
        id: 'u1',
        fullName: 'Test User',
        username: 'testuser',
        createdAt: new Date('2024-01-01'),
        profile: { ...PUBLIC_PROFILE, ...overrides },
        projects: [],
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    userCount.mockResolvedValue(2);
    refreshTokenUpdateMany.mockResolvedValue({ count: 1 });
    inviteCreate.mockResolvedValue({ id: 'invite-1' });
    opportunityUpdateMany.mockResolvedValue({ count: 1 });
    opportunityUpdate.mockResolvedValue({});
    opportunityFindMany.mockResolvedValue([]);
    listSocialPostsMock.mockResolvedValue({ items: [], total: 0 });
    savedDeleteMany.mockResolvedValue({ count: 0 });
    savedCreate.mockResolvedValue({ id: 's1' });
    prismaMock.savedOpportunity.findMany.mockResolvedValue([]);
    prismaMock.userAction.findMany.mockResolvedValue([]);
});

describe('getPublicProfileByUsername (visibility + PII)', () => {
    it('omits dob, gender, category, isPwBD, isExServicemen and resumeUrl', async () => {
        const { ProfileService } = await import('../infrastructure/services/platform/profile.service');

        const result = await ProfileService.getPublicProfileByUsername('testuser');
        const p = result.profile as Record<string, unknown>;

        for (const leaked of ['dob', 'gender', 'category', 'isPwBD', 'isExServicemen', 'resumeUrl']) {
            expect(p, `public profile must not expose "${leaked}"`).not.toHaveProperty(leaked);
        }
    });

    it('still returns the public fields', async () => {
        const { ProfileService } = await import('../infrastructure/services/platform/profile.service');

        const result = await ProfileService.getPublicProfileByUsername('testuser');
        const p = result.profile as Record<string, unknown>;

        expect(p.gradCourse).toBe('B.Tech');
        expect(p.headline).toBe('Developer');
    });

    it('404s a PRIVATE profile instead of 403, so the account is not confirmed', async () => {
        mockUser({ visibility: 'PRIVATE' });
        const { ProfileService } = await import('../infrastructure/services/platform/profile.service');

        await expect(ProfileService.getPublicProfileByUsername('testuser')).rejects.toMatchObject({
            statusCode: 404,
        });
    });

    it('serves an UNLISTED profile directly by username', async () => {
        mockUser({ visibility: 'UNLISTED' });
        const { ProfileService } = await import('../infrastructure/services/platform/profile.service');

        const result = await ProfileService.getPublicProfileByUsername('testuser');
        expect((result.profile as Record<string, unknown>).visibility).toBe('UNLISTED');
    });
});

describe('auth middleware account-status check', () => {
    async function protectedApp() {
        const express = (await import('express')).default;
        const { requireAuth } = await import('../middleware/auth');
        const { generateAccessToken } = await import('@fresherflow/utils');

        const app = express();
        app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }));
        app.use((err: Error & { statusCode?: number }, _req, res, _next) => {
            res.status(err.statusCode || 500).json({ error: err.message });
        });

        return (token: string) => ({
            app,
            auth: { Authorization: `Bearer ${generateAccessToken(token)}` },
        });
    }

    it('rejects a suspended user', async () => {
        userFindUnique.mockResolvedValue({ status: 'SUSPENDED', trustLevel: 'BANNED' });
        const request = (await import('supertest')).default;
        const withAuth = await protectedApp();
        const { app, auth } = withAuth('u-sus');

        expect((await request(app).get('/protected').set(auth)).status).toBe(403);
    });

    it('rejects a BANNED user even when status is ACTIVE', async () => {
        userFindUnique.mockResolvedValue({ status: 'ACTIVE', trustLevel: 'BANNED' });
        const request = (await import('supertest')).default;
        const { app, auth } = (await protectedApp())('u-ban');

        expect((await request(app).get('/protected').set(auth)).status).toBe(403);
    });

    it('fails CLOSED when the account lookup errors', async () => {
        userFindUnique.mockRejectedValue(new Error('db down'));
        const request = (await import('supertest')).default;
        const { app, auth } = (await protectedApp())('u-err');

        expect((await request(app).get('/protected').set(auth)).status).toBe(503);
    });

    it('rejects a token whose user no longer exists', async () => {
        userFindUnique.mockResolvedValue(null);
        const request = (await import('supertest')).default;
        const { app, auth } = (await protectedApp())('u-ghost');

        expect((await request(app).get('/protected').set(auth)).status).toBe(401);
    });

    it('allows an active user through', async () => {
        userFindUnique.mockResolvedValue({ status: 'ACTIVE', trustLevel: 'VERIFIED' });
        const request = (await import('supertest')).default;
        const { app, auth } = (await protectedApp())('u-ok');

        expect((await request(app).get('/protected').set(auth)).status).toBe(200);
    });
});



describe('OrganizationService.inviteTeamMember membership guard', () => {
    it('refuses an invite from a non-member', async () => {
        membershipFindFirst.mockResolvedValue(null);
        const { OrganizationService } = await import('../infrastructure/services/organization/organization.service');

        await expect(
            OrganizationService.inviteTeamMember({
                organizationId: 'org-1',
                invitedByUserId: 'outsider',
                email: 'x@example.com',
            })
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(inviteCreate).not.toHaveBeenCalled();
    });

    it('allows a RECRUITER member to invite as RECRUITER and normalises the email', async () => {
        membershipFindFirst.mockResolvedValue({ role: 'RECRUITER' });
        const { OrganizationService } = await import('../infrastructure/services/organization/organization.service');

        await OrganizationService.inviteTeamMember({
            organizationId: 'org-1',
            invitedByUserId: 'member-1',
            email: 'New@Example.com',
        });

        expect(inviteCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ role: 'RECRUITER', email: 'new@example.com' }),
            })
        );
    });

    it('blocks a RECRUITER from granting an elevated role', async () => {
        membershipFindFirst.mockResolvedValue({ role: 'RECRUITER' });
        const { OrganizationService } = await import('../infrastructure/services/organization/organization.service');

        await expect(
            OrganizationService.inviteTeamMember({
                organizationId: 'org-1',
                invitedByUserId: 'member-1',
                email: 'x@example.com',
                role: 'ADMIN' as never,
            })
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(inviteCreate).not.toHaveBeenCalled();
    });

    it('allows an OWNER to grant an elevated role', async () => {
        membershipFindFirst.mockResolvedValue({ role: 'OWNER' });
        const { OrganizationService } = await import('../infrastructure/services/organization/organization.service');

        await OrganizationService.inviteTeamMember({
            organizationId: 'org-1',
            invitedByUserId: 'owner-1',
            email: 'x@example.com',
            role: 'ADMIN' as never,
        });

        expect(inviteCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ role: 'ADMIN' }),
            })
        );
    });
});

describe('validate middleware applies the parsed body', () => {
    it('strips keys the schema does not define', async () => {
        const express = (await import('express')).default;
        const request = (await import('supertest')).default;
        const { z } = await import('zod');
        const { validate } = await import('../middleware/validate');

        const app = express();
        app.use(express.json());
        app.post('/x', validate(z.object({ role: z.string() })), (req, res) =>
            res.json({ body: req.body })
        );

        const res = await request(app).post('/x').send({ role: 'user', escalate: true });
        expect(res.status).toBe(200);
        expect(res.body.body).toEqual({ role: 'user' });
    });
});

describe('buildOpportunityUpdateData (mass-assignment guard)', () => {
    async function loader() {
        return import('../infrastructure/services/opportunity/opportunity.service');
    }

    const existing = { id: 'opp-1', title: 'Old Title', company: 'Old Co' };

    it('keeps legitimately editable fields', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData(
            { title: 'New Title', description: 'desc', city: 'Pune' },
            existing
        );

        expect(data.title).toBe('New Title');
        expect(data.description).toBe('desc');
        expect(data.city).toBe('Pune');
    });

    it('drops deletedAt so a soft-deleted row cannot be un-deleted', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData({ title: 'X', deletedAt: null }, existing);

        expect(data).not.toHaveProperty('deletedAt');
    });

    it('drops denormalized counters owned by engagement', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData(
            { savesCount: 9999, clicksCount: 9999, sharesCount: 9999, trendingScore: 100 },
            existing
        );

        expect(data).not.toHaveProperty('savesCount');
        expect(data).not.toHaveProperty('clicksCount');
        expect(data).not.toHaveProperty('sharesCount');
        expect(data).not.toHaveProperty('trendingScore');
    });

    it('ignores a caller-supplied id, slug and createdAt', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData(
            { id: 'hijacked', slug: 'hijacked-slug', createdAt: new Date('1999-01-01') },
            existing
        );

        expect(data).not.toHaveProperty('id');
        expect(data).not.toHaveProperty('createdAt');
        // slug is only ever derived, never taken from the body
        expect(data).not.toHaveProperty('slug');
    });

    it('derives the slug itself when the title changes', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData({ title: 'New Title' }, existing);

        expect(typeof data.slug).toBe('string');
        expect(data.slug).not.toBe('');
    });

    it('always stamps lastVerified', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData({ title: 'New Title' }, existing);

        expect(data.lastVerified).toBeInstanceOf(Date);
    });

    it('generates a logo url from companyWebsite when none is supplied', async () => {
        const { buildOpportunityUpdateData } = await loader();
        const data = buildOpportunityUpdateData(
            { companyWebsite: 'https://example.com' },
            existing
        );

        expect(data.companyLogoUrl).toBeTruthy();
    });

});

describe('savedOpportunity toggle is race-safe', () => {
    // The toggle used to read-then-write: two concurrent taps both saw "not
    // saved" and both inserted, so the loser surfaced a 500 from the unique
    // constraint. It must now treat P2002 as "already saved".
    async function toggleServer(opts: { deleteCount: number; createImpl: () => Promise<unknown> }) {
        const express = (await import('express')).default;
        const request = (await import('supertest')).default;

        opportunityFindFirst.mockResolvedValue({ id: 'opp-1' });
        savedDeleteMany.mockResolvedValue({ count: opts.deleteCount });
        savedCreate.mockImplementation(opts.createImpl as never);

        const { default: savedRouter } = await import('../routes/saved');
        const { generateAccessToken } = await import('@fresherflow/utils');

        const app = express();
        app.use(express.json());
        app.use('/api/saved', savedRouter);
        app.use((err: Error & { statusCode?: number }, _req, res, _next) => {
            res.status(err.statusCode || 500).json({ error: err.message });
        });

        return { app, request, auth: { Authorization: `Bearer ${generateAccessToken('u1')}` } };
    }

    it('returns saved:false and unsaves when a row was deleted', async () => {
        const { app, request, auth } = await toggleServer({
            deleteCount: 1,
            createImpl: async () => {
                throw new Error('create must not run on the unsave branch');
            },
        });

        const res = await request(app).post('/api/saved/opp-1').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(false);
    });

    it('returns saved:true on the create path', async () => {
        const { app, request, auth } = await toggleServer({
            deleteCount: 0,
            createImpl: async () => ({ id: 's1' }),
        });

        const res = await request(app).post('/api/saved/opp-1').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(true);
    });

    it('treats a P2002 unique violation as success instead of a 500', async () => {
        const { app, request, auth } = await toggleServer({
            deleteCount: 0,
            createImpl: async () => {
                throw { code: 'P2002', meta: { target: ['userId', 'opportunityId'] } };
            },
        });

        const res = await request(app).post('/api/saved/opp-1').set(auth);
        expect(res.status).toBe(200);
        expect(res.body.saved).toBe(true);
    });

    it('still surfaces a non-unique create failure as a 500', async () => {
        const { app, request, auth } = await toggleServer({
            deleteCount: 0,
            createImpl: async () => {
                throw new Error('connection lost');
            },
        });

        const res = await request(app).post('/api/saved/opp-1').set(auth);
        expect(res.status).toBe(500);
    });
});


describe('calculateProfileCompletion', () => {
    it('does not short-circuit to 0 when the stored column is 0', async () => {
        const { calculateProfileCompletion } = await import('@fresherflow/utils');

        const result = calculateProfileCompletion({
            completionPercentage: 0,
            educationLevel: 'DEGREE',
            gradCourse: 'B.Tech',
            gradSpecialization: 'CSE',
            gradYear: 2024,
            tenthYear: 2020,
            twelfthYear: 2022,
        } as never);

        expect(result.percentage).toBeGreaterThan(0);
    });

    it('still honours an already-calculated non-zero percentage', async () => {
        const { calculateProfileCompletion } = await import('@fresherflow/utils');

        const result = calculateProfileCompletion({ completionPercentage: 100 } as never);
        expect(result.percentage).toBe(100);
        expect(result.isComplete).toBe(true);
    });
});

describe('executeBulkAction cannot resurrect soft-deleted rows', () => {
    // Bulk PUBLISH previously ran with no deletedAt guard while explicitly
    // setting deletedAt: null, so a bulk publish could un-delete removed
    // listings and put them straight back into the public feed.
    async function bulkSvc() {
        return import('../infrastructure/services/opportunity/opportunity.service');
    }

    it('scopes bulk DELETE to live rows only', async () => {
        const { OpportunityService } = await bulkSvc();
        opportunityFindFirst.mockResolvedValue([]);
        prismaMock.opportunity.updateMany.mockResolvedValue({ count: 0 });

        await OpportunityService.executeBulkAction(['a', 'b'], 'DELETE', 'spam');

        expect(opportunityUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ deletedAt: null }),
            })
        );
    });

    it('never writes deletedAt back to null during bulk PUBLISH', async () => {
        const { OpportunityService } = await bulkSvc();
        // Nothing live matches: every requested row is already soft-deleted.
        opportunityFindFirst.mockResolvedValue([]);
        prismaMock.opportunity.updateMany.mockResolvedValue({ count: 0 });

        const { result } = await OpportunityService.executeBulkAction(['dead'], 'PUBLISH');

        expect(result.count).toBe(0);
        for (const call of opportunityUpdateMany.mock.calls) {
            const data = (call[0] as { data?: Record<string, unknown> }).data ?? {};
            expect(data).not.toHaveProperty('deletedAt');
        }
    });

    it('publishes only live, not-already-published rows', async () => {
        const { OpportunityService } = await bulkSvc();
        opportunityFindMany.mockResolvedValue([
            { id: 'draft-1', status: 'DRAFT' },
            { id: 'published-1', status: 'PUBLISHED' },
        ]);
        prismaMock.opportunity.updateMany.mockResolvedValue({ count: 1 });

        const { result, idsNeedingAlerts } = await OpportunityService.executeBulkAction(
            ['draft-1', 'published-1'],
            'PUBLISH'
        );

        expect(idsNeedingAlerts).toEqual(['draft-1']);
        expect(result.count).toBe(1);
        expect(opportunityUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: { in: ['draft-1'] }, deletedAt: null }),
            })
        );
    });
});

describe('admin/social-posts requires real admin auth', () => {
    // restrictAdmin is a hostname check, not an auth check: it lets any request
    // carrying an Authorization header through. This router previously had no
    // auth guard of its own, so any signed-in candidate could list every social
    // post attempt and trigger a retry against a connected account.
    it('rejects a plain user and an anonymous caller, allows an admin', async () => {
        const express = (await import('express')).default;
        const request = (await import('supertest')).default;
        const { default: socialRouter } = await import('../routes/admin/social');
        const { generateAdminToken, generateAccessToken } = await import('@fresherflow/utils');

        listSocialPostsMock.mockResolvedValue({ items: [], total: 0 });

        const app = express();
        app.use(express.json());
        app.use('/api/admin/social-posts', socialRouter);
        app.use((err: Error & { statusCode?: number }, _req, res, _next) => {
            res.status(err.statusCode || 500).json({ error: err.message });
        });

        // A plain signed-in candidate must be rejected (403 = authenticated but
        // not an admin; 401 = no credentials. Either way the route is closed).
        const asUser = await request(app)
            .get('/api/admin/social-posts')
            .set('Authorization', `Bearer ${generateAccessToken('user-1')}`);
        expect(asUser.status).toBe(403);

        // No token at all must be rejected.
        const asAnon = await request(app).get('/api/admin/social-posts');
        expect(asAnon.status).toBe(401);

        // A real admin token is allowed through.
        const asAdmin = await request(app)
            .get('/api/admin/social-posts')
            .set('Authorization', `Bearer ${generateAdminToken('admin-1')}`);
        expect(asAdmin.status).toBe(200);
    });
});


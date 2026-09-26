/**
 * Phase 11 — organization membership and invite lifecycle.
 *
 * Weighted toward the rules that protect one tenant from another: role
 * enforcement, the "keep an owner" invariant, and the invite's binding to a
 * single mailbox. Those are the paths where a mistake is silent — a 200 with
 * the wrong tenant's data — so they are asserted directly rather than inferred
 * from a happy path.
 *
 * Prisma is mocked at the `@fresherflow/database` boundary, matching the
 * existing suites. Mocks are shaped around the decision each method makes (who,
 * which org, approved or not) rather than pinning exact Prisma argument
 * objects, so a query that is reordered but still correct does not fail here.
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAccessToken } from '@fresherflow/utils';
// `MembershipStatus` / `OrgRole` are intentionally NOT imported at the top level:
// `vi.mock` is hoisted above the imports, so any top-level binding from the
// mocked module is still in its temporal dead zone when the factory runs. The
// enum values are referenced as string literals instead, which is also what the
// Prisma client actually stores.

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_ADMIN_SECRET = 'test-admin-secret';
process.env.REDIS_ENABLED = 'false';

// String-valued mirrors of the Prisma enums. Declared locally because the
// module that owns them is mocked (see the note above).
const MembershipStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

const OrgRole = {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    RECRUITER: 'RECRUITER',
    VIEWER: 'VIEWER',
} as const;

type Membership = {
    id: string;
    userId: string;
    organizationId: string;
    role: OrgRole;
    status: MembershipStatus;
};

type Invite = {
    id: string;
    organizationId: string;
    email: string;
    role: OrgRole;
    invitedBy: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
};

type UserRow = {
    id: string;
    email: string | null;
    fullName: string | null;
    username: string | null;
    status: string;
};

type OrgRow = { id: string; name: string; active: boolean; verified: boolean };

const nextId = (prefix: string) => `${prefix}-${++state.seq}`;
const membershipKey = (userId: string, organizationId: string) => `${userId}::${organizationId}`;

/**
 * `vi.mock` is hoisted above module-level declarations, so the mock object has
 * to be created inside `vi.hoisted` or the factory closes over an uninitialised
 * binding. `state` rides along in the same block because the factory and the
 * test bodies both need the same instance. Every method gets its own `vi.fn()`
 * — sharing one stub across the tree would make an assertion on one call match
 * a different model's call.
 */
const { prismaMock, state } = vi.hoisted(() => {
    const f = () => vi.fn();
    return {
        prismaMock: {
            user: { findUnique: f(), findMany: f() },
            organization: { findUnique: f(), findFirst: f(), update: f() },
            organizationMembership: {
                findUnique: f(), findFirst: f(), findMany: f(), count: f(),
                create: f(), update: f(), delete: f(), upsert: f(),
            },
            organizationInvite: {
                findUnique: f(), findFirst: f(), findMany: f(), create: f(),
                update: f(), updateMany: f(), delete: f(),
            },
            candidateInterest: { findMany: f(), create: f() },
            $transaction: f(),
        },
        state: {
            users: new Map<string, any>(),
            orgs: new Map<string, any>(),
            memberships: new Map<string, any>(),
            invites: new Map<string, any>(),
            interests: [] as Array<Record<string, any>>,
            seq: 0,
        },
    };
});

vi.mock('@fresherflow/database', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@fresherflow/database')>();
    return { ...actual, prisma: prismaMock, redis: {} };
});

function addUser(id: string, email: string, overrides: Partial<UserRow> = {}): UserRow {
    const row: UserRow = { id, email, fullName: id, username: id.toLowerCase(), status: 'ACTIVE', ...overrides };
    state.users.set(id, row);
    return row;
}

function addOrg(id: string, overrides: Partial<OrgRow> = {}): OrgRow {
    const org: OrgRow = { id, name: `Org ${id}`, active: true, verified: false, ...overrides };
    state.orgs.set(id, org);
    return org;
}

function addMember(
    userId: string,
    organizationId: string,
    role: OrgRole,
    status: MembershipStatus = MembershipStatus.APPROVED
): Membership {
    const m: Membership = { id: nextId('m'), userId, organizationId, role, status };
    state.memberships.set(membershipKey(userId, organizationId), m);
    return m;
}

/**
 * Rewires the mock delegates onto the in-memory `state` for every test, so cases
 * stay independent when one of them mutates a membership.
 */
function installMocks() {
    prismaMock.user.findUnique.mockImplementation(async ({ where }: any) => {
        if (where?.id) return state.users.get(where.id) ?? null;
        if (where?.email) return [...state.users.values()].find((u) => u.email === where.email) ?? null;
        return null;
    });
    prismaMock.user.findMany.mockImplementation(async ({ where }: any) =>
        [...state.users.values()].filter((u) => where?.id?.in?.includes(u.id))
    );

    prismaMock.organization.findUnique.mockImplementation(async ({ where }: any) => {
        const org = state.orgs.get(where?.id);
        return org ? { ...org } : null;
    });
    prismaMock.organization.findFirst.mockImplementation(async ({ where }: any) => {
        const or = where?.OR ?? [];
        const match = [...state.orgs.values()].find((o) =>
            or.some((c: any) => (c.id && c.id === o.id) || (c.slug && c.slug === o.id))
        );
        return match ? { ...match, members: [] } : null;
    });
    prismaMock.organization.update.mockImplementation(async ({ where, data }: any) => {
        const org = state.orgs.get(where.id);
        if (!org) throw new Error('org not found');
        Object.assign(org, data);
        return { ...org };
    });

    prismaMock.organizationMembership.findUnique.mockImplementation(async ({ where }: any) => {
        const key = membershipKey(
            where?.userId_organizationId?.userId,
            where?.userId_organizationId?.organizationId
        );
        return state.memberships.get(key) ?? null;
    });
    prismaMock.organizationMembership.findFirst.mockImplementation(async ({ where }: any) =>
        [...state.memberships.values()].find(
            (m) =>
                m.userId === where?.userId &&
                (!where?.organizationId || m.organizationId === where.organizationId) &&
                (!where?.status || m.status === where.status)
        ) ?? null
    );
    prismaMock.organizationMembership.findMany.mockImplementation(async ({ where }: any) => {
        const rows = [...state.memberships.values()].filter(
            (m) =>
                (!where?.organizationId || m.organizationId === where.organizationId) &&
                (!where?.userId || m.userId === where.userId)
        );
        return where?.include?.user
            ? rows.map((m) => ({ ...m, user: state.users.get(m.userId) ?? null }))
            : rows;
    });
    prismaMock.organizationMembership.count.mockImplementation(async ({ where }: any) =>
        [...state.memberships.values()].filter(
            (m) =>
                (!where?.organizationId || m.organizationId === where.organizationId) &&
                (!where?.role || m.role === where.role) &&
                (!where?.status || m.status === where.status)
        ).length
    );
    prismaMock.organizationMembership.create.mockImplementation(async ({ data }: any) => {
        const m: Membership = { id: nextId('m'), status: MembershipStatus.APPROVED, ...data };
        state.memberships.set(membershipKey(m.userId, m.organizationId), m);
        return m;
    });
    // `acceptInvite` upserts on the compound key, so the mock has to behave like
    // one: create when absent, merge when present. Without the create branch the
    // first accept silently returns undefined.
    prismaMock.organizationMembership.upsert.mockImplementation(async ({ where, create, update }: any) => {
        const key = membershipKey(
            where?.userId_organizationId?.userId,
            where?.userId_organizationId?.organizationId
        );
        const existing = state.memberships.get(key);
        if (!existing) {
            const m: Membership = { id: nextId('m'), status: MembershipStatus.APPROVED, ...create };
            state.memberships.set(key, m);
            return m;
        }
        Object.assign(existing, update);
        return existing;
    });
    prismaMock.organizationMembership.update.mockImplementation(async ({ where, data }: any) => {
        const m = [...state.memberships.values()].find((x) => x.id === where?.id);
        if (!m) throw new Error('membership not found');
        Object.assign(m, data);
        return m;
    });
    prismaMock.organizationMembership.delete.mockImplementation(async ({ where }: any) => {
        const m = [...state.memberships.values()].find((x) => x.id === where?.id);
        if (m) state.memberships.delete(membershipKey(m.userId, m.organizationId));
        return m;
    });

    prismaMock.organizationInvite.findUnique.mockImplementation(async ({ where }: any) => {
        const invite = [...state.invites.values()].find((i) => i.token === where?.token);
        return invite ? { ...invite, organization: state.orgs.get(invite.organizationId) ?? null } : null;
    });
    prismaMock.organizationInvite.findFirst.mockImplementation(async ({ where }: any) =>
        [...state.invites.values()].find(
            (i) => i.id === where?.id && (!where?.organizationId || i.organizationId === where.organizationId)
        ) ?? null
    );
    prismaMock.organizationInvite.findMany.mockImplementation(async ({ where }: any) =>
        [...state.invites.values()].filter(
            (i) =>
                (!where?.organizationId || i.organizationId === where.organizationId) &&
                (where?.acceptedAt === null ? i.acceptedAt === null : true)
        )
    );
    prismaMock.organizationInvite.create.mockImplementation(async ({ data }: any) => {
        const invite: Invite = { id: nextId('i'), acceptedAt: null, ...data };
        state.invites.set(invite.id, invite);
        return invite;
    });
    prismaMock.organizationInvite.update.mockImplementation(async ({ where, data }: any) => {
        const i = state.invites.get(where?.id);
        if (!i) throw new Error('invite not found');
        Object.assign(i, data);
        return i;
    });
    prismaMock.organizationInvite.updateMany.mockImplementation(async ({ where, data }: any) => {
        let count = 0;
        for (const i of state.invites.values()) {
            const orgOk = !where?.organizationId || i.organizationId === where.organizationId;
            const emailOk = !where?.email || i.email === where.email;
            if (orgOk && emailOk) {
                Object.assign(i, data);
                count++;
            }
        }
        return { count };
    });
    prismaMock.organizationInvite.delete.mockImplementation(async ({ where }: any) => {
        const i = state.invites.get(where?.id);
        if (i) state.invites.delete(i.id);
        return i;
    });

    prismaMock.candidateInterest.findMany.mockImplementation(async ({ where }: any) => {
        if (where?.organizationId?.in) {
            return state.interests.filter((i) => where.organizationId.in.includes(i.organizationId));
        }
        return state.interests.filter((i) => i.organizationId === where?.organizationId);
    });
    prismaMock.candidateInterest.create.mockImplementation(async ({ data }: any) => {
        const row = { id: nextId('int'), ...data };
        state.interests.push(row);
        return row;
    });

    // The service uses the callback form; running it against the same mock keeps
    // writes inside this test's state instead of silently no-op'ing.
    prismaMock.$transaction.mockImplementation(async (arg: any) =>
        typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg)
    );
}

let app: express.Application;

beforeEach(async () => {
    state.users.clear();
    state.orgs.clear();
    state.memberships.clear();
    state.invites.clear();
    state.interests = [];
    state.seq = 0;
    vi.clearAllMocks();
    installMocks();

    const { default: organizationsRouter, inviteRouter } = await import('../routes/organizations');
    const { default: interestsRouter } = await import('../routes/candidateInterests');

    app = express();
    app.use(express.json());
    app.use('/api/organizations', inviteRouter as Router);
    app.use('/api/organizations', organizationsRouter as Router);
    app.use('/api/interests', interestsRouter as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({ error: { message: err.message } });
    });
});

const auth = (id: string) => ({ Authorization: `Bearer ${generateAccessToken(id)}` });

describe('organization membership service', () => {
    it('rejects granting OWNER through addMember', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addUser('u1', 'u1@example.com');

        await expect(
            OrganizationMembershipService.addMember({ organizationId: 'org-1', userId: 'u1', role: OrgRole.OWNER })
        ).rejects.toThrow(/cannot be granted/i);
    });

    it('rejects granting OWNER through createInvite', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        await expect(
            OrganizationMembershipService.createInvite({
                organizationId: 'org-1',
                email: 'a@example.com',
                role: OrgRole.OWNER,
                invitedByUserId: 'owner-1',
            })
        ).rejects.toThrow(/cannot be granted/i);
    });

    it('refuses to demote the last owner', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addMember('owner-1', 'org-1', OrgRole.OWNER);

        await expect(
            OrganizationMembershipService.updateMemberRole({
                organizationId: 'org-1',
                userId: 'owner-1',
                role: OrgRole.RECRUITER,
            })
        ).rejects.toThrow(/at least one owner/i);
    });

    it('refuses to remove the last owner', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addMember('owner-1', 'org-1', OrgRole.OWNER);

        await expect(
            OrganizationMembershipService.removeMember({ organizationId: 'org-1', userId: 'owner-1' })
        ).rejects.toThrow(/at least one owner/i);
    });

    it('allows demoting one of two owners', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addMember('owner-1', 'org-1', OrgRole.OWNER);
        addMember('owner-2', 'org-1', OrgRole.OWNER);

        const updated = await OrganizationMembershipService.updateMemberRole({
            organizationId: 'org-1',
            userId: 'owner-2',
            role: OrgRole.RECRUITER,
        });
        expect(updated.role).toBe(OrgRole.RECRUITER);
    });

    it('refuses to promote to OWNER through the role path', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addMember('rec-1', 'org-1', OrgRole.RECRUITER);

        await expect(
            OrganizationMembershipService.updateMemberRole({
                organizationId: 'org-1',
                userId: 'rec-1',
                role: OrgRole.OWNER,
            })
        ).rejects.toThrow(/ownership must be transferred/i);
    });

    it('refuses to add a non-active account', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addUser('u1', 'u1@example.com', { status: 'SUSPENDED' });

        await expect(
            OrganizationMembershipService.addMember({ organizationId: 'org-1', userId: 'u1', role: OrgRole.RECRUITER })
        ).rejects.toThrow(/active account/i);
    });

    it('rejects a website with a non-http protocol', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addMember('owner-1', 'org-1', OrgRole.OWNER);

        await expect(
            OrganizationMembershipService.updateOrganization({
                organizationId: 'org-1',
                actorUserId: 'owner-1',
                patch: { website: 'javascript:alert(1)' },
            })
        ).rejects.toThrow(/http or https/i);
    });
});

describe('invite lifecycle', () => {
    /** Shorthand for the common "create an invite for this address" setup. */
    const issueInvite = async (email: string, organizationId = 'org-1') => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        return OrganizationMembershipService.createInvite({
            organizationId,
            email,
            role: OrgRole.RECRUITER,
            invitedByUserId: 'owner-1',
        });
    };

    it('binds an invite to the invited address on accept', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addUser('attacker', 'attacker@example.com');
        const invite = await issueInvite('right@example.com');

        // A token forwarded to the wrong mailbox must not grant the seat.
        await expect(
            OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'attacker' })
        ).rejects.toThrow(/different email address/i);
    });

    it('rejects an expired invite', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addUser('u1', 'u1@example.com');
        const invite = await issueInvite('u1@example.com');
        state.invites.get(invite.id)!.expiresAt = new Date(Date.now() - 1000);

        await expect(
            OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'u1' })
        ).rejects.toThrow(/expired/i);
    });

    it('rejects a replayed invite', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addUser('u1', 'u1@example.com');
        const invite = await issueInvite('u1@example.com');

        await OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'u1' });
        await expect(
            OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'u1' })
        ).rejects.toThrow(/already been accepted/i);
    });

    it('creates a membership and stamps the invite together', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addUser('u1', 'u1@example.com');
        const invite = await issueInvite('u1@example.com');

        const result = await OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'u1' });

        expect(result.membership.status).toBe(MembershipStatus.APPROVED);
        expect(result.membership.role).toBe(OrgRole.RECRUITER);
        expect(state.invites.get(invite.id)!.acceptedAt).not.toBeNull();
    });

    it('matches the invited address case-insensitively', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        addUser('u1', 'U1@Example.COM');
        const invite = await issueInvite('  u1@example.com  ');

        const result = await OrganizationMembershipService.acceptInvite({ token: invite.token, userId: 'u1' });
        expect(result.membership.userId).toBe('u1');
    });

    it('supersedes a previous live invite for the same address', async () => {
        addOrg('org-1');
        const first = await issueInvite('u1@example.com');
        await issueInvite('u1@example.com');

        expect(state.invites.get(first.id)!.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('refuses to revoke an invite that was already accepted', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1');
        state.invites.set('inv-done', {
            id: 'inv-done',
            organizationId: 'org-1',
            email: 'u1@example.com',
            role: OrgRole.RECRUITER,
            invitedBy: 'owner-1',
            token: 'tok-done',
            expiresAt: new Date(Date.now() + 1000),
            acceptedAt: new Date(),
        });

        await expect(
            OrganizationMembershipService.revokeInvite({ organizationId: 'org-1', inviteId: 'inv-done' })
        ).rejects.toThrow(/already been accepted/i);
    });

    it('refuses to accept an invite into an inactive organization', async () => {
        const { OrganizationMembershipService } = await import('../infrastructure/services/organization.service');
        addOrg('org-1', { active: false });
        addUser('u1', 'u1@example.com');
        state.invites.set('inv-inactive', {
            id: 'inv-inactive',
            organizationId: 'org-1',
            email: 'u1@example.com',
            role: OrgRole.RECRUITER,
            invitedBy: 'owner-1',
            token: 'tok-inactive',
            expiresAt: new Date(Date.now() + 100_000),
            acceptedAt: null,
        });

        await expect(
            OrganizationMembershipService.acceptInvite({ token: 'tok-inactive', userId: 'u1' })
        ).rejects.toThrow(/not active/i);
    });
});

describe('organization routes (HTTP)', () => {
    it('returns 401 without a token', async () => {
        addOrg('org-1');
        const res = await request(app).get('/api/organizations/org-1/members');
        expect(res.status).toBe(401);
    });

    it('returns 403 for a non-member', async () => {
        addOrg('org-1');
        addUser('outsider', 'outsider@example.com');
        const res = await request(app).get('/api/organizations/org-1/members').set(auth('outsider'));
        expect(res.status).toBe(403);
    });

    it('returns 403 for a PENDING membership, not 200', async () => {
        addOrg('org-1');
        addUser('pending-user', 'pending@example.com');
        addMember('pending-user', 'org-1', OrgRole.OWNER, MembershipStatus.PENDING);

        const res = await request(app).get('/api/organizations/org-1/members').set(auth('pending-user'));
        expect(res.status).toBe(403);
    });

    it('returns 403 when the role is below what a write requires', async () => {
        addOrg('org-1');
        addUser('viewer-1', 'viewer@example.com');
        addMember('viewer-1', 'org-1', OrgRole.VIEWER);
        addUser('target', 'target@example.com');

        const res = await request(app)
            .post('/api/organizations/org-1/members')
            .set(auth('viewer-1'))
            .send({ userId: 'target', role: 'RECRUITER' });
        expect(res.status).toBe(403);
    });

    it('lets a VIEWER list members', async () => {
        addOrg('org-1');
        addUser('viewer-1', 'viewer@example.com');
        addMember('viewer-1', 'org-1', OrgRole.VIEWER);

        const res = await request(app).get('/api/organizations/org-1/members').set(auth('viewer-1'));
        expect(res.status).toBe(200);
    });

    it('rejects a malformed invite body with 400', async () => {
        addOrg('org-1');
        addUser('owner-1', 'owner@example.com');
        addMember('owner-1', 'org-1', OrgRole.OWNER);

        const res = await request(app)
            .post('/api/organizations/org-1/invite')
            .set(auth('owner-1'))
            .send({ email: 'not-an-email' });
        expect(res.status).toBe(400);
    });

    it('does not let `verified` be set through the profile update path', async () => {
        addOrg('org-1');
        addUser('owner-1', 'owner@example.com');
        addMember('owner-1', 'org-1', OrgRole.OWNER);

        const res = await request(app)
            .patch('/api/organizations/org-1')
            .set(auth('owner-1'))
            .send({ verified: true });

        // Zod strips the unknown key, leaving an empty patch, which is a 400.
        expect(res.status).toBe(400);
        expect(state.orgs.get('org-1')!.verified).toBe(false);
    });

    it('requires auth to preview an invite', async () => {
        const res = await request(app).get('/api/organizations/invites/some-token-value-here');
        expect(res.status).toBe(401);
    });
});

describe('candidate interest tenant isolation', () => {
    it('refuses to send an interest for an organization the caller does not belong to', async () => {
        addOrg('org-victim');
        addUser('attacker', 'attacker@example.com');
        addUser('candidate', 'candidate@example.com');

        const res = await request(app)
            .post('/api/interests/recruiter/interests')
            .set(auth('attacker'))
            .send({ organizationId: 'org-victim', candidateId: 'candidate' });

        expect(res.status).toBe(403);
        expect(state.interests).toHaveLength(0);
    });

    it('refuses to list another organizations interests', async () => {
        addOrg('org-mine');
        addOrg('org-theirs');
        addUser('rec-1', 'rec@example.com');
        addMember('rec-1', 'org-mine', OrgRole.RECRUITER);

        const res = await request(app)
            .get('/api/interests/recruiter/interests?organizationId=org-theirs')
            .set(auth('rec-1'));

        expect(res.status).toBe(403);
    });

    it('lists only the callers own organizations interests by default', async () => {
        addOrg('org-mine');
        addOrg('org-theirs');
        addUser('rec-1', 'rec@example.com');
        addMember('rec-1', 'org-mine', OrgRole.RECRUITER);

        state.interests.push({ id: 'a', organizationId: 'org-mine' }, { id: 'b', organizationId: 'org-theirs' });

        const res = await request(app).get('/api/interests/recruiter/interests').set(auth('rec-1'));

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].id).toBe('a');
    });

    it('returns an empty list for a user with no memberships instead of leaking', async () => {
        addOrg('org-theirs');
        addUser('nobody', 'nobody@example.com');
        state.interests.push({ id: 'b', organizationId: 'org-theirs' });

        const res = await request(app).get('/api/interests/recruiter/interests').set(auth('nobody'));

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
    });
});

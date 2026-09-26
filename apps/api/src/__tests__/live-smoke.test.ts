/**
 * LIVE smoke test: boots the real API on a non-default port against the
 * configured cloud Postgres and exercises the Phase 3/4 gates end to end.
 *
 * SAFETY:
 * - Runs ONLY when LIVE_SMOKE=1 (offline `pnpm test` skips this file).
 * - NEVER migrations/seeds. Only synthetic users `smoke-<ts>-…`, deleted after.
 * - No EmailService calls and no Firebase calls from the harness.
 *
 * LIVE-BLOCKED (recorded, not worked around): the cloud schema predates the
 * taxonomy migration (`type "public.OpportunityCategory[]" does not exist`,
 * PG 42704), so any write that touches the Profile table fails — including
 * the nested `profile.create` inside OTP/Google/handshake registration. The
 * harness therefore creates synthetic users directly and mints sessions with
 * the SAME helpers the routes use (generateAccessToken/generateRefreshToken
 * + refreshToken row); every gate below still runs for real over HTTP against
 * live Postgres. Profile-gated probes (visibility PRIVATE) stay
 * offline-verified until the schema is migrated.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const LIVE = process.env.LIVE_SMOKE === '1';
const PORT = 5057;
const BASE = `http://127.0.0.1:${PORT}`;
const STAMP = Date.now().toString(36);

const smokeEmail = (tag: string) => `smoke-${STAMP}-${tag}@example.com`;
const smokeUsername = (tag: string) => `smk${STAMP}${tag}`.toLowerCase().slice(0, 20);

async function waitForReady(base: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastStatus = 0;
    while (Date.now() < deadline) {
        try {
            const res = await request(base).get('/api/ready');
            lastStatus = res.status;
            if (res.status === 200 && (res.body as { ready?: boolean }).ready !== false) return;
        } catch {
            lastStatus = -1;
        }
        await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`API not ready on ${base} within ${timeoutMs}ms (last status ${lastStatus})`);
}

describe.skipIf(!LIVE)('live auth/RBAC smoke (PHASE 3/4 gates)', () => {
    const userIds: string[] = [];
    const cleanupErrors: string[] = [];

    let userA: { id: string; email: string; agent: request.SuperAgentTest; access: Record<string, string>; refreshCookie: string; accessCookie: string };
    let userB: { id: string; email: string; agent: request.SuperAgentTest; access: Record<string, string>; refreshCookie: string; accessCookie: string };

    async function register(tag: string) {
        const email = smokeEmail(tag);
        const prisma = (await import('../infrastructure/database/prisma')).default;
        const { generateAccessToken, generateRefreshToken } = await import('@fresherflow/utils');

        // Direct create WITHOUT a nested profile: the live schema cannot write
        // Profile rows (see header). All other columns are pre-taxonomy.
        const user = await prisma.user.create({
            data: {
                email,
                fullName: `Live Smoke ${tag}`,
                referralCode: `SMK${STAMP}${tag}`.toUpperCase().slice(0, 20),
            },
            select: { id: true },
        });
        userIds.push(user.id);

        // Session issuance identical to setAuthCookies in routes/auth.ts.
        const accessToken = generateAccessToken(user.id);
        const { token: refreshToken, hash: tokenHash } = generateRefreshToken(user.id);
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
        });

        const agent = request.agent(BASE);
        return {
            id: user.id,
            email,
            agent,
            access: { Authorization: `Bearer ${accessToken}` },
            refreshCookie: `refreshToken=${refreshToken}`,
            accessCookie: `accessToken=${accessToken}`,
        };
    }

    beforeAll(async () => {
        process.env.PORT = String(PORT);
        process.env.APP_MODE = 'all';
        process.env.REDIS_ENABLED = 'false';

        await import('../index');
        await waitForReady(BASE, 120000);

        userA = await register('a');
        userB = await register('b');
    }, 180000);

    afterAll(async () => {
        try {
            const prisma = (await import('../infrastructure/database/prisma')).default;
            for (const id of userIds) {
                try {
                    await prisma.userAccessRole.deleteMany({ where: { userId: id } });
                    await prisma.refreshToken.deleteMany({ where: { userId: id } });
                    await prisma.platformEvent.deleteMany({ where: { userId: id } });
                    await prisma.authenticator.deleteMany({ where: { userId: id } });
                    await prisma.webAuthnChallenge.deleteMany({ where: { userId: id } });
                    await prisma.user.delete({ where: { id } });
                } catch (error) {
                    cleanupErrors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            // Prove the cleanup: no synthetic rows remain.
            for (const id of userIds) {
                const leftover = await prisma.user.findUnique({ where: { id }, select: { id: true } });
                if (leftover) cleanupErrors.push(`${id}: user row still present after cleanup`);
                const tokens = await prisma.refreshToken.count({ where: { userId: id } });
                if (tokens > 0) cleanupErrors.push(`${id}: ${tokens} refresh tokens left behind`);
            }
            await prisma.$disconnect();
        } catch (error) {
            cleanupErrors.push(`cleanup harness: ${error instanceof Error ? error.message : String(error)}`);
        }
        expect(cleanupErrors).toEqual([]);
    }, 120000);

    it('authenticated request works; unauthenticated is 401', async () => {
        // LIVE-BLOCKED TRIPWIRE: /me includes the profile join, and the live
        // schema lacks Profile.institutionId, so /me 503s fail-closed today.
        // Either branch is asserted strictly: full 200-path after migration,
        // or 503 with a generic message and zero schema leakage until then.
        const me = await request(BASE).get('/api/auth/me').set('Cookie', userA.accessCookie);
        if (me.status === 200) {
            expect(me.body.user.id).toBe(userA.id);
            expect(me.body.profile).toBeNull();
        } else {
            expect(me.status).toBe(503);
            const body = JSON.stringify(me.body);
            expect(body).toMatch(/temporarily unavailable/i);
            expect(body).not.toMatch(/institutionId|prisma|stack|at /i);
        }

        const anon = await request(BASE).get('/api/auth/me');
        expect(anon.status).toBe(401);
    });

    it('username claim works and duplicate usernames are rejected', async () => {
        const username = smokeUsername('a');

        const claim = await request(BASE)
            .post('/api/username/claim')
            .set(userA.access)
            .send({ username });
        expect(claim.status).toBe(200);

        // A second user claiming the same handle gets 409, never a takeover.
        const duplicate = await request(BASE)
            .post('/api/username/claim')
            .set(userB.access)
            .send({ username });
        expect(duplicate.status).toBe(409);

        // The profile join is live-broken (see /me tripwire above): the public
        // lookup must fail closed, never leak, never confirm the account.
        const pub = await request(BASE).get(`/api/profile/public/${username}`);
        expect(pub.status).toBe(503);
        const body = JSON.stringify(pub.body);
        expect(body).not.toMatch(/institutionId|prisma|stack|dob|resume/i);
    });

    it('user cannot call an admin endpoint (403)', async () => {
        const { generateAccessToken } = await import('@fresherflow/utils');
        const res = await request(BASE)
            .get('/api/admin/reports')
            .set('Authorization', `Bearer ${generateAccessToken(userA.id)}`);
        expect(res.status).toBe(403);

        const anon = await request(BASE).get('/api/admin/reports');
        expect(anon.status).toBe(401);
    });

    it('moderator cannot perform an owner-only action (403)', async () => {
        const prisma = (await import('../infrastructure/database/prisma')).default;
        const { generateAccessToken } = await import('@fresherflow/utils');

        const role = await prisma.accessRole.findFirst({ where: { name: 'MODERATOR' }, select: { id: true } });
        expect(role?.id).toBeTruthy();
        await prisma.userAccessRole.create({
            data: { userId: userB.id, roleId: role!.id, assignedBy: 'live-smoke' },
        });

        const modAuth = { Authorization: `Bearer ${generateAccessToken(userB.id)}` };

        // Owner-only: granting the moderator role (moderator.manage).
        const grant = await request(BASE).post(`/api/admin/moderators/${userA.id}`).set(modAuth).send({});
        expect(grant.status).toBe(403);

        // Owner-only: suspending its own account (self-suspension guard).
        const selfSuspend = await request(BASE)
            .post(`/api/admin/users/${userB.id}/status`)
            .set(modAuth)
            .send({ status: 'SUSPENDED', reason: 'live smoke self-suspend probe' });
        expect(selfSuspend.status).toBe(403);
    });

    it('logout revokes the session; unknown refresh tokens are rejected', async () => {
        const prisma = (await import('../infrastructure/database/prisma')).default;
        const { generateRefreshToken } = await import('@fresherflow/utils');

        const logout = await request(BASE)
            .post('/api/auth/logout')
            .set('Cookie', userA.refreshCookie)
            .set('X-Requested-From', 'fresherflow-web')
            .send({});
        expect(logout.status).toBe(200);

        // Direct proof of revocation: the session row is stamped revokedAt.
        const row = await prisma.refreshToken.findFirst({ where: { userId: userA.id } });
        expect(row?.revokedAt).not.toBeNull();

        // NOTE: an immediate refresh with the just-revoked cookie returns 200
        // by design (60s sibling-tab rotation grace), so it is NOT asserted
        // here. Rejection is pinned with a well-signed but unknown token,
        // which takes the reuse/theft path to 401.
        const { token: forged } = generateRefreshToken('smoke-nonexistent-user');
        const rejected = await request(BASE)
            .post('/api/auth/refresh')
            .set('Cookie', `refreshToken=${forged}`)
            .set('X-Requested-From', 'fresherflow-web')
            .send({});
        expect(rejected.status).toBe(401);
    }, 60000);

    it('logout/all revokes every live session for the caller', async () => {
        const prisma = (await import('../infrastructure/database/prisma')).default;
        const { generateRefreshToken } = await import('@fresherflow/utils');

        const all = await request(BASE).post('/api/auth/logout/all').set(userB.access).send({});
        expect(all.status).toBe(200);

        const remaining = await prisma.refreshToken.count({
            where: { userId: userB.id, revokedAt: null },
        });
        expect(remaining).toBe(0);

        const { token: forged } = generateRefreshToken('smoke-nonexistent-user');
        const rejected = await request(BASE)
            .post('/api/auth/refresh')
            .set('Cookie', `refreshToken=${forged}`)
            .set('X-Requested-From', 'fresherflow-web')
            .send({});
        expect(rejected.status).toBe(401);
    }, 60000);
});

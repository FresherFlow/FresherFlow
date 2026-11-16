import prisma from '../../infrastructure/database/prisma';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { actorId, hasPermission, requireAdmin, requirePermission, requireStaff } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const userStatusSchema = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
    reason: z.string().trim().max(500).optional(),
});

/** Hard ceiling on how many rows a single list response may return. */
const MAX_LIST_LIMIT = 500;

/**
 * `Number(req.query.limit) || 1000` accepted anything the caller asked for,
 * including NaN-adjacent and multi-million values, so one request could pull a
 * large slice of the user table into memory. Bounded, and a non-numeric limit
 * falls back to the default instead of silently becoming 0 or Infinity.
 */
function parseLimit(raw: unknown, fallback: number): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

/**
 * The directory search term, or '' for no filter.
 *
 * The admin page used to load one page and filter it in the browser, so any
 * account outside that page could not be found at all — which made granting a
 * role to an existing user impossible. Search runs in the database instead,
 * across the same fields the UI lets you type.
 */
function parseSearch(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return raw.trim().slice(0, 120);
}

/**
 * Page size, not a reachability cap: the directory pages through every row.
 * 100 is the largest single response the grid offers.
 */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePageSize(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
    return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

/** 1-based page number; anything invalid is the first page. */
function parsePage(raw: unknown): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.floor(n);
}

function parseStatus(raw: unknown): 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | undefined {
    return raw === 'ACTIVE' || raw === 'SUSPENDED' || raw === 'DEACTIVATED' ? raw : undefined;
}

/** Staff means holding any AccessRole grant, matching the rest of the admin UI. */
function parseRole(raw: unknown): 'MODERATOR' | 'USER' | undefined {
    return raw === 'MODERATOR' || raw === 'USER' ? raw : undefined;
}

/**
 * GET /api/admin/users?q=&status=&role=&page=&pageSize=
 * One page of registered users, newest first, filtered in the database.
 */
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pageSize = parsePageSize(req.query.pageSize ?? req.query.limit);
        const page = parsePage(req.query.page);
        const q = parseSearch(req.query.q);
        const status = parseStatus(req.query.status);
        const role = parseRole(req.query.role);

        const where = {
            ...(status ? { status } : {}),
            ...(role === 'MODERATOR' ? { userRoles: { some: {} } } : {}),
            ...(role === 'USER' ? { userRoles: { none: {} } } : {}),
            ...(q
                ? {
                    OR: [
                        { email: { contains: q, mode: 'insensitive' as const } },
                        { username: { contains: q, mode: 'insensitive' as const } },
                        { fullName: { contains: q, mode: 'insensitive' as const } },
                        // Exact id, so pasting a user id always resolves.
                        { id: q },
                    ],
                }
                : {}),
        };

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    firebase_uid: true,
                    username: true,
                    fullName: true,
                    email: true,
                    role: true,
                    trustLevel: true,
                    status: true,
                    createdAt: true,
                }
            }),
            prisma.user.count({ where }),
        ]);

        res.setHeader('Cache-Control', 'private, no-store');
        res.json({
            users,
            total,
            page,
            pageSize,
            pageCount: Math.max(1, Math.ceil(total / pageSize)),
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/users/handles
 * List all claimed user handles.
 */
router.get('/handles', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Bounded: this previously had no `take` at all, so the response size was
        // the size of the table.
        const limit = parseLimit(req.query.limit, 200);
        const users = await prisma.user.findMany({
            where: {
                username: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                trustLevel: true,
                createdAt: true,
            }
        });

        const handles = users.map(user => ({
            id: user.id,
            username: user.username!,
            fullName: user.fullName || 'Anonymous User',
            email: user.email || 'N/A',
            source: user.email ? (user.email.endsWith('@gmail.com') ? 'Google' : 'OTP Auth') : 'GitHub',
            status: user.trustLevel === 'VERIFIED' ? 'Vetted' : user.trustLevel === 'NEW' ? 'Pending' : 'Active',
            claimedAt: user.createdAt.toISOString().split('T')[0]
        }));

        res.json({ handles });
    } catch (error) {
        next(error);
    }
});


/**
 * POST /api/admin/users/:userId/vet
 * Approve/vet a user's handle.
 */
router.post('/:userId/vet', requireAdmin, requirePermission('user.manage'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId as string;
        const user = await prisma.user.update({
            where: { id: userId },
            data: { trustLevel: 'VERIFIED' }
        });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/users/:userId/status
 * Suspend, deactivate, or reactivate an abusive user (V1 checklist F).
 * SUSPENDED/DEACTIVATED users are blocked in requireAuth/requireStaff with
 * 403; trustLevel BANNED is also enforced. Reactivation sets ACTIVE and
 * clears a legacy BANNED trust level back to VERIFIED.
 *
 * Moderators (user session + user.manage) may suspend/reactivate plain USER
 * accounts — the explicitly-required account action for spam fighting.
 * Privileged targets (role ADMIN, or anyone holding an AccessRole grant) and
 * self-suspension are admin-only: non-admin actors get 403.
 */
router.post('/:userId/status', requireStaff, requirePermission('user.manage'), adminRateLimit, validate(userStatusSchema), withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.userId as string;
        const { status, reason } = req.body as { status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'; reason?: string };

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, status: true, trustLevel: true, role: true },
        });
        if (!existing) throw new AppError('User not found', 404);

        const actor = actorId(req);
        const isAdminActor = Boolean(req.adminId);
        if (!isAdminActor) {
            if (!actor || actor === userId) {
                throw new AppError('Forbidden: Insufficient permissions', 403);
            }
            const privileged = existing.role === 'ADMIN'
                || (await hasPermission(userId, 'moderator.manage'))
                || (await hasPermission(userId, 'settings.manage'))
                || (await hasPermission(userId, 'audit.view'));
            if (privileged) {
                throw new AppError('Forbidden: Insufficient permissions', 403);
            }
        }

        const data: { status: typeof status; trustLevel?: 'BANNED' | 'VERIFIED' } = { status };
        if (status !== 'ACTIVE' && existing.trustLevel !== 'BANNED') {
            data.trustLevel = 'BANNED';
        } else if (status === 'ACTIVE' && existing.trustLevel === 'BANNED') {
            data.trustLevel = 'VERIFIED';
        }

        // Suspending a user and cutting their live sessions span two tables, so they
        // are one unit of work: if session revocation failed after the status
        // write, the account would stay suspended while still holding valid
        // refresh tokens. Doing both inside one transaction means the operator
        // either fully succeeds or fully fails.
        //
        // The last-active-admin guard lives in the same transaction so two
        // concurrent requests cannot both pass the check and lock everyone out.
        const user = await prisma.$transaction(async (tx) => {
            if (status !== 'ACTIVE' && existing.role === 'ADMIN') {
                const remainingActiveAdmins = await tx.user.count({
                    where: { role: 'ADMIN', status: 'ACTIVE', id: { not: userId } }
                });
                if (remainingActiveAdmins === 0) {
                    throw new AppError('Cannot suspend the last active administrator', 409);
                }
            }

            const updated = await tx.user.update({
                where: { id: userId },
                data,
                select: { id: true, status: true, trustLevel: true },
            });

            if (status !== 'ACTIVE') {
                // A suspended account must not keep live sessions.
                await tx.refreshToken.updateMany({
                    where: { userId, revokedAt: null },
                    data: { revokedAt: new Date() }
                });
            }

            return updated;
        });

        res.json({
            success: true,
            user,
            message: reason ?? `User ${status === 'ACTIVE' ? 'reactivated' : status.toLowerCase()}`,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/users/referrers
 * List top referrers and their conversion metrics.
 */
router.get('/referrers', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Bounded, and ordered so the list is stable across calls. Sorting by
        // signup count happens after the query, so the cap is applied to a
        // deterministic order rather than an arbitrary one.
        const limit = parseLimit(req.query.limit, 200);
        const referrers = await prisma.user.findMany({
            where: {
                referralCode: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            include: {
                _count: {
                    select: { referrals: true }
                }
            }
        });

        // Also unbounded: every REFERRAL_CLICK row was read on each request just
        // to count them in memory. Bounded to a recent window, which is all a
        // conversion metric needs.
        const clicksData = await prisma.platformEvent.findMany({
            where: {
                type: 'REFERRAL_CLICK',
                createdAt: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10_000,
            select: { metadata: true }
        });

        const clickCounts: Record<string, number> = {};
        for (const event of clicksData) {
            const meta = event.metadata as { referralCode?: unknown } | null;
            const code = meta?.referralCode ? String(meta.referralCode).toUpperCase() : null;
            if (code) {
                clickCounts[code] = (clickCounts[code] || 0) + 1;
            }
        }

        const referrerList = referrers.map(r => {
            const code = r.referralCode ? r.referralCode.toUpperCase() : '';
            const clickCount = clickCounts[code] || 0;
            const signupCount = r._count.referrals;
            const conversionRate = clickCount > 0 ? parseFloat(((signupCount / clickCount) * 100).toFixed(1)) : 0;
            return {
                id: r.id,
                fullName: r.fullName || 'Anonymous Referrer',
                code: r.referralCode || 'N/A',
                clicks: clickCount,
                signups: signupCount,
                conversionRate
            };
        });

        referrerList.sort((a, b) => b.signups - a.signups);

        res.json({ referrers: referrerList });
    } catch (error) {
        next(error);
    }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { actorId, requirePermission, requireStaff } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';
import {
    applyCommunityReport,
    moderatorReview,
    verifyLink,
    verifyOfficialSource,
    type CommunitySignal,
} from '../../application/trust/verification';

const router = Router();

// Moderator-readable queues; mutations stay least-privilege per route below.
router.use(requireStaff);

const trustVerdictSchema = z.object({
    verdict: z.enum(['UNVERIFIED', 'COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED']),
    note: z.string().trim().max(500).optional(),
});

const userTrustSchema = z.object({
    trustLevel: z.enum(['NEW', 'VERIFIED', 'CONTRIBUTOR']),
    note: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/trust/verification-queue
 * Unverified community event reports waiting for a human, oldest first.
 * Backed by OpportunityEvent(verification=UNVERIFIED) — the same index the
 * community submit path writes to.
 */
router.get(
    '/verification-queue',
    requirePermission('opportunity.review'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const where = { verification: 'UNVERIFIED' as const };
            const [events, total] = await Promise.all([
                prisma.opportunityEvent.findMany({
                    where,
                    orderBy: { createdAt: 'asc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true,
                        opportunityId: true,
                        eventType: true,
                        title: true,
                        eventDate: true,
                        authorRole: true,
                        createdAt: true,
                        opportunity: { select: { id: true, slug: true, title: true, company: true } },
                    },
                }),
                prisma.opportunityEvent.count({ where }),
            ]);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({ success: true, events, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/admin/trust/events/:eventId/verify|reject
 * Moderator decision on a community report. Writes verifier + timestamps so
 * "who decided, when" is always answerable.
 */
for (const action of ['verify', 'reject'] as const) {
    router.post(
        `/events/:eventId/${action}`,
        requirePermission('opportunity.review'),
        adminRateLimit,
        withAdminAudit('UPDATE'),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const eventId = String(req.params.eventId);
                const reviewer = actorId(req) ?? 'system';
                const current = await prisma.opportunityEvent.findUnique({
                    where: { id: eventId },
                    select: { id: true, verification: true },
                });
                if (!current) throw new AppError('Event not found', 404);
                if (current.verification !== 'UNVERIFIED') {
                    throw new AppError(`Event is already ${current.verification.toLowerCase()}`, 409);
                }
                const event = await prisma.opportunityEvent.update({
                    where: { id: eventId },
                    data: {
                        verification: action === 'verify' ? 'VERIFIED' : 'REJECTED',
                        verifiedByUserId: reviewer,
                        verifiedAt: new Date(),
                    },
                    select: { id: true, verification: true, verifiedAt: true },
                });
                return res.json({ success: true, event });
            } catch (error) {
                next(error);
            }
        }
    );
}

/**
 * GET /api/admin/trust/listings?trustLevel=FLAGGED
 * Listing trust triage queue. Defaults to the two states that need humans.
 */
router.get(
    '/listings',
    requirePermission('opportunity.review'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requested = typeof req.query.trustLevel === 'string' ? req.query.trustLevel.toUpperCase() : 'FLAGGED';
            const allowed = ['UNVERIFIED', 'COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED'] as const;
            const trustLevel = (allowed as readonly string[]).includes(requested) ? requested : 'FLAGGED';
            if (requested.length > 32) throw new AppError('trustLevel query too long', 400);
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where = { trustLevel: trustLevel as any, deletedAt: null };
            const [listings, total] = await Promise.all([
                prisma.opportunity.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, slug: true, title: true, company: true, trustLevel: true,
                        trustScore: true, linkHealth: true, lastVerifiedAt: true,
                        reviewedAt: true, updatedAt: true,
                    },
                }),
                prisma.opportunity.count({ where }),
            ]);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({ success: true, trustLevel, listings, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/admin/trust/listings/:id/review
 * The only path to VERIFIED / FLAGGED / REJECTED on a listing. Enforces the
 * listing state machine and never accepts a user trust level.
 */
router.post(
    '/listings/:id/review',
    requirePermission('opportunity.review'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = trustVerdictSchema.safeParse(req.body);
            if (!parsed.success) throw new AppError(parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
            const reviewer = actorId(req) ?? 'system';
            const result = await moderatorReview(String(req.params.id), parsed.data.verdict, reviewer);
            return res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof Error && (error.message.startsWith('Refusing') || error.message.startsWith('Cannot transition') || error.message.startsWith('Unknown listing'))) {
                return next(new AppError(error.message, 409));
            }
            if (error instanceof Error && error.message === 'Opportunity not found') {
                return next(new AppError('Opportunity not found', 404));
            }
            return next(error);
        }
    }
);

/** POST /api/admin/trust/listings/:id/verify-link — re-run the SSRF-guarded link check. */
router.post(
    '/listings/:id/verify-link',
    requirePermission('opportunity.review'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await verifyLink(String(req.params.id));
            return res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof Error && error.message === 'Opportunity not found') {
                return next(new AppError('Opportunity not found', 404));
            }
            return next(error);
        }
    }
);

/** POST /api/admin/trust/listings/:id/verify-official — ATS/official-domain check with timestamps. */
router.post(
    '/listings/:id/verify-official',
    requirePermission('opportunity.review'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await verifyOfficialSource(String(req.params.id));
            return res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof Error && error.message === 'Opportunity not found') {
                return next(new AppError('Opportunity not found', 404));
            }
            return next(error);
        }
    }
);

/**
 * POST /api/admin/trust/listings/:id/report
 * Record a broken-link / duplicate / suspicious / incorrect / closed signal.
 * Moves the listing to COMMUNITY_REPORTED for the moderator queue — never
 * straight to REJECTED, because a report is a claim.
 */
router.post(
    '/listings/:id/report',
    requirePermission('opportunity.review'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = z.object({
                signal: z.enum(['broken_link', 'duplicate', 'suspicious', 'incorrect', 'closed']),
            }).safeParse(req.body);
            if (!parsed.success) throw new AppError('signal must be broken_link, duplicate, suspicious, incorrect, or closed', 400);
            const result = await applyCommunityReport(String(req.params.id), parsed.data.signal as CommunitySignal);
            return res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof Error && error.message === 'Opportunity not found') {
                return next(new AppError('Opportunity not found', 404));
            }
            return next(error);
        }
    }
);

/**
 * GET /api/admin/trust/deleted — soft-delete recovery queue, newest first.
 * Restore itself stays on POST /api/admin/opportunities/:id/restore.
 */
router.get(
    '/deleted',
    requirePermission('opportunity.restore'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = Math.max(Number(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const where = { deletedAt: { not: null } };
            const [listings, total] = await Promise.all([
                prisma.opportunity.findMany({
                    where,
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    select: {
                        id: true, slug: true, title: true, company: true, status: true,
                        deletedAt: true, deletionReason: true, trustLevel: true, updatedAt: true,
                    },
                }),
                prisma.opportunity.count({ where }),
            ]);
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({ success: true, listings, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/admin/trust/users/:id/trust
 * Earned-ladder adjustment for people. Accepts only the earned rungs
 * (NEW / VERIFIED / CONTRIBUTOR) — MODERATOR stays hand-granted via the
 * moderators route and BANNED flows through the users status route, so a
 * scored action can never clobber a manual grant.
 */
router.post(
    '/users/:id/trust',
    requirePermission('user.manage'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = userTrustSchema.safeParse(req.body);
            if (!parsed.success) throw new AppError(parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '), 400);
            const existing = await prisma.user.findUnique({
                where: { id: String(req.params.id) },
                select: { id: true, trustLevel: true },
            });
            if (!existing) throw new AppError('User not found', 404);
            if (existing.trustLevel === 'BANNED' || existing.trustLevel === 'MODERATOR') {
                throw new AppError(`Cannot overwrite manual trust level ${existing.trustLevel} from the earned ladder`, 409);
            }
            const user = await prisma.user.update({
                where: { id: existing.id },
                data: { trustLevel: parsed.data.trustLevel as 'NEW' | 'VERIFIED' | 'CONTRIBUTOR' },
                select: { id: true, trustLevel: true },
            });
            return res.json({ success: true, user });
        } catch (error) {
            next(error);
        }
    }
);

export default router;

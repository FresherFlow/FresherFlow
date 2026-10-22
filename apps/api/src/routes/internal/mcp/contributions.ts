import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import prisma, { JobSubmissionStatus } from '../../../infrastructure/database/prisma';
import { validate } from '../../../middleware/validate';
import { getUserPermissions } from '../../../middleware/auth';
import { AppError } from '../../../middleware/errorHandler';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { approveSubmission, rejectOpportunity } from '../../../application/opportunity/moderation';
import { resolveMcpIdentity } from '../../../application/mcp/identity';
import { handleOpportunityPublished } from '../../../infrastructure/services/opportunity/publish.service';
import { adminCache } from '../../../infrastructure/cache/adminCache';
import { OpportunityStatus, type Opportunity } from '@fresherflow/types';

/**
 * Contributor and moderator tools for the FresherFlow MCP server.
 *
 * These are the two halves an AI client needs once a user has signed in:
 *
 *   Contributor — "what did I submit, and can I take it back?"
 *   Moderator   — "what is waiting for review, and approve or reject it."
 *
 * Both halves live here rather than on the admin router because the admin
 * router authenticates an admin session, and an MCP client holds an OAuth token
 * instead. Mounted behind `mcpSurfaceAuth` (src/index.ts), which turns that
 * token into `req.userId`, so every permission check below is the same RBAC the
 * web app uses — no parallel permission system to drift.
 *
 * The service key (pipeline scripts) reaches this router too, but it has no
 * user identity. Every route here requires one: a whoami, a submission history
 * and a moderation decision are things only a named person can have, and a
 * moderator action without an actor would write an untraceable audit entry.
 */

const router = Router();

const identityLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many MCP requests. Please slow down.',
    keyPrefix: 'mcp_identity',
});

const reviewLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many moderation actions. Please slow down.',
    keyPrefix: 'mcp_review',
});

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

/**
 * Gate for everything in this file: a real signed-in user is required.
 *
 * The message is written for the agent to relay, because the only way out is
 * for the human to authorize the connection in their AI client.
 */
function requireIdentity(): RequestHandler {
    // `asyncHandler` forwards a rejection to `next(error)` but does not continue
    // the chain on success, so each gate calls `next()` itself.
    return asyncHandler(async (req, _res, next) => {
        if (!req.userId) {
            throw new AppError(
                'This tool needs a signed-in FresherFlow account. Ask the user to connect FresherFlow '
                + 'again and sign in, then retry — submitting anonymously is what submit_opportunity does.',
                403,
            );
        }
        next();
    });
}

/** Identity plus the exact RBAC key the action needs. */
function requireUserPermission(key: string): RequestHandler {
    return asyncHandler(async (req, _res, next) => {
        const userId = req.userId;
        if (!userId) {
            throw new AppError(
                'This tool needs a signed-in FresherFlow account. Ask the user to connect FresherFlow '
                + 'again and sign in, then retry — submitting anonymously is what submit_opportunity does.',
                403,
            );
        }
        const granted = await getUserPermissions(userId);
        if (!granted.includes(key)) {
            throw new AppError(
                `Your FresherFlow account does not have the "${key}" permission, so this action is not allowed.`,
                403,
            );
        }
        next();
    });
}

/** Every state a contributor's own submission history can be in. */
const OWN_HISTORY_STATUSES = [
    JobSubmissionStatus.PENDING_REVIEW,
    JobSubmissionStatus.PUBLISHED,
    JobSubmissionStatus.REJECTED,
    JobSubmissionStatus.MERGED,
];

/** What a contributor sees about their own submission. */
const OWN_SUBMISSION_SELECT = {
    id: true,
    title: true,
    company: true,
    sourceUrl: true,
    applyUrl: true,
    status: true,
    createdAt: true,
    opportunityId: true,
    extractedData: true,
    opportunity: {
        select: { id: true, slug: true, status: true, deletedAt: true, deletionReason: true },
    },
} as const;

/**
 * GET /api/internal/mcp/whoami
 *
 * Who is this connection, and what is it allowed to do? The agent cannot know
 * otherwise: it holds an opaque token, so without this it would offer tools the
 * account cannot use and report "permission denied" as a mystery.
 */
router.get(
    '/whoami',
    identityLimiter,
    requireIdentity(),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.userId as string;
        const [user, identity] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true, username: true, fullName: true, email: true,
                    role: true, trustLevel: true, status: true,
                },
            }),
            resolveMcpIdentity(userId),
        ]);

        if (!user) throw new AppError('User not found', 404);

        return res.json({
            signedIn: true,
            // The one field an agent branches on. `moderator` publishes on submit
            // and may edit listings; `user` submits a draft and nothing else.
            mcpRole: identity.role,
            user,
            permissions: identity.permissions,
            // Pre-computed so the agent can pick a tool without interpreting
            // permission strings, and so a refusal is explained before it happens.
            // The keys describe behaviour, not permission names: `submitPublishes`
            // is what decides whether a submit goes live.
            capabilities: {
                browseJobs: true,
                submitOpportunity: true,
                submitPublishes: identity.capabilities.submitPublishes,
                viewOwnSubmissions: true,
                withdrawOwnSubmission: true,
                reviewSubmissions: identity.permissions.includes('opportunity.review'),
                approveSubmissions: identity.capabilities.canPublish,
                createFullListing: identity.capabilities.canWriteListings,
                editFullListing: identity.capabilities.canWriteListings,
            },
        });
    }),
);

/**
 * GET /api/internal/mcp/submissions
 *
 * The caller's own submission history. Filtered by `submittedById` from the
 * token — never by a value the caller supplied, so one user cannot enumerate
 * another's history by guessing an id.
 */
router.get(
    '/submissions',
    identityLimiter,
    requireIdentity(),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.userId as string;
        const requested = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
        const status = OWN_HISTORY_STATUSES.includes(requested as JobSubmissionStatus)
            ? (requested as JobSubmissionStatus)
            : undefined;

        const submissions = await prisma.jobSubmission.findMany({
            where: { submittedById: userId, ...(status ? { status } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: OWN_SUBMISSION_SELECT,
        });

        return res.json({ submissions, total: submissions.length, status: status ?? 'ALL' });
    }),
);

/**
 * POST /api/internal/mcp/submissions/:id/withdraw
 *
 * Take back a submission that is still awaiting review. Ownership is part of the
 * query, so another user's id is indistinguishable from a missing one.
 *
 * A submission that already went live is deliberately NOT withdrawable here:
 * unpublishing a public listing is `opportunity.archive`, a moderator action,
 * and letting a contributor do it through a chat client is a deletion tool
 * wearing a withdrawal label.
 */
router.post(
    '/submissions/:id/withdraw',
    identityLimiter,
    requireIdentity(),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.userId as string;
        const submissionId = String(req.params.id);

        const outcome = await prisma.$transaction(async (tx) => {
            const submission = await tx.jobSubmission.findUnique({
                where: { id: submissionId },
                select: { id: true, submittedById: true, status: true, opportunityId: true, extractedData: true },
            });

            if (!submission || submission.submittedById !== userId) {
                throw new AppError('Submission not found', 404);
            }
            if (submission.status !== JobSubmissionStatus.PENDING_REVIEW) {
                throw new AppError(
                    `Only a submission still awaiting review can be withdrawn; this one is ${submission.status}.`,
                    409,
                );
            }

            let listing: 'archived' | 'none' = 'none';

            if (submission.opportunityId) {
                const opportunity = await tx.opportunity.findUnique({
                    where: { id: submission.opportunityId },
                    select: { status: true },
                });

                if (opportunity?.status === OpportunityStatus.PUBLISHED) {
                    throw new AppError(
                        'This listing is already live on FresherFlow. Ask a moderator to remove it instead.',
                        409,
                    );
                }

                // Soft delete, matching how a moderator rejection is recorded, so
                // nothing is destroyed and the decision stays in the row.
                await tx.opportunity.update({
                    where: { id: submission.opportunityId },
                    data: {
                        status: OpportunityStatus.ARCHIVED,
                        deletedAt: new Date(),
                        deletionReason: 'Withdrawn by the contributor',
                    },
                });
                listing = 'archived';
            }

            const existing = (submission.extractedData ?? {}) as Record<string, unknown>;
            await tx.jobSubmission.update({
                where: { id: submissionId },
                data: {
                    status: JobSubmissionStatus.REJECTED,
                    // Merge, do not replace: rejection reasons live alongside the
                    // extracted payload, and overwriting would lose what was submitted.
                    extractedData: { ...existing, withdrawalReason: 'Withdrawn by the contributor' },
                },
            });

            return { listing };
        });

        adminCache.invalidateLists();
        return res.json({
            success: true,
            submissionId,
            listingState: outcome.listing,
            message: outcome.listing === 'archived'
                ? 'Submission withdrawn and its unpublished listing removed. Nothing is live on FresherFlow.'
                : 'Submission withdrawn. Nothing is live on FresherFlow.',
        });
    }),
);

// ─── Moderator tools ─────────────────────────────────────────────────────────

const rejectSchema = z.object({
    reason: z.string().trim().max(500).optional(),
});

/**
 * GET /api/internal/mcp/review-queue
 *
 * The same queue the admin UI shows: community shares (JobSubmission) awaiting
 * review. Defaults to PENDING_REVIEW; `?submissionStatus=` inspects history.
 */
router.get(
    '/review-queue',
    reviewLimiter,
    requireUserPermission('opportunity.review'),
    asyncHandler(async (req: Request, res: Response) => {
        const requested = typeof req.query.submissionStatus === 'string'
            ? req.query.submissionStatus.toUpperCase()
            : '';
        const status = OWN_HISTORY_STATUSES.includes(requested as JobSubmissionStatus)
            ? (requested as JobSubmissionStatus)
            : JobSubmissionStatus.PENDING_REVIEW;

        const submissions = await prisma.jobSubmission.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                title: true,
                company: true,
                sourceUrl: true,
                applyUrl: true,
                description: true,
                status: true,
                createdAt: true,
                extractedData: true,
                opportunityId: true,
                submittedBy: { select: { id: true, username: true, fullName: true } },
                opportunity: { select: { id: true, slug: true, title: true, status: true, deletedAt: true } },
            },
        });

        const pendingCount = await prisma.jobSubmission.count({
            where: { status: JobSubmissionStatus.PENDING_REVIEW },
        });

        return res.json({ submissions, pendingCount, status });
    }),
);

/**
 * POST /api/internal/mcp/review-queue/:id/approve
 *
 * Publishes the linked listing through the same service the admin UI calls, so
 * alerts, feed refresh and the submitter's notification all fire identically.
 * Requires `opportunity.publish` — the exact key the admin route requires.
 */
router.post(
    '/review-queue/:id/approve',
    reviewLimiter,
    requireUserPermission('opportunity.publish'),
    asyncHandler(async (req: Request, res: Response) => {
        const submission = await prisma.jobSubmission.findUnique({
            where: { id: String(req.params.id) },
            select: { id: true, opportunityId: true, status: true },
        });
        if (!submission) throw new AppError('Submission not found', 404);
        if (submission.status === JobSubmissionStatus.MERGED) {
            throw new AppError('Merged submissions are already attached to a live listing', 409);
        }
        if (!submission.opportunityId) {
            throw new AppError('Submission has no linked listing to approve', 409);
        }

        const published = await approveSubmission(submission.opportunityId, String(req.userId));

        // Side effects are best-effort: a feed refresh failure must not undo the
        // moderation decision that was just made. Same contract as the admin route.
        try {
            await handleOpportunityPublished(published as unknown as Opportunity, { isNew: true });
        } catch {
            // Retried by other flows.
        }

        adminCache.invalidateLists();
        return res.json({
            success: true,
            submissionId: submission.id,
            opportunityId: published.id,
            slug: published.slug,
            published: true,
            message: 'Submission approved. The listing is now live on FresherFlow.',
        });
    }),
);

/**
 * POST /api/internal/mcp/review-queue/:id/reject
 *
 * Rejects the linked listing and records the reason the contributor will see.
 */
router.post(
    '/review-queue/:id/reject',
    reviewLimiter,
    requireUserPermission('opportunity.review'),
    validate(rejectSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const submission = await prisma.jobSubmission.findUnique({
            where: { id: String(req.params.id) },
            select: { id: true, opportunityId: true },
        });
        if (!submission) throw new AppError('Submission not found', 404);
        if (!submission.opportunityId) {
            throw new AppError('Submission has no linked listing to reject', 409);
        }

        const reasonText = typeof req.body?.reason === 'string' && req.body.reason.trim()
            ? req.body.reason.trim()
            : 'Rejected by moderator';

        await rejectOpportunity(submission.opportunityId, String(req.userId), reasonText);

        adminCache.invalidateLists();
        return res.json({
            success: true,
            submissionId: submission.id,
            published: false,
            message: 'Submission rejected. The contributor sees the reason in their history.',
        });
    }),
);

export default router;

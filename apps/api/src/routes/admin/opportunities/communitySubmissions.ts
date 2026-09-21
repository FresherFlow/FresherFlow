import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import prisma, { JobSubmissionStatus as DbJobSubmissionStatus } from '../../../infrastructure/database/prisma';
import { validate } from '../../../middleware/validate';
import { AppError } from '../../../middleware/errorHandler';
import { approveSubmission, rejectOpportunity } from '../../../application/opportunity/moderation';
import { handleOpportunityPublished } from '../../../infrastructure/services/publish.service';
import { adminCache } from '../../../infrastructure/cache/adminCache';
import type { Opportunity } from '@fresherflow/types';

const router = Router();

const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };

const REVIEW_STATUSES: DbJobSubmissionStatus[] = [
    DbJobSubmissionStatus.PENDING_REVIEW,
    DbJobSubmissionStatus.PUBLISHED,
    DbJobSubmissionStatus.REJECTED,
    DbJobSubmissionStatus.MERGED,
];

const rejectSchema = z.object({
    reason: z.string().trim().max(500).optional(),
});

/**
 * GET /api/admin/opportunities/community-submissions
 * Community shares (JobSubmission) awaiting review, newest first. Defaults to
 * PENDING_REVIEW; pass ?status= to inspect the other states.
 */
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const requested = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
        const status = REVIEW_STATUSES.includes(requested as DbJobSubmissionStatus)
            ? (requested as DbJobSubmissionStatus)
            : DbJobSubmissionStatus.PENDING_REVIEW;

        const submissions = await prisma.jobSubmission.findMany({
            where: { status },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                sourceUrl: true,
                applyUrl: true,
                title: true,
                company: true,
                description: true,
                status: true,
                createdAt: true,
                extractedData: true,
                opportunityId: true,
                submittedBy: { select: { id: true, fullName: true, username: true, email: true } },
                opportunity: { select: { id: true, slug: true, title: true, company: true, status: true, deletedAt: true } },
            },
        });

        const pendingCount = await prisma.jobSubmission.count({
            where: { status: DbJobSubmissionStatus.PENDING_REVIEW },
        });

        return res.json({ submissions, pendingCount, status });
    })
);

/**
 * POST /api/admin/opportunities/community-submissions/:id/approve
 * Publishes the linked opportunity and marks the submission live.
 */
router.post(
    '/:id/approve',
    asyncHandler(async (req: Request, res: Response) => {
        const submission = await prisma.jobSubmission.findUnique({
            where: { id: String(req.params.id) },
            select: { id: true, opportunityId: true, status: true },
        });
        if (!submission) throw new AppError('Submission not found', 404);
        if (submission.status === 'MERGED') {
            throw new AppError('Merged submissions are already attached to a live listing', 409);
        }
        if (!submission.opportunityId) {
            throw new AppError('Submission has no linked listing to approve', 409);
        }

        const adminId = req.adminId ?? 'system';
        const published = await approveSubmission(submission.opportunityId, adminId);

        // Feed/side-effect refresh is best-effort: a failure here must not undo
        // the moderation decision the admin just made.
        try {
            await handleOpportunityPublished(published as unknown as Opportunity, { isNew: true });
        } catch {
            // Side effects (notifications, feed refresh) are retried by other flows.
        }

        adminCache.invalidateLists();
        return res.json({
            success: true,
            submissionId: submission.id,
            opportunityId: published.id,
            slug: published.slug,
        });
    })
);

/**
 * POST /api/admin/opportunities/community-submissions/:id/reject
 * Rejects the linked opportunity with a reason the contributor sees in history.
 */
router.post(
    '/:id/reject',
    validate(rejectSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const submission = await prisma.jobSubmission.findUnique({
            where: { id: String(req.params.id) },
            select: { id: true, opportunityId: true, status: true },
        });
        if (!submission) throw new AppError('Submission not found', 404);
        if (!submission.opportunityId) {
            throw new AppError('Submission has no linked listing to reject', 409);
        }

        const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
            ? req.body.reason.trim()
            : 'Rejected by moderator';
        const adminId = req.adminId ?? 'system';

        await rejectOpportunity(submission.opportunityId, adminId, reason);

        adminCache.invalidateLists();
        return res.json({ success: true, submissionId: submission.id });
    })
);

export default router;

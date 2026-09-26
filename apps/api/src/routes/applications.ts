/**
 * Phase 8 — user-side opportunity journey (funnel record API).
 *
 * - `UserAction` (routes/actions.ts) = lightweight signal only
 *   (VIEWED / SHARED / PLANNED / OA — one row per user+opportunity).
 * - `OpportunityApplication` (here + routes/pipeline/applications.ts) =
 *   the actual application/funnel record (stage, currentStage, outcome).
 *
 * This router is the candidate's own dashboard surface: apply, list mine,
 * summary, history, withdraw. Recruiter reads/moves live under /api/pipeline.
 * The actor is always `req.userId` from the verified token — never a body id.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createRateLimiter } from '../middleware/rateLimit';
import prisma from '../infrastructure/database/prisma';
import { PipelineService } from '../infrastructure/services/organization/pipeline.service';
import { OpportunityStatus } from '@fresherflow/database';
import { ApplicationStage } from '@fresherflow/database';

const router = Router();

const applicationWriteLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'rl:applications:user:write',
    message: 'Too many application requests. Please try again in a minute.',
});

const opportunityIdParam = z.string().trim().min(1).max(64);
const applicationIdParam = z.string().trim().min(1).max(64);

const listMineQuerySchema = z.object({
    stage: z.nativeEnum(ApplicationStage).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const withdrawSchema = z.object({
    outcome: z.string().trim().max(200).optional(),
});

/**
 * GET /api/applications/me
 * Paginated funnel records for the authenticated candidate, newest first.
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = listMineQuerySchema.parse(req.query);
        const result = await PipelineService.listApplicationsForUser(req.userId!, {
            stage: query.stage,
            page: query.page,
            limit: query.limit,
        });
        return res.json({
            success: true,
            data: result.items,
            pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages },
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * GET /api/applications/me/summary
 * Dashboard counts: total, by coarse stage, and terminal outcome buckets.
 */
router.get('/me/summary', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const summary = await PipelineService.getUserApplicationSummary(req.userId!);
        return res.json({ success: true, data: summary });
    } catch (error) {
        return next(error);
    }
});

/**
 * GET /api/applications/:id/history
 * Current record + APPLICATION_UPDATE trail (own application only).
 */
router.get('/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const applicationId = applicationIdParam.parse(req.params.id);
        const result = await PipelineService.getApplicationHistory(applicationId, req.userId!);
        return res.json({ success: true, data: result });
    } catch (error) {
        return next(error);
    }
});

/**
 * POST /api/applications/:opportunityId
 * Apply to a live listing. Idempotent (upsert): a retried tap returns the
 * existing funnel record, never a 409.
 */
router.post(
    '/:opportunityId',
    requireAuth,
    applicationWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const opportunityId = opportunityIdParam.parse(req.params.opportunityId);

            const opportunity = await prisma.opportunity.findFirst({
                where: { id: opportunityId, deletedAt: null },
                select: { id: true, status: true, expiresAt: true, expiredAt: true },
            });
            if (!opportunity) return next(new AppError('Opportunity not found', 404));
            if (opportunity.status !== OpportunityStatus.PUBLISHED) {
                return next(new AppError('Opportunity is no longer active', 410));
            }
            const now = new Date();
            if (opportunity.expiredAt || (opportunity.expiresAt && new Date(opportunity.expiresAt) <= now)) {
                return next(new AppError('Opportunity is no longer active', 410));
            }

            const application = await PipelineService.createApplication({
                userId: req.userId!,
                opportunityId,
            });
            return res.status(201).json({ success: true, data: application });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * PATCH /api/applications/:id/withdraw
 * Candidate self-withdrawal with an optional outcome note.
 */
router.patch(
    '/:id/withdraw',
    requireAuth,
    applicationWriteLimiter,
    validate(withdrawSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const applicationId = applicationIdParam.parse(req.params.id);
            const application = await PipelineService.withdrawApplication(
                applicationId,
                req.userId!,
                req.body?.outcome ?? null
            );
            return res.json({ success: true, data: application });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;

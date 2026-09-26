import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import { createRateLimiter } from '../../middleware/rateLimit';
import prisma from '../../infrastructure/database/prisma';
import { PipelineService } from '../../infrastructure/services/pipeline.service';
import { requireOrgMembership } from '../../infrastructure/services/orgAccess';
import {
    applicationIdParam,
    createApplicationSchema,
    listApplicationsQuerySchema,
    moveApplicationSchema,
    opportunityIdParam,
} from './_validators';

/**
 * Opportunity applications: the candidate-facing apply/withdraw surface and the
 * recruiter-facing pipeline reads and stage moves.
 *
 * Two audiences share these routes, so the authorization decision is the
 * interesting part and it is made here rather than in the service:
 *   - the applicant, for their OWN application (see / move / withdraw); and
 *   - a RECRUITER-or-above member of the organization that owns the opportunity.
 * A userId arriving in a body is never an actor: the actor is `req.userId` from
 * the verified access token, always.
 *
 * Bodies on the application-id routes are parsed inline AFTER the authorization
 * check (not via the `validate()` middleware) so a caller without permission
 * gets 403 regardless of how malformed their payload is, and a caller WITH
 * permission still gets a precise 400.
 */
const router = Router();

/** One budget for every application write; applying is an internet-reachable endpoint. */
const applicationWriteLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'rl:pipeline:application:write',
    message: 'Too many application requests. Please try again in a minute.',
});

/** Parses with a Zod schema and rethrows as the repo's 400 AppError. */
function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            const messages = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
            throw new AppError(messages.join(', '), 400);
        }
        throw error;
    }
}

/**
 * Loads the opportunity the URL names. 404 when it does not exist, so the
 * membership check below never runs against a non-existent tenant.
 */
async function loadOpportunity(opportunityId: string) {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, organizationId: true, pipelineId: true },
    });
    if (!opportunity) throw new AppError('Opportunity not found', 404);
    return opportunity;
}

/** Loads an application for the authorization decision, before any body parse. */
async function loadApplication(applicationId: string) {
    const application = await prisma.opportunityApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, userId: true, opportunityId: true },
    });
    if (!application) throw new AppError('Application not found', 404);
    return application;
}

/**
 * A candidate may act on their own application; anyone else needs org membership
 * at `minRole`. Returns 403 (not 404) on a genuine permission failure -- whether a
 * given application id exists is not another candidate's business.
 */
async function assertApplicationAccess(
    application: { userId: string; opportunityId: string },
    actorId: string,
    minRole: 'RECRUITER' | 'VIEWER'
) {
    if (application.userId === actorId) return;

    const { organizationId } = await loadOpportunity(application.opportunityId);
    if (!organizationId) {
        throw new AppError('You do not have access to this application', 403);
    }
    await requireOrgMembership(actorId, organizationId, { minRole });
}

/** Recruiter-or-owner gate for anything that lists other people's applications. */
async function assertOpportunityReader(opportunityId: string, actorId: string) {
    const { organizationId } = await loadOpportunity(opportunityId);
    if (!organizationId) {
        // A listing with no owning organization has no recruiter audience, so the
        // authenticated user is the only audience there is.
        return;
    }
    await requireOrgMembership(actorId, organizationId, { minRole: 'VIEWER' });
}

/* -------------------------------------------------------------------------- */
/* Opportunity-scoped reads                                                    */
/* -------------------------------------------------------------------------- */

/**
 * GET /opportunities/:opportunityId/applications
 * Paginated applicant list for the org's own recruiters. `?stageId=&kind=&page=&limit=`
 */
router.get(
    '/opportunities/:opportunityId/applications',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const opportunityId = parseOrThrow(opportunityIdParam, req.params.opportunityId);
            await assertOpportunityReader(opportunityId, req.userId!);

            const query = parseOrThrow(listApplicationsQuerySchema, req.query);
            const result = await PipelineService.listApplications(opportunityId, {
                stageId: query.stageId,
                kind: query.kind,
                page: query.page,
                limit: query.limit,
            });

            return res.json({
                success: true,
                data: result.items,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    pages: result.pages,
                },
            });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * GET /opportunities/:opportunityId/board
 * The stage columns. Same audience as the applicant list -- it is the same data,
 * so it must not be the easier door in.
 */
router.get(
    '/opportunities/:opportunityId/board',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const opportunityId = parseOrThrow(opportunityIdParam, req.params.opportunityId);
            await assertOpportunityReader(opportunityId, req.userId!);

            const board = await PipelineService.boardForOpportunity(opportunityId);
            return res.json({ success: true, data: board });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * POST /opportunities/:opportunityId/applications
 * Apply. The applicant is the token subject; a `userId` in the body is stripped
 * by the schema and never reaches the service. Idempotent (upsert), 201.
 */
router.post(
    '/opportunities/:opportunityId/applications',
    requireAuth,
    applicationWriteLimiter,
    validate(createApplicationSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const opportunityId = parseOrThrow(opportunityIdParam, req.params.opportunityId);
            await loadOpportunity(opportunityId);

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

/* -------------------------------------------------------------------------- */
/* Application-id routes                                                       */
/* -------------------------------------------------------------------------- */

/** GET /applications/:applicationId -- own application, or an org recruiter's. */
router.get(
    '/applications/:applicationId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const applicationId = parseOrThrow(applicationIdParam, req.params.applicationId);
            await assertApplicationAccess(await loadApplication(applicationId), req.userId!, 'VIEWER');

            const application = await PipelineService.getApplication(applicationId);
            if (!application) throw new AppError('Application not found', 404);
            return res.json({ success: true, data: application });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * PATCH /applications/:applicationId  (and its explicit `/move` alias)
 * Move to a stage. The applicant's own application is theirs to move -- that is
 * how a candidate steps out of a process they no longer want -- but they can
 * never move somebody else's. Recruiters need org membership.
 */
const moveHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const applicationId = parseOrThrow(applicationIdParam, req.params.applicationId);

        // Authorization BEFORE payload validation, so an unauthorized caller
        // cannot use a 400-vs-403 difference to probe the endpoint.
        await assertApplicationAccess(await loadApplication(applicationId), req.userId!, 'RECRUITER');

        const body = parseOrThrow(moveApplicationSchema, req.body);
        const application = await PipelineService.moveApplication(applicationId, {
            toStageId: body.stageId ?? body.toStageId!,
            stage: body.stage,
            outcome: body.outcome,
            outcomeData: body.outcomeData,
        });
        return res.json({ success: true, data: application });
    } catch (error) {
        return next(error);
    }
};

router.patch('/applications/:applicationId', requireAuth, applicationWriteLimiter, moveHandler);
router.patch(
    '/applications/:applicationId/move',
    requireAuth,
    applicationWriteLimiter,
    moveHandler
);

/**
 * DELETE /applications/:applicationId
 * Withdraw. A candidate may always remove their own application and only their
 * own; a recruiter needs org membership. There is no `force` here on purpose --
 * withdrawal is the candidate's own record, not a recruiter's cleanup.
 */
router.delete(
    '/applications/:applicationId',
    requireAuth,
    applicationWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const applicationId = parseOrThrow(applicationIdParam, req.params.applicationId);
            await assertApplicationAccess(await loadApplication(applicationId), req.userId!, 'RECRUITER');

            await PipelineService.removeApplication(applicationId);
            return res.json({ success: true, data: { id: applicationId, deleted: true } });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;
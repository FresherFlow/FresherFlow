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
    addStageSchema,
    createPipelineSchema,
    orgParamsSchema,
    pipelineIdParam,
    pipelineParamsSchema,
    reorderStagesSchema,
    stageIdParam,
    stageParamsSchema,
    updatePipelineSchema,
    updateStageSchema,
} from './_validators';

/**
 * Organization-scoped hiring pipelines and their stages.
 *
 * Mounted twice by ./index.ts — under `/organizations/:organizationId` and under
 * `/organizations/:organizationId/pipelines` — so both the short and the explicit
 * collection spelling resolve to the same handlers.
 *
 * Authorization model (all of it enforced here, never in the client):
 *   read pipeline / list / read stage -> org membership, minRole VIEWER
 *   every write                     -> org membership, minRole ADMIN
 * The platform template (organizationId === null) is readable by any org member
 * but immutable: the service answers 403 for writes, and we never treat a
 * template as owned by the org in the URL.
 */
/**
 * `mergeParams` is required, not cosmetic. In Express 5 a `use` mount consumes
 * the path params of its own pattern, and `./index` mounts this router under both
 * `/organizations/:organizationId` and `/organizations/:organizationId/pipelines`.
 * Without the flag the handlers see an empty `req.params`, so
 * `parseOrThrow(orgParamsSchema, ...)` rejects with 400 and the authorization
 * check below it is never reached.
 */
const router = Router({ mergeParams: true });

/** Shared budget for every pipeline/stage mutation on this router. */
const pipelineWriteLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'rl:pipeline:write',
    message: 'Too many pipeline changes. Please try again in a minute.',
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
 * Loads the pipeline named in the URL and proves it belongs to the org in the
 * path. Returns 404 — never 403 — on a cross-org id so the response cannot be
 * used to probe which pipeline ids exist in other tenants.
 */
async function loadOwnedPipeline(organizationId: string, pipelineId: string) {
    const pipeline = await PipelineService.getById(pipelineId);
    if (!pipeline) throw new AppError('Pipeline not found', 404);
    // A platform template has no owning org and stays globally readable; anything
    // else must match the org in the URL exactly.
    if (pipeline.organizationId !== null && pipeline.organizationId !== organizationId) {
        throw new AppError('Pipeline not found', 404);
    }
    return pipeline;
}

/**
 * Proves the stage row named in the URL belongs to the pipeline in the URL.
 * Without this, an org admin could edit another tenant's stage by pairing their
 * own pipelineId with a foreign stageId.
 */
async function loadStageInPipeline(pipelineId: string, stageId: string) {
    const stage = await prisma.recruitmentStage.findFirst({
        where: { id: stageId, pipelineId },
    });
    if (!stage) throw new AppError('Stage not found', 404);
    return stage;
}

/* -------------------------------------------------------------------------- */
/* Collection                                                                  */
/* -------------------------------------------------------------------------- */

/** GET /organizations/:organizationId — list the org's pipelines with stages. */
router.get(
    '/',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = parseOrThrow(orgParamsSchema, req.params);
            // requireAuth guarantees a subject; the non-null assertion is the
            // "we never take a userId from the body" rule made explicit.
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'VIEWER' });

            const pipelines = await PipelineService.listForOrganization(organizationId);
            return res.json({ success: true, data: pipelines });
        } catch (error) {
            return next(error);
        }
    }
);

/** POST /organizations/:organizationId — create a pipeline. 201. */
router.post(
    '/',
    requireAuth,
    pipelineWriteLimiter,
    validate(createPipelineSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId } = parseOrThrow(orgParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });

            const pipeline = await PipelineService.createForOrganization(
                organizationId,
                // `stages` must be forwarded: the service rejects a pipeline with
                // no stages, so dropping it here would make every create a 400.
                req.body as {
                    name: string;
                    isDefault?: boolean;
                    stages: Array<{ kind: never; name: string; expectedDays?: number | null }>;
                }
            );
            return res.status(201).json({ success: true, data: pipeline });
        } catch (error) {
            return next(error);
        }
    }
);
/* -------------------------------------------------------------------------- */
/* Single pipeline                                                             */
/* -------------------------------------------------------------------------- */

/** GET /organizations/:organizationId/:pipelineId */
router.get(
    '/:pipelineId',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'VIEWER' });

            const pipeline = await loadOwnedPipeline(organizationId, pipelineId);
            return res.json({ success: true, data: pipeline });
        } catch (error) {
            return next(error);
        }
    }
);

/** PATCH /organizations/:organizationId/:pipelineId */
router.patch(
    '/:pipelineId',
    requireAuth,
    pipelineWriteLimiter,
    validate(updatePipelineSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });

            // Ownership is proven before the service decides editability, so a
            // cross-org id is a 404 and a template is the service's 403.
            await loadOwnedPipeline(organizationId, pipelineId);

            const pipeline = await PipelineService.updatePipeline(
                pipelineId,
                req.body as { name?: string; isDefault?: boolean }
            );
            return res.json({ success: true, data: pipeline });
        } catch (error) {
            return next(error);
        }
    }
);

/** DELETE /organizations/:organizationId/:pipelineId */
router.delete(
    '/:pipelineId',
    requireAuth,
    pipelineWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });

            await loadOwnedPipeline(organizationId, pipelineId);
            await PipelineService.deletePipeline(pipelineId, { force: false });
            return res.json({ success: true, data: { id: pipelineId, deleted: true } });
        } catch (error) {
            return next(error);
        }
    }
);

/** POST /organizations/:organizationId/:pipelineId/default */
router.post(
    '/:pipelineId/default',
    requireAuth,
    pipelineWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });

            await loadOwnedPipeline(organizationId, pipelineId);
            const pipeline = await PipelineService.setDefaultPipeline(pipelineId);
            return res.json({ success: true, data: pipeline });
        } catch (error) {
            return next(error);
        }
    }
);

/* -------------------------------------------------------------------------- */
/* Stages                                                                      */
/* -------------------------------------------------------------------------- */

/** POST /organizations/:organizationId/:pipelineId/stages */
router.post(
    '/:pipelineId/stages',
    requireAuth,
    pipelineWriteLimiter,
    validate(addStageSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });
            await loadOwnedPipeline(organizationId, pipelineId);

            const stage = await PipelineService.addStage(
                pipelineId,
                req.body as { kind: never; name: string; expectedDays?: number | null }
            );
            return res.status(201).json({ success: true, data: stage });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * PUT /organizations/:organizationId/:pipelineId/stages/order
 * Registered before the `:stageId` route so "order" is never read as an id.
 */
router.put(
    '/:pipelineId/stages/order',
    requireAuth,
    pipelineWriteLimiter,
    validate(reorderStagesSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId } = parseOrThrow(pipelineParamsSchema, req.params);
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });
            await loadOwnedPipeline(organizationId, pipelineId);

            const stageIds = (req.body as { stageIds: string[] }).stageIds;
            const stages = await PipelineService.reorderStages(pipelineId, stageIds);
            return res.json({ success: true, data: stages });
        } catch (error) {
            return next(error);
        }
    }
);

/** PATCH /organizations/:organizationId/:pipelineId/stages/:stageId */
router.patch(
    '/:pipelineId/stages/:stageId',
    requireAuth,
    pipelineWriteLimiter,
    validate(updateStageSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId, stageId } = parseOrThrow(
                stageParamsSchema,
                req.params
            );
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });
            await loadOwnedPipeline(organizationId, pipelineId);
            await loadStageInPipeline(pipelineId, stageId);

            const stage = await PipelineService.updateStage(
                stageId,
                req.body as { kind?: never; name?: string; expectedDays?: number | null }
            );
            return res.json({ success: true, data: stage });
        } catch (error) {
            return next(error);
        }
    }
);

/** DELETE /organizations/:organizationId/:pipelineId/stages/:stageId */
router.delete(
    '/:pipelineId/stages/:stageId',
    requireAuth,
    pipelineWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { organizationId, pipelineId, stageId } = parseOrThrow(
                stageParamsSchema,
                req.params
            );
            await requireOrgMembership(req.userId!, organizationId, { minRole: 'ADMIN' });
            await loadOwnedPipeline(organizationId, pipelineId);
            await loadStageInPipeline(pipelineId, stageId);

            // force stays false: a stage that still holds candidates is a 409
            // rather than a silent data loss on a candidate's record.
            await PipelineService.deleteStage(stageId, { force: false });
            return res.json({ success: true, data: { id: stageId, deleted: true } });
        } catch (error) {
            return next(error);
        }
    }
);
/* -------------------------------------------------------------------------- */
/* Stage routes addressed by pipeline (no org in the path)                     */
/* -------------------------------------------------------------------------- */

/**
 * Loads a pipeline and authorizes against the organization that OWNS it, i.e.
 * the path is trusted only for the ids. `organizationId === null` is the shared
 * platform template: readable, but never editable, so every write is the same
 * 403 with the same text.
 */
async function authorizePipelineForWrite(pipelineId: string, actorId: string) {
    const pipeline = await PipelineService.getById(pipelineId);
    if (!pipeline) throw new AppError('Pipeline not found', 404);
    if (pipeline.organizationId === null) {
        throw new AppError('The platform default pipeline cannot be edited', 403);
    }
    await requireOrgMembership(actorId, pipeline.organizationId, { minRole: 'ADMIN' });
    return pipeline;
}

/**
 * Same rule for a stage addressed directly by id: load the stage, then its
 * pipeline, then authorize against that pipeline's organization. The stage id
 * alone is never trusted to imply a tenant.
 */
async function authorizeStageForWrite(stageId: string, actorId: string) {
    const stage = await prisma.recruitmentStage.findUnique({
        where: { id: stageId },
        select: { id: true, pipelineId: true },
    });
    if (!stage) throw new AppError('Stage not found', 404);
    await authorizePipelineForWrite(stage.pipelineId, actorId);
    return stage;
}

/**
 * Stage routes live on their own sub-router so ./index.ts can mount them at the
 * router root (`/stages/...`) without also exposing the org-scoped `/:pipelineId`
 * routes outside an organization path.
 */
const stageRoutes = Router();

/** POST /stages/pipelines/:pipelineId — add a stage. 201. */
stageRoutes.post(
    '/stages/pipelines/:pipelineId',
    requireAuth,
    pipelineWriteLimiter,
    validate(addStageSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pipelineId = parseOrThrow(pipelineIdParam, req.params.pipelineId);
            await authorizePipelineForWrite(pipelineId, req.userId!);

            const stage = await PipelineService.addStage(
                pipelineId,
                req.body as { kind: never; name: string; expectedDays?: number | null }
            );
            return res.status(201).json({ success: true, data: stage });
        } catch (error) {
            return next(error);
        }
    }
);

/** POST /stages/pipelines/:pipelineId/reorder — body `{ stageIds: string[] }`. */
stageRoutes.post(
    '/stages/pipelines/:pipelineId/reorder',
    requireAuth,
    pipelineWriteLimiter,
    validate(reorderStagesSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const pipelineId = parseOrThrow(pipelineIdParam, req.params.pipelineId);
            await authorizePipelineForWrite(pipelineId, req.userId!);

            const stages = await PipelineService.reorderStages(
                pipelineId,
                (req.body as { stageIds: string[] }).stageIds
            );
            return res.json({ success: true, data: stages });
        } catch (error) {
            return next(error);
        }
    }
);

/** PATCH /stages/:stageId */
stageRoutes.patch(
    '/stages/:stageId',
    requireAuth,
    pipelineWriteLimiter,
    validate(updateStageSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stageId = parseOrThrow(stageIdParam, req.params.stageId);
            await authorizeStageForWrite(stageId, req.userId!);

            const stage = await PipelineService.updateStage(
                stageId,
                req.body as { kind?: never; name?: string; expectedDays?: number | null }
            );
            return res.json({ success: true, data: stage });
        } catch (error) {
            return next(error);
        }
    }
);

/** DELETE /stages/:stageId — `force` stays false so a populated stage is a 409. */
stageRoutes.delete(
    '/stages/:stageId',
    requireAuth,
    pipelineWriteLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stageId = parseOrThrow(stageIdParam, req.params.stageId);
            await authorizeStageForWrite(stageId, req.userId!);

            await PipelineService.deleteStage(stageId, { force: false });
            return res.json({ success: true, data: { id: stageId, deleted: true } });
        } catch (error) {
            return next(error);
        }
    }
);

export { stageRoutes };
export default router;

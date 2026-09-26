import { z } from 'zod';
import { RecruitmentStageKind } from '@fresherflow/database';
import { ApplicationStage } from '@fresherflow/types';

/**
 * Zod schemas for the ATS / hiring pipeline surface.
 *
 * WHY colocated: the API guide keeps request schemas next to the route file that
 * uses them unless two routers need the same shape. Only the org pipeline router
 * consumes these, so they live in one private module rather than packages/types.
 *
 * WHY `validate()` is not used everywhere: that middleware only parses
 * `req.body` and runs before the handler, i.e. before the authorization check.
 * On the application routes the authz decision (own application vs. org
 * recruiter) must win over payload shape, so those parse inline AFTER authz.
 */

/** Path params. Ids are opaque (cuid/uuid) so we only bound length + charset. */
const idParam = z
    .string()
    .trim()
    .min(1)
    .max(64)
    // Reject anything that could smuggle a path segment or a query into an id.
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier');

export const pipelineIdParam = idParam;
export const organizationIdParam = idParam;
export const stageIdParam = idParam;
export const applicationIdParam = idParam;
export const opportunityIdParam = idParam;

export const pipelineParamsSchema = z.object({
    organizationId: organizationIdParam,
    pipelineId: pipelineIdParam,
});

export const orgParamsSchema = z.object({
    organizationId: organizationIdParam,
});

export const stageParamsSchema = z.object({
    organizationId: organizationIdParam,
    pipelineId: pipelineIdParam,
    stageId: stageIdParam,
});

/* -------------------------------------------------------------------------- */
/* Pipeline + stage payloads                                                  */
/* -------------------------------------------------------------------------- */

export const pipelineNameSchema = z.string().trim().min(1).max(120);
export const stageNameSchema = z.string().trim().min(1).max(80);
export const expectedDaysSchema = z.number().int().min(0).max(365).nullish();
export const stageKindSchema = z.nativeEnum(RecruitmentStageKind);
export const coarseStageSchema = z.nativeEnum(ApplicationStage);

export const stageInputSchema = z.object({
    kind: stageKindSchema,
    name: stageNameSchema,
    expectedDays: expectedDaysSchema,
});

export const createPipelineSchema = z.object({
    name: pipelineNameSchema,
    isDefault: z.boolean().optional(),
    // A pipeline with no stages can never move a candidate, so require one.
    stages: z.array(stageInputSchema).min(1, 'A pipeline needs at least one stage'),
});

export const updatePipelineSchema = z
    .object({
        name: pipelineNameSchema.optional(),
        isDefault: z.boolean().optional(),
    })
    .refine((v) => v.name !== undefined || v.isDefault !== undefined, {
        message: 'Nothing to update',
    });

export const addStageSchema = z.object({
    kind: stageKindSchema,
    name: stageNameSchema,
    expectedDays: expectedDaysSchema,
});

export const updateStageSchema = z
    .object({
        kind: stageKindSchema.optional(),
        name: stageNameSchema.optional(),
        expectedDays: expectedDaysSchema,
    })
    .refine((v) => v.kind !== undefined || v.name !== undefined || v.expectedDays !== undefined, {
        message: 'Nothing to update',
    });

/**
 * Reorder body. The spec field is `stageIds`; `orderedStageIds` is accepted as an
 * alias so both spellings used by the clients resolve to the same call.
 */
export const reorderStagesSchema = z
    .object({
        stageIds: z.array(z.string().trim().min(1)).min(1),
        orderedStageIds: z.array(z.string().trim().min(1)).min(1).optional(),
    })
    .transform((v) => v.stageIds ?? v.orderedStageIds!);

/* -------------------------------------------------------------------------- */
/* Application payloads                                                       */
/* -------------------------------------------------------------------------- */

export const outcomeSchema = z.string().trim().max(200).nullish();
export const outcomeDataSchema = z.record(z.string(), z.unknown()).nullish();

/**
 * Applying is candidate self-service. Every field is optional: a bare `{}` is a
 * valid apply, and `userId` is deliberately NOT part of this schema — the acting
 * user always comes from the access token, so a spoofed body field is stripped
 * rather than trusted.
 */
export const createApplicationSchema = z.object({
    note: z.string().trim().max(2000).nullish(),
});

/**
 * `stageId` is the client-facing name for the target stage; the service calls it
 * `toStageId`. `toStageId` is accepted as an alias so either spelling works.
 * `stage` (the coarse ApplicationStage) is optional and advisory — the service
 * derives the coarse stage from the target stage's kind, never from the client.
 */
export const moveApplicationSchema = z
    .object({
        stageId: idParam.optional(),
        toStageId: idParam.optional(),
        stage: coarseStageSchema.optional(),
        outcome: outcomeSchema,
        outcomeData: outcomeDataSchema,
    })
    .refine((v) => v.stageId !== undefined || v.toStageId !== undefined, {
        message: 'A target stage is required',
    });

export const listApplicationsQuerySchema = z.object({
    stageId: idParam.optional(),
    kind: stageKindSchema.optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

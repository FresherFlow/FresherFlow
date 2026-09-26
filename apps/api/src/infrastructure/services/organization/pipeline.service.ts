import prisma from '../../database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import {
    ApplicationStage,
    RecruitmentStageKind,
    type HiringPipeline,
    type OpportunityApplication,
    type RecruitmentStage,
    type User,
} from '@fresherflow/database';
import type { Prisma } from '@prisma/client';

const MAX_NAME_LENGTH = 120;
const DEFAULT_APPLICATION_LIMIT = 20;
const MAX_APPLICATION_LIMIT = 100;

export interface PipelineWithStages extends HiringPipeline {
    stages: RecruitmentStage[];
}

export type ApplicationUser = Pick<User, 'id' | 'fullName' | 'username' | 'email'>;

export interface OpportunityApplicationWithUser extends OpportunityApplication {
    user: ApplicationUser;
    currentStage: RecruitmentStage | null;
}

export interface BoardColumn {
    stage: RecruitmentStage;
    applications: OpportunityApplicationWithUser[];
}

export interface PipelineBoard {
    pipeline: PipelineWithStages;
    columns: BoardColumn[];
}

export interface PaginatedApplications {
    items: OpportunityApplicationWithUser[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface ListApplicationsOptions {
    stageId?: string;
    kind?: RecruitmentStageKind;
    page?: number;
    limit?: number;
}

/** Stages always come back in pipeline order â€” the order IS the process. */
const withStages = {
    stages: { orderBy: { order: 'asc' as const } },
} satisfies Prisma.HiringPipelineInclude;

const applicationInclude = {
    user: { select: { id: true, fullName: true, username: true, email: true } },
    currentStage: true,
} satisfies Prisma.OpportunityApplicationInclude;

/**
 * Coarse funnel stage per stage kind.
 *
 * WHY a map and not a value the client picks: the employer defines what their
 * rounds mean, and the coarse `stage` is what reporting filters on. Anything
 * with no natural coarse counterpart (screening, training, onboarding, a custom
 * step) stays IN_REVIEW rather than being invented.
 */
const STAGE_KIND_TO_APPLICATION_STAGE: Partial<Record<RecruitmentStageKind, ApplicationStage>> = {
    OFFER: ApplicationStage.OFFERED,
    ASSESSMENT: ApplicationStage.ASSESSMENT,
    CASE_STUDY: ApplicationStage.ASSESSMENT,
    GROUP_EXERCISE: ApplicationStage.ASSESSMENT,
    INTERVIEW: ApplicationStage.INTERVIEW,
};

export function deriveApplicationStage(kind: RecruitmentStageKind | null | undefined): ApplicationStage {
    if (!kind) return ApplicationStage.IN_REVIEW;
    return STAGE_KIND_TO_APPLICATION_STAGE[kind] ?? ApplicationStage.IN_REVIEW;
}

/** Clamps a caller-supplied page size into 1..100 so one request cannot ask for the table. */
function clampLimit(limit?: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) return DEFAULT_APPLICATION_LIMIT;
    const rounded = Math.floor(limit);
    if (rounded < 1) return 1;
    if (rounded > MAX_APPLICATION_LIMIT) return MAX_APPLICATION_LIMIT;
    return rounded;
}

function normalizePage(page?: number): number {
    if (typeof page !== 'number' || !Number.isFinite(page)) return 1;
    const rounded = Math.floor(page);
    return rounded < 1 ? 1 : rounded;
}

/** expectedDays is advisory metadata; a nonsensical value is dropped, not stored. */
function normalizeExpectedDays(days?: number | null): number | null {
    if (days === undefined || days === null) return null;
    if (typeof days !== 'number' || !Number.isFinite(days)) return null;
    const rounded = Math.floor(days);
    return rounded < 0 ? null : rounded;
}

function normalizePipelineName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new AppError('Pipeline name is required', 400);
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw new AppError(`Pipeline name must be ${MAX_NAME_LENGTH} characters or fewer`, 400);
    }
    return trimmed;
}

function normalizeStageName(name?: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) throw new AppError('Every stage needs a name', 400);
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw new AppError(`Stage name must be ${MAX_NAME_LENGTH} characters or fewer`, 400);
    }
    return trimmed;
}

export class PipelineService {
    static readonly DEFAULT_PIPELINE_NAME = 'Standard Hiring Process';

    /** The funnel every employer starts from; expectedDays is guidance, not a promise. */
    static readonly DEFAULT_STAGES: ReadonlyArray<{
        kind: RecruitmentStageKind;
        name: string;
        expectedDays: number | null;
    }> = [
        { kind: RecruitmentStageKind.SCREENING, name: 'Applied', expectedDays: 5 },
        { kind: RecruitmentStageKind.ASSESSMENT, name: 'Assessment', expectedDays: 7 },
        { kind: RecruitmentStageKind.INTERVIEW, name: 'Interview', expectedDays: 7 },
        { kind: RecruitmentStageKind.OFFER, name: 'Offer', expectedDays: 5 },
        { kind: RecruitmentStageKind.ONBOARDING, name: 'Onboarding', expectedDays: 10 },
    ];

    /**
     * The platform template, created on first use.
     *
     * Idempotent by design: every opportunity without its own pipeline reads
     * this, so a missing template must never turn a public listing into a 500.
     * A concurrent creator can win the race, so a lost race is re-read rather
     * than surfaced as an error.
     */
    static async ensurePlatformTemplate(): Promise<PipelineWithStages> {
        const existing = await this.getPlatformTemplate();
        if (existing) return existing;

        try {
            const created = await prisma.$transaction(async (tx) => {
                const pipeline = await tx.hiringPipeline.create({
                    data: {
                        name: this.DEFAULT_PIPELINE_NAME,
                        isTemplate: true,
                        isDefault: false,
                        organizationId: null,
                    },
                });

                // The template is useless without its funnel: every listing that
                // has no pipeline renders this board, so an empty stage list would
                // give all of them a blank board. `order` is 1-based because
                // @@unique([pipelineId, order]) and every board consumer assume
                // 1-based positions.
                await tx.recruitmentStage.createMany({
                    data: this.DEFAULT_STAGES.map((stage, index) => ({
                        pipelineId: pipeline.id,
                        kind: stage.kind,
                        name: stage.name,
                        expectedDays: stage.expectedDays,
                        order: index + 1,
                    })),
                });

                return pipeline;
            });

            return (await this.getById(created.id)) as PipelineWithStages;
        } catch (error) {
            // Another request created it between our read and our write.
            const raced = await this.getPlatformTemplate();
            if (raced) return raced;
            throw error;
        }
    }

    static async getPlatformTemplate(): Promise<PipelineWithStages | null> {
        const template = await prisma.hiringPipeline.findFirst({
            where: { isTemplate: true },
            include: withStages,
        });
        return (template as PipelineWithStages | null) ?? null;
    }

    static async listForOrganization(organizationId: string): Promise<PipelineWithStages[]> {
        const pipelines = await prisma.hiringPipeline.findMany({
            where: { organizationId },
            include: withStages,
            orderBy: { createdAt: 'asc' },
        });
        return pipelines as PipelineWithStages[];
    }

    static async getById(pipelineId: string): Promise<PipelineWithStages | null> {
        const pipeline = await prisma.hiringPipeline.findUnique({
            where: { id: pipelineId },
            include: withStages,
        });
        return (pipeline as PipelineWithStages | null) ?? null;
    }

    /**
     * The pipeline a listing's candidates move through. A listing with no
     * pipeline of its own is displayed against the platform template.
     */
    static async getForOpportunity(opportunityId: string): Promise<PipelineWithStages | null> {
        const opportunity = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            select: { pipelineId: true },
        });
        if (!opportunity) return null;
        if (!opportunity.pipelineId) return this.ensurePlatformTemplate();

        return this.getById(opportunity.pipelineId);
    }

    /**
     * Creating the org's default inside one transaction so two recruiters
     * clicking "set as default" at the same time cannot leave two defaults.
     */
    static async createForOrganization(
        organizationId: string,
        data: {
            name: string;
            isDefault?: boolean;
            // Optional in the type because a validated request body is cast at the
            // route; the runtime check below is the real gate.
            stages?: Array<{ kind: RecruitmentStageKind; name: string; expectedDays?: number | null }>;
        }
    ): Promise<PipelineWithStages> {
        const name = normalizePipelineName(data.name);
        if (!Array.isArray(data.stages) || data.stages.length === 0) {
            throw new AppError('A pipeline needs at least one stage', 400);
        }
        const stages = data.stages.map((stage) => ({
            kind: stage.kind,
            name: normalizeStageName(stage.name),
            expectedDays: normalizeExpectedDays(stage.expectedDays),
        }));

        const pipelineId = await prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                await tx.hiringPipeline.updateMany({
                    where: { organizationId, isDefault: true },
                    data: { isDefault: false },
                });
            }
            const created = await tx.hiringPipeline.create({
                data: {
                    organizationId,
                    name,
                    isDefault: Boolean(data.isDefault),
                    isTemplate: false,
                    stages: {
                        // order starts at 1: the @@unique([pipelineId, order]) key
                        // and every consumer assume 1-based positions.
                        create: stages.map((stage, index) => ({ ...stage, order: index + 1 })),
                    },
                },
            });
            return created.id;
        });

        const pipeline = await this.getById(pipelineId);
        if (!pipeline) throw new AppError('Pipeline not found', 404);
        return pipeline;
    }

    static async updatePipeline(
        pipelineId: string,
        data: { name?: string; isDefault?: boolean }
    ): Promise<PipelineWithStages> {
        const existing = await prisma.hiringPipeline.findUnique({ where: { id: pipelineId } });
        if (!existing) throw new AppError('Pipeline not found', 404);
        if (existing.isTemplate) {
            throw new AppError('The platform default pipeline cannot be edited', 403);
        }

        const patch: Prisma.HiringPipelineUpdateInput = {};
        if (data.name !== undefined) patch.name = normalizePipelineName(data.name);
        if (data.isDefault !== undefined) patch.isDefault = data.isDefault;

        await prisma.$transaction(async (tx) => {
            if (data.isDefault === true && existing.organizationId) {
                await tx.hiringPipeline.updateMany({
                    where: {
                        organizationId: existing.organizationId,
                        isDefault: true,
                        id: { not: pipelineId },
                    },
                    data: { isDefault: false },
                });
            }
            await tx.hiringPipeline.update({ where: { id: pipelineId }, data: patch });
        });

        const pipeline = await this.getById(pipelineId);
        if (!pipeline) throw new AppError('Pipeline not found', 404);
        return pipeline;
    }

    /**
     * Opportunities are deliberately left alive: Opportunity.pipelineId is
     * onDelete SetNull, so deleting a pipeline degrades a listing to the platform
     * template instead of taking live applications down with it.
     */
    static async deletePipeline(pipelineId: string, _opts: { force?: boolean } = {}): Promise<void> {
        const existing = await prisma.hiringPipeline.findUnique({ where: { id: pipelineId } });
        if (!existing) throw new AppError('Pipeline not found', 404);
        if (existing.isTemplate) {
            throw new AppError('The platform default pipeline cannot be deleted', 403);
        }
        await prisma.hiringPipeline.delete({ where: { id: pipelineId } });
    }

    static async setDefaultPipeline(pipelineId: string): Promise<PipelineWithStages> {
        return this.updatePipeline(pipelineId, { isDefault: true });
    }

    static async addStage(
        pipelineId: string,
        data: { kind: RecruitmentStageKind; name: string; expectedDays?: number | null }
    ): Promise<PipelineWithStages> {
        const pipeline = await prisma.hiringPipeline.findUnique({
            where: { id: pipelineId },
            include: withStages,
        });
        if (!pipeline) throw new AppError('Pipeline not found', 404);
        if (pipeline.isTemplate) {
            throw new AppError('The platform default pipeline cannot be edited', 403);
        }

        const name = normalizeStageName(data.name);
        const last = pipeline.stages[pipeline.stages.length - 1];
        await prisma.recruitmentStage.create({
            data: {
                pipelineId,
                kind: data.kind,
                name,
                // Append to the end: an existing candidate's position never moves
                // because someone added a step.
                order: (last?.order ?? 0) + 1,
                expectedDays: normalizeExpectedDays(data.expectedDays),
            },
        });

        const updated = await this.getById(pipelineId);
        if (!updated) throw new AppError('Pipeline not found', 404);
        return updated;
    }

    static async updateStage(
        stageId: string,
        data: { name?: string; kind?: RecruitmentStageKind; expectedDays?: number | null }
    ): Promise<RecruitmentStage> {
        const stage = await prisma.recruitmentStage.findUnique({ where: { id: stageId } });
        if (!stage) throw new AppError('Stage not found', 404);

        const patch: Prisma.RecruitmentStageUpdateInput = {};
        if (data.name !== undefined) patch.name = normalizeStageName(data.name);
        if (data.kind !== undefined) patch.kind = data.kind;
        if (data.expectedDays !== undefined) {
            patch.expectedDays = normalizeExpectedDays(data.expectedDays);
        }

        return prisma.recruitmentStage.update({ where: { id: stageId }, data: patch });
    }

    /**
     * A stage that still holds candidates is a 409, not a silent data loss on
     * someone's application. A caller that means it opts in with force.
     */
    static async deleteStage(stageId: string, opts: { force?: boolean } = {}): Promise<void> {
        const stage = await prisma.recruitmentStage.findUnique({ where: { id: stageId } });
        if (!stage) throw new AppError('Stage not found', 404);

        if (!opts.force) {
            const held = await prisma.opportunityApplication.count({
                where: { currentStageId: stageId },
            });
            if (held > 0) {
                throw new AppError('Cannot delete a stage that has candidates', 409);
            }
        }

        await prisma.$transaction(async (tx) => {
            // Candidates that survive a forced delete must not keep pointing at a
            // row that no longer exists, nor keep a stale "entered stage" date.
            await tx.opportunityApplication.updateMany({
                where: { currentStageId: stageId },
                data: { currentStageId: null, currentStageKind: null, stageEnteredAt: null },
            });
            await tx.recruitmentStage.delete({ where: { id: stageId } });
        });
    }

    /**
     * Rewrites stage order to 1..N in the submitted sequence.
     *
     * WHY the exact-set check: a partial list would silently drop the omitted
     * stages off the end of the process, and a foreign stage id would reorder
     * another tenant's pipeline. Both are rejected before any write.
     */
    static async reorderStages(pipelineId: string, stageIds: string[]): Promise<RecruitmentStage[]> {
        const pipeline = await prisma.hiringPipeline.findUnique({
            where: { id: pipelineId },
            select: { id: true, isTemplate: true },
        });
        if (!pipeline) throw new AppError('Pipeline not found', 404);
        if (pipeline.isTemplate) {
            throw new AppError('The platform default pipeline cannot be edited', 403);
        }
        if (!Array.isArray(stageIds) || stageIds.length === 0) {
            throw new AppError('Stage list must contain every stage in this pipeline exactly once', 400);
        }

        // The owned-stage list is read with its own query rather than an
        // `include`. Validation must not depend on a relation being hydrated:
        // if `include` ever comes back empty the exact-set check would compare
        // against zero stages and reject every reorder, including a valid one.
        const existing = await prisma.recruitmentStage.findMany({
            where: { pipelineId },
            select: { id: true },
        });
        const owned = new Set(existing.map((s) => s.id));
        const exact =
            stageIds.length === owned.size && new Set(stageIds).size === owned.size && stageIds.every((id) => owned.has(id));
        if (!exact) {
            throw new AppError('Stage list must contain every stage in this pipeline exactly once', 400);
        }

        // The full stage rows are needed for the parking pass, which offsets each
        // stage's CURRENT order rather than assuming the submitted sequence.
        const current = await prisma.recruitmentStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' },
        });

        await prisma.$transaction(async (tx) => {
            // Two passes: @@unique([pipelineId, order]) means writing 1..N
            // directly collides with the orders still held by the other stages.
            // Parking every stage above the real range first makes the rewrite
            // collision free, still in one transaction.
            for (const stage of current) {
                await tx.recruitmentStage.update({
                    where: { id: stage.id },
                    data: { order: stage.order + 1000 },
                });
            }
            for (const [index, stageId] of stageIds.entries()) {
                await tx.recruitmentStage.update({
                    where: { id: stageId },
                    data: { order: index + 1 },
                });
            }
        });

        return prisma.recruitmentStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' },
        });
    }

    /**
     * Paginated applicants for one listing.
     *
     * count and findMany go through one batched transaction: two independent
     * reads can disagree under concurrent writes and produce a page that reports
     * a total it does not have.
     */
    static async listApplications(
        opportunityId: string,
        opts: ListApplicationsOptions = {}
    ): Promise<PaginatedApplications> {
        const page = normalizePage(opts.page);
        const limit = clampLimit(opts.limit);

        const where: Prisma.OpportunityApplicationWhereInput = { opportunityId };
        if (opts.stageId) where.currentStageId = opts.stageId;
        if (opts.kind) where.currentStageKind = opts.kind;

        const [total, items] = await prisma.$transaction([
            prisma.opportunityApplication.count({ where }),
            prisma.opportunityApplication.findMany({
                where,
                include: applicationInclude,
                orderBy: { appliedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            items: items as OpportunityApplicationWithUser[],
            total,
            page,
            limit,
            // At least 1: an empty list still reports a page count, and 0 pages
            // reads like a broken response.
            pages: Math.max(1, Math.ceil(total / limit)),
        };
    }

    static async getApplication(applicationId: string): Promise<OpportunityApplicationWithUser | null> {
        const application = await prisma.opportunityApplication.findUnique({
            where: { id: applicationId },
            include: applicationInclude,
        });
        return (application as OpportunityApplicationWithUser | null) ?? null;
    }

    /**
     * Applying is idempotent: a double-tap or a retried request against the
     * @@unique([userId, opportunityId]) key is a UI accident, not a conflict, so
     * the existing application is returned rather than a 409. `update: {}` also
     * means re-applying never resets a candidate's progress.
     */
    static async createApplication(data: {
        userId: string;
        opportunityId: string;
    }): Promise<OpportunityApplication> {
        return prisma.opportunityApplication.upsert({
            where: {
                userId_opportunityId: {
                    userId: data.userId,
                    opportunityId: data.opportunityId,
                },
            },
            create: { userId: data.userId, opportunityId: data.opportunityId },
            update: {},
        });
    }

    /**
     * Moves a candidate to a stage of THIS opportunity's own pipeline.
     *
     * The comparison is against the raw opportunity.pipelineId, not the resolved
     * template: a listing with no pipeline is displayed against the platform
     * template, but that template is not the listing's process and must not
     * accept its candidates' moves.
     */
    static async moveApplication(
        applicationId: string,
        data: {
            toStageId: string;
            stage?: ApplicationStage;
            outcome?: string | null;
            outcomeData?: Record<string, unknown> | null;
        }
    ): Promise<OpportunityApplication> {
        const application = await prisma.opportunityApplication.findUnique({
            where: { id: applicationId },
            select: { id: true, userId: true, opportunityId: true, stage: true },
        });
        if (!application) throw new AppError('Application not found', 404);

        const targetStage = await prisma.recruitmentStage.findUnique({
            where: { id: data.toStageId },
        });
        if (!targetStage) throw new AppError('Target stage not found', 404);

        // The owning pipeline is read with its own query rather than via an
        // `include`. This is a security check, and a security check must not
        // depend on a relation having been hydrated: if `application.opportunity`
        // ever came back empty the comparison would silently degrade to `null`
        // and reject every legitimate move instead of allowing a wrong one.
        const opportunity = await prisma.opportunity.findUnique({
            where: { id: application.opportunityId },
            select: { pipelineId: true },
        });
        if (!opportunity) throw new AppError('Opportunity not found', 404);

        const owningPipelineId = opportunity.pipelineId ?? null;
        if (targetStage.pipelineId !== owningPipelineId) {
            throw new AppError('Target stage does not belong to this opportunity pipeline', 400);
        }

        // One write, so the fine-grained position and the coarse funnel stage can
        // never disagree and stageEnteredAt is stamped exactly once.
        const moved = await prisma.$transaction(async (tx) =>
            tx.opportunityApplication.update({
                where: { id: applicationId },
                data: {
                    currentStageId: targetStage.id,
                    currentStageKind: targetStage.kind,
                    stage: data.stage ?? deriveApplicationStage(targetStage.kind),
                    stageEnteredAt: new Date(),
                    outcome: data.outcome ?? null,
                    outcomeData: (data.outcomeData ?? null) as Prisma.InputJsonValue,
                },
            })
        );

        // Phase 8 notification integration: every stage move emits an
        // APPLICATION_UPDATE alert to the applicant. Fire-and-forget so a
        // notification failure never fails the move itself.
        void import('../alerts/applicationAlerts.service')
            .then(({ notifyApplicationStageChange }) =>
                notifyApplicationStageChange({
                    userId: application.userId,
                    opportunityId: application.opportunityId,
                    applicationId,
                    fromStage: String(application.stage),
                    toStage: String(moved.stage),
                    outcome: moved.outcome,
                })
            )
            .catch(() => { });

        return moved;
    }

    static async removeApplication(applicationId: string): Promise<void> {
        const application = await prisma.opportunityApplication.findUnique({
            where: { id: applicationId },
            select: { id: true },
        });
        if (!application) throw new AppError('Application not found', 404);
        await prisma.opportunityApplication.delete({ where: { id: applicationId } });
    }

    /* ------------------------------------------------------------------ */
    /* Phase 8 — user-side journey (dashboard queries + history)           */
    /*                                                                     */
    /* UserAction stays the lightweight signal (VIEWED / SHARED / PLANNED / */
    /* OA — one row per user+opportunity, overwritten). Opportunity-       */
    /* Application is the funnel record (stage, currentStage, outcome).    */
    /* These queries read ONLY the funnel record; they never touch         */
    /* UserAction, so the distinction cannot blur.                         */
    /* ------------------------------------------------------------------ */

    /**
     * Paginated funnel records for one user (dashboard "my applications").
     * Ownership is the filter: `userId` comes from the access token, never a
     * query param.
     */
    static async listApplicationsForUser(
        userId: string,
        opts: { stage?: ApplicationStage; page?: number; limit?: number } = {}
    ): Promise<PaginatedApplications> {
        const page = normalizePage(opts.page);
        const limit = clampLimit(opts.limit);
        const where: Prisma.OpportunityApplicationWhereInput = { userId };
        if (opts.stage) where.stage = opts.stage;

        const [total, items] = await prisma.$transaction([
            prisma.opportunityApplication.count({ where }),
            prisma.opportunityApplication.findMany({
                where,
                include: {
                    ...applicationInclude,
                    opportunity: {
                        select: {
                            id: true,
                            slug: true,
                            title: true,
                            company: true,
                            category: true,
                            locations: true,
                            expiresAt: true,
                            applicationDeadline: true,
                            registrationDeadline: true,
                        },
                    },
                },
                orderBy: { appliedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            items: items as OpportunityApplicationWithUser[],
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
        };
    }

    /** Counts by coarse stage + terminal outcome buckets for the dashboard. */
    static async getUserApplicationSummary(userId: string): Promise<{
        total: number;
        byStage: Record<string, number>;
        outcomes: { accepted: number; rejected: number; withdrawn: number; active: number };
    }> {
        const groups = await prisma.opportunityApplication.groupBy({
            by: ['stage'],
            where: { userId },
            _count: { _all: true },
        });
        const byStage: Record<string, number> = {};
        let total = 0;
        for (const g of groups) {
            byStage[g.stage] = g._count._all;
            total += g._count._all;
        }
        const accepted = byStage['ACCEPTED'] ?? 0;
        const rejected = byStage['REJECTED'] ?? 0;
        const withdrawn = byStage['WITHDRAWN'] ?? 0;
        return { total, byStage, outcomes: { accepted, rejected, withdrawn, active: total - accepted - rejected - withdrawn } };
    }

    /**
     * Stage history for one application. The schema has no history table by
     * design (frozen), so history is derived: the current record (stage,
     * currentStage, stageEnteredAt, outcome, appliedAt/updatedAt) plus the
     * APPLICATION_UPDATE alert deliveries in chronological order.
     */
    static async getApplicationHistory(
        applicationId: string,
        actorId: string
    ): Promise<{
        application: OpportunityApplicationWithUser;
        history: Array<{ id: string; kind: string; sentAt: Date; metadata: string | null }>;
    }> {
        const application = await prisma.opportunityApplication.findUnique({
            where: { id: applicationId },
            include: applicationInclude,
        });
        if (!application) throw new AppError('Application not found', 404);
        if ((application as { userId: string }).userId !== actorId) {
            throw new AppError('You do not have access to this application', 403);
        }
        const updates = await prisma.alertDelivery.findMany({
            where: {
                userId: actorId,
                opportunityId: application.opportunityId,
                kind: 'APPLICATION_UPDATE',
            },
            orderBy: { sentAt: 'asc' },
            select: { id: true, kind: true, sentAt: true, metadata: true },
        });
        return {
            application: application as OpportunityApplicationWithUser,
            history: updates.map((u) => ({
                id: u.id,
                kind: String(u.kind),
                sentAt: u.sentAt,
                metadata: u.metadata,
            })),
        };
    }

    /**
     * Candidate self-withdrawal: sets the coarse stage to WITHDRAWN with an
     * outcome, leaves the fine-grained currentStage pointer intact for audit,
     * and emits the APPLICATION_UPDATE alert. Ownership enforced here, not just
     * at the route, so the check survives router refactors.
     */
    static async withdrawApplication(
        applicationId: string,
        userId: string,
        outcome?: string | null
    ): Promise<OpportunityApplication> {
        const application = await prisma.opportunityApplication.findUnique({
            where: { id: applicationId },
            select: { id: true, userId: true, opportunityId: true, stage: true },
        });
        if (!application) throw new AppError('Application not found', 404);
        if (application.userId !== userId) {
            throw new AppError('You do not have access to this application', 403);
        }
        if (application.stage === ApplicationStage.WITHDRAWN) return application as OpportunityApplication;

        const updated = await prisma.opportunityApplication.update({
            where: { id: applicationId },
            data: {
                stage: ApplicationStage.WITHDRAWN,
                outcome: outcome ?? 'Withdrawn by candidate',
            },
        });

        void import('../alerts/applicationAlerts.service')
            .then(({ notifyApplicationStageChange }) =>
                notifyApplicationStageChange({
                    userId,
                    opportunityId: application.opportunityId,
                    applicationId,
                    fromStage: String(application.stage),
                    toStage: String(ApplicationStage.WITHDRAWN),
                    outcome: outcome ?? 'Withdrawn by candidate',
                })
            )
            .catch(() => { });

        return updated;
    }

    static async boardForOpportunity(opportunityId: string): Promise<PipelineBoard> {
        const pipeline = await this.getForOpportunity(opportunityId);
        if (!pipeline) throw new AppError('Opportunity not found', 404);
        return this.buildBoard(pipeline, { opportunityId });
    }

    static async boardForPipeline(pipelineId: string): Promise<PipelineBoard> {
        const pipeline = await this.getById(pipelineId);
        if (!pipeline) throw new AppError('Pipeline not found', 404);
        return this.buildBoard(pipeline, {});
    }

    /**
     * Two queries total: the pipeline with its stages, then every in-scope
     * application. Grouping happens here rather than in a per-stage query, so a
     * ten-stage board is two round trips instead of eleven.
     */
    private static async buildBoard(
        pipeline: PipelineWithStages,
        scope: { opportunityId?: string }
    ): Promise<PipelineBoard> {
        const stageIds = pipeline.stages.map((s) => s.id);

        // A candidate who has not been placed in a stage yet still belongs on the
        // board, so the filter is "in one of these stages, or in none of them".
        const scopeFilter: Prisma.OpportunityApplicationWhereInput = scope.opportunityId
            ? { opportunityId: scope.opportunityId }
            : {};
        const where: Prisma.OpportunityApplicationWhereInput = stageIds.length
            ? { ...scopeFilter, OR: [{ currentStageId: { in: stageIds } }, { currentStageId: null }] }
            : { ...scopeFilter, currentStageId: null };

        const applications = (await prisma.opportunityApplication.findMany({
            where,
            include: applicationInclude,
            orderBy: { appliedAt: 'desc' },
        })) as OpportunityApplicationWithUser[];

        const byStage = new Map<string, OpportunityApplicationWithUser[]>();
        // Every stage gets a column even when it is empty: a board whose columns
        // depend on candidate counts cannot be laid out, and a recruiter cannot
        // see that a step exists until someone reaches it.
        for (const stage of pipeline.stages) byStage.set(stage.id, []);

        const unplaced: OpportunityApplicationWithUser[] = [];
        for (const application of applications) {
            const column = byStage.get(application.currentStageId ?? '');
            if (column) column.push(application);
            else unplaced.push(application);
        }

        const columns: BoardColumn[] = pipeline.stages.map((stage) => ({
            stage,
            applications: byStage.get(stage.id) ?? [],
        }));

        // Synthetic leading column, identified by an empty stage id: it holds the
        // unplaced candidates and cannot collide with a real uuid.
        if (unplaced.length > 0) {
            columns.unshift({
                stage: {
                    id: '',
                    pipelineId: pipeline.id,
                    kind: RecruitmentStageKind.OTHER,
                    name: 'Not placed',
                    order: 0,
                    expectedDays: null,
                } as RecruitmentStage,
                applications: unplaced,
            });
        }

        return { pipeline, columns };
    }
}

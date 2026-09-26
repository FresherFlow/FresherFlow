import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit } from '../../middleware/adminAudit';
import { validate } from '../../middleware/validate';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../infrastructure/database/prisma';
import { IngestionSourceType, OpportunityCategory } from '@fresherflow/database';
import {
    createSource,
    updateSource,
    setSourceEnabled,
    deleteSource,
    listSources,
    getSource,
    runIngestion,
    retryRawItem,
    getIngestionOverview,
    getSourceMetrics,
    listDueSources,
    SourceValidationError,
    UnsafeEndpointError,
    listSupportedSourceTypes,
} from '../../application/ingestion';

const router: Router = Router();

/**
 * Source management is gated on `source.manage`; triggering a run and reading
 * the raw queue is `ingestion.manage`. A moderator who can review listings
 * should not be able to repoint a source at an arbitrary URL.
 */

const SOURCE_TYPES = z.enum([
    'JSON_FEED',
    'WORKDAY',
    'GREENHOUSE',
    'LEVER',
    'CUSTOM',
]);

const createSourceSchema = z.object({
    name: z.string().min(1).max(120),
    sourceType: SOURCE_TYPES,
    endpoint: z.string().min(1).max(1000),
    enabled: z.boolean().optional(),
    runFrequencyMinutes: z.number().int().min(5).max(10_080).optional(),
    defaultCategory: z.enum(['EMPLOYMENT', 'COMPETITION', 'SCHOLARSHIP', 'EDUCATION', 'EVENT']).optional(),
});

const updateSourceSchema = createSourceSchema.partial();

const runSourceSchema = z.object({
    maxItems: z.number().int().min(1).max(2000).optional(),
    timeoutMs: z.number().int().min(1000).max(120_000).optional(),
});

const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    status: z.enum(['FETCHED', 'DRAFT_CREATED', 'DEDUPED', 'REJECTED', 'ERROR']).optional(),
    sourceId: z.string().uuid().optional(),
});

/** Map application-layer validation failures onto the standard 400 shape. */
function handleValidationError(error: unknown, next: NextFunction): void {
    if (error instanceof SourceValidationError || error instanceof UnsafeEndpointError) {
        next(new AppError(error.message, 400));
        return;
    }
    next(error);
}

// ── Sources ────────────────────────────────────────────────────────────────

router.get(
    '/sources',
    requirePermission('source.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sources = await listSources();
            return res.json({ success: true, sources, supportedTypes: listSupportedSourceTypes() });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/sources/metrics',
    requirePermission('ingestion.manage'),
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            return res.json({ success: true, metrics: await getSourceMetrics() });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/overview',
    requirePermission('ingestion.manage'),
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            return res.json({ success: true, ...(await getIngestionOverview()) });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/sources/due',
    requirePermission('ingestion.manage'),
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const sources = await listDueSources();
            return res.json({ success: true, count: sources.length, sources });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/sources/:id',
    requirePermission('source.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const source = await getSource(String(req.params.id));
            if (!source) return next(new AppError('Source not found', 404));
            return res.json({ success: true, source });
        } catch (error) {
            return next(error);
        }
    }
);

router.post(
    '/sources',
    requirePermission('source.manage'),
    validate(createSourceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as z.infer<typeof createSourceSchema>;
            const source = await createSource({
                name: body.name,
                sourceType: body.sourceType as IngestionSourceType,
                endpoint: body.endpoint,
                enabled: body.enabled,
                runFrequencyMinutes: body.runFrequencyMinutes,
                defaultCategory: body.defaultCategory as OpportunityCategory | undefined,
                createdByUserId: req.userId ?? null,
            });
            return res.status(201).json({ success: true, source });
        } catch (error) {
            return handleValidationError(error, next);
        }
    }
);

router.patch(
    '/sources/:id',
    requirePermission('source.manage'),
    validate(updateSourceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as z.infer<typeof updateSourceSchema>;
            const source = await updateSource(String(req.params.id), {
                name: body.name,
                sourceType: body.sourceType as IngestionSourceType | undefined,
                endpoint: body.endpoint,
                enabled: body.enabled,
                runFrequencyMinutes: body.runFrequencyMinutes,
                defaultCategory: body.defaultCategory as OpportunityCategory | undefined,
            });
            if (!source) return next(new AppError('Source not found', 404));
            return res.json({ success: true, source });
        } catch (error) {
            return handleValidationError(error, next);
        }
    }
);

router.post(
    '/sources/:id/enable',
    requirePermission('source.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ok = await setSourceEnabled(String(req.params.id), true);
            if (!ok) return next(new AppError('Source not found', 404));
            return res.json({ success: true });
        } catch (error) {
            return next(error);
        }
    }
);

router.post(
    '/sources/:id/disable',
    requirePermission('source.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ok = await setSourceEnabled(String(req.params.id), false);
            if (!ok) return next(new AppError('Source not found', 404));
            return res.json({ success: true });
        } catch (error) {
            return next(error);
        }
    }
);

router.delete(
    '/sources/:id',
    requirePermission('source.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ok = await deleteSource(String(req.params.id));
            if (!ok) return next(new AppError('Source not found', 404));
            return res.json({ success: true });
        } catch (error) {
            return next(error);
        }
    }
);

// ── Runs ───────────────────────────────────────────────────────────────────

/**
 * Trigger a run. Awaited rather than queued: an admin pressing "run now" wants
 * the outcome. The cron path uses `runDueSources` for the scheduled case.
 */
router.post(
    '/sources/:id/run',
    requirePermission('ingestion.manage'),
    adminRateLimit,
    validate(runSourceSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as z.infer<typeof runSourceSchema>;
            const source = await getSource(String(req.params.id));
            if (!source) return next(new AppError('Source not found', 404));
            if (!source.enabled) {
                return next(new AppError('Source is disabled', 409));
            }

            const summary = await runIngestion(
                {
                    id: source.id,
                    name: source.name,
                    sourceType: source.sourceType,
                    endpoint: source.endpoint,
                    defaultCategory: source.defaultCategory,
                },
                { maxItems: body.maxItems, timeoutMs: body.timeoutMs }
            );

            // A failed run is a 502: the upstream source, not this API, failed.
            if (summary.status === 'FAILED') {
                return res.status(502).json({ success: false, ...summary });
            }
            return res.json({ success: true, ...summary });
        } catch (error) {
            return handleValidationError(error, next);
        }
    }
);

router.get(
    '/runs',
    requirePermission('ingestion.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = listQuerySchema.parse(req.query);
            const where = {
                ...(query.sourceId ? { sourceId: query.sourceId } : {}),
                ...(query.status
                    ? { rawItems: { some: { status: query.status } } }
                    : {}),
            };
            const [runs, total] = await Promise.all([
                prisma.ingestionRun.findMany({
                    where,
                    orderBy: { startedAt: 'desc' },
                    skip: (query.page - 1) * query.limit,
                    take: query.limit,
                    include: { source: { select: { id: true, name: true } } },
                }),
                prisma.ingestionRun.count({ where }),
            ]);
            return res.json({
                success: true,
                runs,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total,
                    totalPages: Math.ceil(total / query.limit),
                },
            });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/runs/:id',
    requirePermission('ingestion.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const run = await prisma.ingestionRun.findUnique({
                where: { id: String(req.params.id) },
                include: { source: { select: { id: true, name: true } } },
            });
            if (!run) return next(new AppError('Run not found', 404));
            return res.json({ success: true, run });
        } catch (error) {
            return next(error);
        }
    }
);

// ── Raw queue ──────────────────────────────────────────────────────────────

/**
 * The raw queue is the moderation surface for ingestion: every fetched listing
 * is here with its verdict and reason flags, including ones already turned into
 * drafts. `rawPayload` is intentionally excluded from the list response
 * because it can be large; use `/raw/:id` for the full document.
 */
router.get(
    '/raw',
    requirePermission('ingestion.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const query = listQuerySchema.parse(req.query);
            const where = {
                ...(query.sourceId ? { sourceId: query.sourceId } : {}),
                ...(query.status ? { status: query.status } : {}),
            };
            const [items, total] = await Promise.all([
                prisma.rawOpportunity.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    skip: (query.page - 1) * query.limit,
                    take: query.limit,
                    select: {
                        id: true,
                        sourceId: true,
                        ingestionRunId: true,
                        sourceExternalId: true,
                        status: true,
                        title: true,
                        company: true,
                        sourceLink: true,
                        applyLink: true,
                        reasonFlags: true,
                        errorMessage: true,
                        mappedOpportunityId: true,
                        createdAt: true,
                    },
                }),
                prisma.rawOpportunity.count({ where }),
            ]);
            return res.json({
                success: true,
                items,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total,
                    totalPages: Math.ceil(total / query.limit),
                },
            });
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    '/raw/:id',
    requirePermission('ingestion.manage'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const item = await prisma.rawOpportunity.findUnique({
                where: { id: String(req.params.id) },
                include: { mappedOpportunity: { select: { id: true, slug: true, status: true } } },
            });
            if (!item) return next(new AppError('Raw item not found', 404));
            return res.json({ success: true, item });
        } catch (error) {
            return next(error);
        }
    }
);

/**
 * POST /api/admin/ingestion/raw/:id/retry
 * Re-derive a REJECTED/ERROR/FETCHED row from its stored rawPayload after a
 * connector or mapping fix. No refetch, no new transaction scope beyond the
 * single row — one bad row cannot roll back the rest.
 */
router.post(
    '/raw/:id/retry',
    requirePermission('ingestion.manage'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await retryRawItem(String(req.params.id));
            if (result.outcome === 'NOT_RETRYABLE') {
                return next(new AppError('Only FETCHED, REJECTED, or ERROR rows can be retried', 409));
            }
            return res.json({ success: true, ...result });
        } catch (error) {
            if (error instanceof Error && error.message === 'Raw item not found') {
                return next(new AppError('Raw item not found', 404));
            }
            return next(error);
        }
    }
);

/**
 * POST /api/admin/ingestion/raw/:id/reject
 * Moderator rejection for a raw row that should never become a draft
 * (spam, test data, out-of-scope listing). FETCHED-only; already-triaged
 * rows keep their verdict so the run history stays truthful.
 */
router.post(
    '/raw/:id/reject',
    requirePermission('ingestion.manage'),
    adminRateLimit,
    withAdminAudit('REJECT'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
            const item = await prisma.rawOpportunity.findUnique({
                where: { id: String(req.params.id) },
                select: { id: true, status: true },
            });
            if (!item) return next(new AppError('Raw item not found', 404));
            if (item.status !== 'FETCHED') {
                return next(new AppError(`Raw item is already ${item.status.toLowerCase()}`, 409));
            }
            const updated = await prisma.rawOpportunity.update({
                where: { id: item.id },
                data: { status: 'REJECTED', reasonFlags: ['moderator_rejected'], errorMessage: note || null },
                select: { id: true, status: true, reasonFlags: true },
            });
            return res.json({ success: true, item: updated });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;



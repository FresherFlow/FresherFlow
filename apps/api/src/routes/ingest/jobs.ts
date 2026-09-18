import { Router, Request, Response, NextFunction } from 'express';
import { requireInternalApiKey } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ingestJobSchema, type IngestJobInput } from '../../utils/validation';
import {
    ingestJobsHourLimiter,
    ingestJobsMinuteLimiter,
    submitJob,
} from '../../infrastructure/services/community.service';

const router = Router();

function asingle(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * POST /api/ingest/jobs
 * Single machine endpoint for AI agents to add jobs with full payload.
 * Auth: x-api-key must equal INTERNAL_API_SECRET (timing-safe compare).
 * Rate limits: 60/min + 500/hour per IP (behind shared limiter keys).
 * Idempotency: URL dedupe in submitJob + optional Idempotency-Key echo.
 */
router.post(
    '/jobs',
    requireInternalApiKey,
    ingestJobsMinuteLimiter,
    ingestJobsHourLimiter,
    validate(ingestJobSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as IngestJobInput;
            const sourceUrl = asingle(body.sourceLink) ?? asingle(body.sourceUrl);
            const applyUrl = asingle(body.applyLink) ?? asingle(body.applyUrl);
            if (!sourceUrl && !applyUrl) {
                return res.status(400).json({ success: false, message: 'sourceLink or applyLink is required' });
            }
            const idempotencyKey =
                (req.headers['idempotency-key'] as string | undefined)?.trim() ||
                body.idempotencyKey?.trim() ||
                null;

            const result = await submitJob({
                userId: null,
                sourceUrl: (sourceUrl ?? applyUrl) as string,
                applyUrl: applyUrl ?? undefined,
                title: body.title,
                company: body.company,
                companyWebsite: body.companyWebsite,
                companyLogoUrl: body.companyLogoUrl,
                description: body.description,
                type: body.type as unknown as Parameters<typeof submitJob>[0]['type'],
                locations: body.locations ?? [],
                requiredSkills: body.requiredSkills?.length ? body.requiredSkills : (body.skills ?? []),
                allowedDegrees: (body.allowedDegrees ?? []) as unknown as Parameters<typeof submitJob>[0]['allowedDegrees'],
                allowedCourses: body.allowedCourses ?? [],
                allowedSpecializations: body.allowedSpecializations ?? [],
                allowedPassoutYears: body.allowedPassoutYears ?? [],
                workMode: (body.workMode ?? null) as unknown as Parameters<typeof submitJob>[0]['workMode'],
                salaryRange: body.salaryRange ?? null,
                salaryMin: body.salaryMin ?? null,
                salaryMax: body.salaryMax ?? null,
                salaryPeriod: body.salaryPeriod as unknown as Parameters<typeof submitJob>[0]['salaryPeriod'],
                stipend: body.stipend ?? null,
                employmentType: body.employmentType ?? null,
                experienceMin: body.experienceMin ?? null,
                experienceMax: body.experienceMax ?? null,
                tags: body.tags ?? [],
                jobFunction: body.jobFunction ?? null,
                incentives: body.incentives ?? null,
                selectionProcess: body.selectionProcess ?? null,
                notesHighlights: body.notesHighlights ?? null,
                applicationDetails: body.applicationDetails ?? null,
                dates: body.dates ?? [],
                dateRange: body.dateRange ?? null,
                timeRange: body.timeRange ?? null,
                venueAddress: body.venueAddress ?? null,
                venueLink: body.venueLink ?? null,
                reportingTime: body.reportingTime ?? null,
                contact: body.contact ?? null,
                submitterName: body.submitterName ?? null,
                submittedVia: 'agent_api',
            });

            if (idempotencyKey) res.setHeader('Idempotency-Key', idempotencyKey);
            return res.status(result.existing ? 200 : 201).json({
                success: true,
                verdict: result.existing ? 'duplicate' : 'created',
                ...result,
            });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;

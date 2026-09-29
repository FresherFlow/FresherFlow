import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../../../infrastructure/database/prisma';
import { validate } from '../../../middleware/validate';
import { mcpSubmitOpportunitySchema } from '../../../utils/validation';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { mcpSubmitLimiter, submitJob } from '../../../infrastructure/services/community/community.service';

const router = Router();

/**
 * POST /api/opportunities/mcp-submit
 * Anonymous, strictly-typed opportunity submission for AI agents (ChatGPT MCP).
 *
 * Design (plan 23 §7-9):
 * - No auth. Anonymous ≠ anonymous publishing: the submission lands in
 *   PENDING_REVIEW and is never visible until a moderator approves it.
 * - Strict schema: no arbitrary object payload, every field length-capped.
 * - URL fields are DATA ONLY. The server never fetches them.
 * - Tight rate limit (10/hour per IP) to prevent spam through the MCP channel.
 * - Bulk tier: requests carrying `x-api-key: <MCP_SUBMIT_KEY>` (the operator's
 *   own key, never INTERNAL_API_SECRET) get 300/hour for link-dump workflows.
 *   Anonymous callers stay on the 10/hour tier no matter what.
 */
const mcpSubmitBulkLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 300,
    message: 'Too many MCP submissions. Please slow down.',
    keyPrefix: 'mcp_submit_key',
});

function mcpSubmitRateLimit(req: Request, res: Response, next: NextFunction) {
    const presented = req.header('x-api-key') ?? '';
    const expected = process.env.MCP_SUBMIT_KEY ?? '';
    if (
        presented &&
        expected &&
        presented.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected))
    ) {
        return mcpSubmitBulkLimiter(req, res, next);
    }
    return mcpSubmitLimiter(req, res, next);
}

router.post(
    '/mcp-submit',
    mcpSubmitRateLimit,
    validate(mcpSubmitOpportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as {
                title: string;
                companyName: string;
                jobUrl: string;
                location?: string;
                employmentType?: string;
                employmentTypes?: string;
                category?: 'job' | 'internship' | 'walkin' | 'government';
                dates?: string[];
                dateRange?: string | null;
                timeRange?: string | null;
                venueAddress?: string | null;
                salary?: string;
                description?: string;
                eligibility?: string;
                sourceUrl?: string;
                contactEmail?: string;
            };

            // Walk-ins are a recruitment method (dated drive), government is a
            // sector — both ride on category EMPLOYMENT with dimensions set.
            const category =
                body.category === 'walkin'
                    ? 'WALKIN'
                    : body.category === 'government'
                      ? 'JOB'
                      : (body.category ?? 'job').toUpperCase();
            const employmentTypes = body.employmentTypes ?? body.employmentType ?? null;

            const result = await submitJob({
                userId: null,
                sourceUrl: body.jobUrl,
                applyUrl: body.jobUrl,
                title: body.title,
                company: body.companyName,
                description: body.description ?? null,
                category,
                locations: body.location ? [body.location] : [],
                employmentTypes,
                sector: body.category === 'government' ? 'GOVERNMENT' : undefined,
                dates: body.dates,
                dateRange: body.dateRange ?? null,
                timeRange: body.timeRange ?? null,
                venueAddress: body.venueAddress ?? null,
                salaryRange: body.salary ?? null,
                requiredSkills: [],
                allowedPassoutYears: [],
                contact: body.contactEmail ?? null,
                submittedVia: 'mcp',
                published: false,
            });

            // PENDING_REVIEW: never claim publication. The MCP layer must
            // communicate this state explicitly so ChatGPT cannot tell the
            // user the job is live when it is only staged.
            // Duplicates resolve against the LIVE row state, never a hardcoded
            // flag: an already-live URL reports PUBLISHED, an already-staged
            // URL reports PENDING_REVIEW. (submitJob's dedupe paths predate
            // this contract, so the row is re-read here rather than trusting
            // its return.)
            if (result.existing) {
                const live = await prisma.opportunity.findUnique({
                    where: { id: result.id },
                    select: { status: true, slug: true },
                });
                const isLive = live?.status === 'PUBLISHED';
                return res.status(200).json({
                    success: true,
                    submissionId: result.id,
                    slug: result.slug ?? live?.slug ?? null,
                    status: isLive ? 'PUBLISHED' : 'PENDING_REVIEW',
                    published: isLive,
                    message: isLive
                        ? 'This opportunity is already live on FresherFlow.'
                        : 'This opportunity was already submitted and is awaiting moderator review. It is not live.',
                });
            }
            return res.status(201).json({
                success: true,
                submissionId: result.id,
                slug: result.slug ?? null,
                status: 'PENDING_REVIEW',
                published: false,
                message: 'Opportunity submitted for FresherFlow review. It has not been published yet.',
            });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;
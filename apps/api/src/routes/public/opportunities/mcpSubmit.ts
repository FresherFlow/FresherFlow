import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../../middleware/validate';
import { mcpSubmitOpportunitySchema } from '../../../utils/validation';
import { mcpSubmitLimiter, submitJob } from '../../../infrastructure/services/community.service';

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
 */
router.post(
    '/mcp-submit',
    mcpSubmitLimiter,
    validate(mcpSubmitOpportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = req.body as {
                title: string;
                companyName: string;
                jobUrl: string;
                location?: string;
                employmentType?: string;
                salary?: string;
                description?: string;
                eligibility?: string;
                sourceUrl?: string;
                contactEmail?: string;
            };

            const result = await submitJob({
                userId: null,
                sourceUrl: body.jobUrl,
                applyUrl: body.jobUrl,
                title: body.title,
                company: body.companyName,
                description: body.description ?? null,
                type: 'JOB',
                locations: body.location ? [body.location] : [],
                employmentType: body.employmentType ?? null,
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
            return res.status(result.existing ? 200 : 201).json({
                success: true,
                submissionId: result.id,
                slug: result.slug ?? null,
                status: result.status,
                published: result.status === 'PUBLISHED',
                message: result.existing
                    ? 'This opportunity already exists on FresherFlow.'
                    : 'Opportunity submitted for FresherFlow review. It has not been published yet.',
            });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;
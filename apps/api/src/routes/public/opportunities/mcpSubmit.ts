import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { validate } from '../../../middleware/validate';
import { mcpSubmitOpportunitySchema } from '../../../utils/validation';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { submitJob } from '../../../infrastructure/services/community/community.service';
import { verifyAccessToken as verifyMcpAccessToken } from '../../../infrastructure/services/platform/mcpOAuth.service';
import { resolveMcpIdentity } from '../../../application/mcp/identity';
import { handleOpportunityPublished } from '../../../infrastructure/services/opportunity/publish.service';
import { AppError } from '../../../middleware/errorHandler';
import type { Opportunity } from '@fresherflow/types';

const router = Router();

/**
 * POST /api/opportunities/mcp-submit
 * Submission path for AI agents connected to FresherFlow.
 *
 * Authentication is mandatory. The only credential this route accepts is an
 * OAuth 2.1 bearer minted by the FresherFlow authorization server for a
 * signed-in account — there is no anonymous tier and no API-key shortcut. That
 * is what makes the next rule enforceable:
 *
 *   - a moderator (account holds `opportunity.publish`) publishes on submit;
 *   - everyone else's submission is written as a DRAFT awaiting review.
 *
 * The publish decision is re-read from RBAC on every call, so granting or
 * revoking the moderator role in the admin panel takes effect immediately.
 *
 * URL fields are DATA ONLY. The server never fetches them.
 */

/**
 * Authenticate the caller before anything else runs.
 *
 * Kept as its own middleware so the rate limiter below can key on the resolved
 * user rather than on the caller IP: every MCP request arrives from the single
 * MCP server process, so an IP-keyed bucket would let one person's submissions
 * exhaust everybody else's budget.
 */
const requireMcpUser: RequestHandler = async (req, res, next) => {
    const header = req.headers.authorization;
    const bearer = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';

    if (!bearer) {
        res.status(401).json({
            error: {
                message:
                    'Connect FresherFlow and sign in first — submissions from the FresherFlow tools '
                    + 'must be made by a signed-in account.',
            },
        });
        return;
    }

    try {
        const identity = await verifyMcpAccessToken(bearer);
        if (!identity) {
            // Never fall back to a staged submission here: the caller believes it
            // is signed in, and silently degrading would misreport who owns the row.
            res.status(401).json({
                error: {
                    message: 'This connection\'s access token is invalid or expired. '
                        + 'Reconnect FresherFlow in your AI client and sign in again.',
                },
            });
            return;
        }
        req.userId = identity.userId;
        req.isAnonymous = false;
        next();
    } catch (error) {
        next(error);
    }
};

const mcpSubmitLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: 'Too many MCP submissions. Please slow down.',
    keyPrefix: 'mcp_submit',
    keyGenerator: (req) => req.userId ?? req.ip ?? 'unknown-user',
});

router.post(
    '/mcp-submit',
    requireMcpUser,
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
                employmentTypes?: string;
                category?: 'job' | 'internship' | 'walkin' | 'government';
                dates?: string[];
                dateRange?: string | null;
                timeRange?: string | null;
                venueAddress?: string | null;
                salary?: string;
                description?: string;
                eligibility?: string;
                skills?: string[];
                passoutYears?: number[];
                sourceUrl?: string;
                contactEmail?: string;
            };

            const signedInUserId = req.userId as string;
            const identity = await resolveMcpIdentity(signedInUserId);
            const publishes = identity.capabilities.submitPublishes;

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
                userId: signedInUserId,
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
                // Passed through rather than hardcoded empty: the agent read the
                // posting, so these are the only structured eligibility values
                // this path can ever have. submitJob parses `eligibility` into
                // degrees/batches when these are absent.
                requiredSkills: body.skills ?? [],
                allowedPassoutYears: body.passoutYears ?? [],
                eligibility: body.eligibility ?? null,
                contact: body.contactEmail ?? null,
                submittedVia: 'mcp_user',
                // The product rule, in one line: a moderator's submission is live,
                // everyone else's is a draft a moderator still has to publish.
                published: publishes,
            });

            // The row is read back rather than trusted: an already-live URL
            // reports PUBLISHED, an already-staged one reports DRAFT, and the
            // agent must never hear a status the database does not hold.
            const stored = await prisma.opportunity.findUnique({
                where: { id: result.id },
                select: { status: true, slug: true },
            });
            const isLive = stored?.status === 'PUBLISHED';

            if (!result.existing && isLive) {
                // submitJob writes the row directly, so the publish side effects
                // (feed regeneration, alerts, indexing) do not run for it. Without
                // this the response would say "live" while the CDN feed still had
                // no such listing — the exact class of lie this route exists to
                // avoid. Best-effort on purpose: a feed failure must not turn a
                // successful write into an error the agent retries.
                try {
                    const published = await prisma.opportunity.findUnique({ where: { id: result.id } });
                    if (published) {
                        await handleOpportunityPublished(published as unknown as Opportunity, { isNew: true });
                    }
                } catch {
                    // Retried by the feed refresh flow.
                }
            }

            const status = isLive ? 'PUBLISHED' : 'DRAFT';
            const slug = result.slug ?? stored?.slug ?? null;

            return res.status(result.existing ? 200 : 201).json({
                success: true,
                submissionId: result.id,
                slug,
                status,
                published: isLive,
                duplicate: Boolean(result.existing),
                message: result.existing
                    ? isLive
                        ? 'This opportunity is already live on FresherFlow.'
                        : 'This opportunity was already submitted and is saved as a draft awaiting review. It is not live.'
                    : isLive
                        ? 'Opportunity added and live on FresherFlow.'
                        : 'Opportunity saved as a draft. A moderator will review it before it goes live — it is not live yet.',
            });
        } catch (error) {
            return next(error);
        }
    }
);

export default router;

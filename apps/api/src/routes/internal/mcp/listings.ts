import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate';
import { sendError, ErrorCode, AppError } from '../../../middleware/errorHandler';
import { createRateLimiter } from '../../../middleware/rateLimit';
import { getUserPermissions, requirePermission } from '../../../middleware/auth';
import { opportunitySchema } from '../../../utils/validation';
import {
    browseLiveListings,
    type BrowseListingType,
    BROWSE_DEFAULT_LIMIT,
    BROWSE_MAX_LIMIT,
    BROWSE_MAX_PAGE,
} from '../../../application/opportunity/browseListings';
import {
    createListing, updateListing, getListing, ListingWriteError, type ListingRecord,
} from '../../../application/opportunity/listingWrite';
import type { ExtendedAdminOpportunityData } from '../../../application/opportunity/listingPayload';
import {
    EducationLevel, WorkMode, SalaryPeriod, Availability,
    OpportunityStatus as SharedOpportunityStatus,
    EmploymentType, RecruitmentMethod, Sector,
} from '@fresherflow/types';

/**
 * Internal listing API used by the FresherFlow MCP server.
 *
 * This is the capability `submit_opportunity` never had: the full admin field
 * set, so an agent can build a complete listing instead of a review ticket.
 * It sits behind `requireInternalApiKey` (mounted in `src/index.ts`) because
 * `opportunity.create` / `opportunity.edit` are SUPER_ADMIN-only — routing MCP
 * calls through the admin router would have meant the MCP server holding a
 * super-admin session, which turns any reachable MCP endpoint into a
 * publish-anything tool. Anonymous callers keep `submit_opportunity`, which
 * stages for moderator review and can never publish.
 */

const router = Router();

/**
 * Permission gate for the two caller types reaching this router.
 *
 * A caller holding the internal service key has no user identity: it was
 * authenticated by the fixed secret in `mcpSurfaceAuth`, so there is no RBAC
 * subject to check and it is allowed through as before.
 *
 * A caller with an OAuth 2.1 token DOES carry an identity (`req.userId`), and
 * that identity is a normal user. Without this gate, connecting FresherFlow to
 * any AI client would let a signed-in fresher write or publish listings — the
 * exact escalation this router was built to avoid. So when a user identity is
 * present, the real permission check runs and can refuse.
 */
function mcpPermission(key: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.userId) {
            next();
            return;
        }
        return requirePermission(key)(req, res, next);
    };
}

/**
 * Gate that accepts any of several permission keys.
 *
 * Used for full listing writes: a moderator holds `opportunity.edit` and a
 * super admin holds `opportunity.create` too, so requiring only one key would
 * lock the other role out. A plain account holds neither and is refused.
 */
function mcpPermissionAny(keys: readonly string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.userId) {
            next();
            return;
        }
        try {
            const granted = await getUserPermissions(req.userId);
            if (!keys.some((key) => granted.includes(key))) {
                next(new AppError(
                    'Editing or creating full listings needs a moderator account. Your FresherFlow '
                    + 'account does not have that role — use submit_opportunity instead, which saves '
                    + 'the job as a draft for a moderator to review.',
                    403,
                ));
                return;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

/** Does the caller hold a publish-capable (moderator) account? Service key: no. */
async function callerIsModerator(req: Request): Promise<boolean> {
    if (!req.userId) return false;
    const granted = await getUserPermissions(req.userId);
    return granted.includes('opportunity.publish');
}

/** Generous but bounded: an agent extracting one page of jobs, not a scraper. */
const mcpListingLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many listing writes. Please slow down.',
    keyPrefix: 'mcp_listing',
});

const mcpReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many listing reads. Please slow down.',
    keyPrefix: 'mcp_listing_read',
});

/** How much of a listing an agent actually needs to build the next call. */
const createOptionsSchema = z.object({
    /**
     * DRAFT stages the listing for moderator review (default, and the only
     * safe default for an unattended agent). PUBLISHED puts it live
     * immediately and fires alerts, feed regeneration and notifications.
     */
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    /**
     * `update-existing` (default) makes a repeated submit of the same URL
     * update the pending draft instead of failing, and refuses to touch a row
     * that is already published. `reject` returns 409 on any duplicate.
     */
    onDuplicate: z.enum(['reject', 'update-existing']).optional(),
});

function respondWithWriteError(
    res: Response,
    req: Request,
    error: ListingWriteError,
): Response {
    return sendError(res, error.status, ErrorCode[error.code], error.message, req.requestId, error.details);
}

/**
 * The contract an agent codes against: the live Zod schema rendered as JSON
 * Schema, plus the enum vocabularies it cannot infer from field names.
 *
 * This is generated from the same `opportunitySchema` the admin form is
 * validated against, so it can never drift from what the API accepts.
 */
router.get('/schema', mcpPermission('opportunity.review'), mcpReadLimiter, (_req: Request, res: Response) => {
    res.json({
        schema: z.toJSONSchema(opportunitySchema, { io: 'input' }),
        enums: {
            // `category` is a frontend alias; the split model these values map
            // onto is the `dimensionMapping` below.
            category: ['job', 'internship', 'walk-in'],
            status: Object.values(SharedOpportunityStatus),
            allowedDegrees: Object.values(EducationLevel),
            allowedAvailability: Object.values(Availability),
            workMode: Object.values(WorkMode),
            salaryPeriod: Object.values(SalaryPeriod),
            employmentTypes: Object.values(EmploymentType),
            recruitmentMethods: Object.values(RecruitmentMethod),
            sector: Object.values(Sector),
        },
        rules: {
            required: ['title', 'company', 'requiredSkills'],
            applyLinkRequired:
                'Any listing that is not a walk-in needs applyLink or sourceLink. '
                + 'The API mirrors sourceLink into applyLink when only one is given.',
            categoriesMapToDimensions:
                'category does not decide one thing. `walk-in` sets recruitmentMethod=WALK_IN; '
                + '`internship` appends the INTERNSHIP employment type; everything else '
                + 'resolves to OpportunityCategory=EMPLOYMENT.',
            employmentTypesFormat:
                'employmentTypes is free text, not an array: comma-, pipe- or slash-separated. '
                + 'Values outside the employmentTypes enum are dropped silently, so use exact enum values.',
            governmentJobs:
                '`government` is NOT an accepted category. Send a governmentJobDetails object '
                + 'plus sector: "GOVERNMENT"; the details block is what creates the govt record.',
            unknownFieldsDropped:
                'This is a closed object. Any key not in the schema is silently discarded — '
                + 'check this schema before inventing a field name.',
        },
    });
});

/**
 * GET /api/internal/mcp/listings/:id
 * Read a listing back so the agent can verify what was actually stored rather
 * than trusting the write response.
 */
router.get('/listings/:id', mcpPermission('opportunity.review'), mcpReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const listing = await getListing(req.params.id as string);
        res.json({ success: true, listing });
    } catch (error) {
        if (error instanceof ListingWriteError) {
            return respondWithWriteError(res, req, error);
        }
        next(error);
    }
});

/**
 * POST /api/internal/mcp/listings
 * Create a listing from the complete admin payload.
 */
router.post(
    '/listings',
    mcpPermissionAny(['opportunity.create', 'opportunity.edit']),
    mcpListingLimiter,
    validate(z.object({ payload: opportunitySchema, options: createOptionsSchema.optional() })),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { payload, options } = req.body as {
                payload: ExtendedAdminOpportunityData;
                options?: z.infer<typeof createOptionsSchema>;
            };
            // A moderator is a trusted publisher, so their listing goes live by
            // default — the same rule their submission follows. The pipeline's
            // service key has no identity, so it keeps the safe DRAFT default.
            const defaultStatus = (await callerIsModerator(req)) ? 'PUBLISHED' : 'DRAFT';
            const status = options?.status ?? defaultStatus;
            const { listing, updatedExisting } = await createListing(payload, {
                status,
                onDuplicate: options?.onDuplicate ?? 'update-existing',
            });
            res.status(updatedExisting ? 200 : 201).json({
                success: true,
                created: !updatedExisting,
                updatedExisting,
                published: listing.status === SharedOpportunityStatus.PUBLISHED,
                message: updatedExisting
                    ? 'An existing pending draft was updated with this payload.'
                    : status === 'PUBLISHED'
                        ? 'Listing created and published.'
                        : 'Listing created as a draft for moderator review.',
                listing,
            });
        } catch (error) {
            if (error instanceof ListingWriteError) {
                return respondWithWriteError(res, req, error);
            }
            next(error);
        }
    },
);

/**
 * PUT /api/internal/mcp/listings/:id
 * Full replace of an existing listing — send the complete payload, not a diff.
 */
router.put(
    '/listings/:id',
    mcpPermission('opportunity.edit'),
    mcpListingLimiter,
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { listing, becamePublished } = await updateListing(
                req.params.id as string,
                req.body,
            );
            const record = listing as ListingRecord;
            res.json({
                success: true,
                published: record.status === SharedOpportunityStatus.PUBLISHED,
                message: becamePublished
                    ? 'Listing updated and published.'
                    : 'Listing updated.',
                listing: record,
            });
        } catch (error) {
            if (error instanceof ListingWriteError) {
                return respondWithWriteError(res, req, error);
            }
            next(error);
        }
    },
);

/**
 * GET /api/internal/mcp/jobs
 *
 * Browse the live FresherFlow listings — the read half of the surface. Without
 * it an agent could add jobs but never look one up or answer "what fresher roles
 * are open in Hyderabad?".
 *
 * Any authenticated identity may call it: reading live public listings is not a
 * privileged action. Validation and clamping happen here; the query and the
 * live-membership rule live in `application/opportunity/browseListings.ts`.
 */
const jobsQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    city: z.string().trim().max(80).optional(),
    company: z.string().trim().max(100).optional(),
    // The tool sends the canonical spellings; the aliases are accepted so a hand-typed
    // URL does not fail on "walkin".
    type: z.enum(['internship', 'walk-in', 'walkin', 'walkins', 'government', 'govt']).optional(),
    page: z.coerce.number().int().min(1).max(BROWSE_MAX_PAGE).default(1),
    limit: z.coerce.number().int().min(1).max(BROWSE_MAX_LIMIT).default(BROWSE_DEFAULT_LIMIT),
});

function normaliseListingType(raw?: string): BrowseListingType | undefined {
    switch (raw) {
        case 'internship':
            return 'internship';
        case 'walk-in':
        case 'walkin':
        case 'walkins':
            return 'walk-in';
        case 'government':
        case 'govt':
            return 'government';
        default:
            return undefined;
    }
}

router.get('/jobs', mcpReadLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = jobsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError('Invalid query parameters. page and limit are 1-50, and type is internship, walk-in or government.', 400);
        }
        const { q, city, company, type, page, limit } = parsed.data;

        const result = await browseLiveListings({
            ...(q ? { q } : {}),
            ...(city ? { city } : {}),
            ...(company ? { company } : {}),
            ...(type ? { type: normaliseListingType(type) } : {}),
            page,
            limit,
        });

        return res.json({
            ...result,
            filters: { q: q ?? null, city: city ?? null, company: company ?? null, type: type ?? null },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
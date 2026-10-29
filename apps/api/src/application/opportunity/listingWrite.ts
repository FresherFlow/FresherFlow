import prisma, { OpportunityStatus as DbOpportunityStatus } from '../../infrastructure/database/prisma';
import { Prisma } from '@fresherflow/database';
import { OpportunityStatus, type Opportunity } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl, normalizeSkills, sanitizeCustomSlug, resolveUniqueSlug, logger } from '@fresherflow/utils';
import { normalizeOpportunityLinks } from '../../utils/opportunityLinks';
import { handleOpportunityPublished } from '../../infrastructure/services/opportunity/publish.service';
import { invalidatePublicOpportunityCache } from '../../infrastructure/services/opportunity/publicOpportunityCache.service';
import { refreshFeedsAndAnnounce, scheduleDiscoveryFeedRefresh } from '../../infrastructure/services/opportunity/feedRefresh';
import { notifyWebFeedChanged } from '../../infrastructure/services/opportunity/webRevalidation.service';
import { adminCache } from '../../infrastructure/cache/adminCache';
import type { ExtendedAdminOpportunityData } from './listingPayload';
import {
    normalizeEducationRequirements, buildWalkInCreate,
    deriveOpportunityExpiryDate, buildGovernmentJobDetailsCreate, buildGovernmentJobDetailsUpsert,
    buildGovernmentTags, extractGovtLocations, resolveOpportunityDimensions,
    parseSourceKind, parseOrganizationId, parseInstitutionIds,
    buildCompensationCreates, buildEventDetailsCreate, buildEventDetailsUpsert,
    buildDriveDiscoveryColumns, normalizeWalkInDates, buildIdOrSlugWhere,
} from './listingPayload';

/**
 * The one place a full opportunity payload is written to the database.
 *
 * Every writer goes through here: the admin form (`routes/admin/opportunities`),
 * the draft ingester, and the internal MCP surface (`routes/internal/mcp`). The
 * rules below — duplicate detection, slug generation, education normalisation,
 * drive/government nested writes, expiry derivation, cache invalidation — used to
 * be copy-pasted per route, which is how the MCP path ended up unable to speak
 * the admin contract at all. Routes now only validate and map errors.
 *
 * This module deliberately knows nothing about HTTP. Failures that a caller must
 * surface with a specific status are thrown as `ListingWriteError`.
 */

/** Details always loaded back so callers can verify what was actually stored. */
export const LISTING_INCLUDE = {
    driveDetails: true,
    governmentJobDetails: true,
    eventDetails: true,
} as const;

const DB_STATUS_VALUES = new Set<string>(Object.values(DbOpportunityStatus));

export type ListingRecord = Prisma.OpportunityGetPayload<{ include: typeof LISTING_INCLUDE }>;

/**
 * A failure the caller is expected to surface with a fixed HTTP status rather
 * than let it bubble into the generic 500 handler.
 */
export class ListingWriteError extends Error {
    readonly status: number;
    readonly code: 'VALIDATION_FAILED' | 'NOT_FOUND' | 'CONFLICT';
    readonly details?: unknown;

    constructor(
        status: number,
        code: ListingWriteError['code'],
        message: string,
        details?: unknown,
    ) {
        super(message);
        this.name = 'ListingWriteError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export interface CreateListingOptions {
    /** Admin/user id recorded as the poster. Omitted for machine-created rows. */
    actorId?: string;
    /** `PUBLISHED` goes live immediately; `DRAFT` stages for moderator review. */
    status: 'PUBLISHED' | 'DRAFT';
    /**
     * `reject` returns 409 on a duplicate applyLink/sourceLink (admin form
     * behaviour). `update-existing` instead routes the write into an existing
     * DRAFT and refuses to overwrite anything already live, which is what makes
     * an agent's repeated submit idempotent instead of an error loop.
     */
    onDuplicate: 'reject' | 'update-existing';
}

export interface CreateListingResult {
    listing: ListingRecord;
    /** True when an existing DRAFT was updated instead of a new row created. */
    updatedExisting: boolean;
}

export interface UpdateListingResult {
    listing: ListingRecord;
    previousSlug: string | null;
    previousStatus: string | null;
    /** True when this write moved the row from a non-published state to live. */
    becamePublished: boolean;
}

function toDateOrUndefined(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * `applicationDetails` is a Prisma Json column, which cannot be set with a bare
 * `null` — Prisma requires the explicit `DbNull` sentinel. Omitting the key
 * leaves the column untouched; an explicit `null` clears it.
 */
function toJsonInput(
    value: unknown,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.DbNull;
    return value as Prisma.InputJsonValue;
}

/**
 * Cross-match applyLink/sourceLink in both directions. A listing is a duplicate
 * if either link of either row points at the other, regardless of which field
 * the incoming payload used.
 */
function buildDuplicateFilters(
    applyLink: string | null | undefined,
    sourceLink: string | null | undefined,
): Prisma.OpportunityWhereInput[] {
    return [
        applyLink ? { applyLink } : null,
        applyLink ? { sourceLink: applyLink } : null,
        sourceLink ? { sourceLink } : null,
        sourceLink ? { applyLink: sourceLink } : null,
    ].filter(Boolean) as Prisma.OpportunityWhereInput[];
}

async function findDuplicate(
    applyLink: string | null | undefined,
    sourceLink: string | null | undefined,
) {
    if (!applyLink && !sourceLink) return null;
    return prisma.opportunity.findFirst({
        where: { deletedAt: null, OR: buildDuplicateFilters(applyLink, sourceLink) },
        select: { id: true, slug: true, status: true, title: true },
    });
}

/**
 * Resolve the slug for a create. A custom slug or a government listing needs a
 * collision lookup; the default embeds a fresh id so it is unique by
 * construction and skips the query.
 */
async function resolveCreateSlug(
    data: ExtendedAdminOpportunityData,
    tempId: string,
    isGovt: boolean,
): Promise<string> {
    const custom = data.customSlug;
    if (custom) {
        const base = sanitizeCustomSlug(custom);
        const taken = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        return resolveUniqueSlug(base, new Set(taken.map((o) => o.slug)));
    }
    if (isGovt) {
        const base = generateSlug(data.title, data.company, undefined, { isGovt: true });
        const taken = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        return resolveUniqueSlug(base, new Set(taken.map((o) => o.slug)));
    }
    return generateSlug(data.title, data.company, tempId);
}

/**
 * The slug an update should move to, or `null` to leave the slug alone. Only a
 * changed title/company or an explicit custom slug justifies a new one — the
 * default path reuses the existing id so the slug stays stable across edits.
 */
async function resolveUpdateSlug(
    data: ExtendedAdminOpportunityData,
    existing: { id: string; slug: string | null; title: string; company: string },
    isGovt: boolean,
): Promise<string | null> {
    if (data.title === existing.title && data.company === existing.company && !data.customSlug) {
        return null;
    }
    if (data.customSlug) {
        const base = sanitizeCustomSlug(data.customSlug);
        const taken = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base }, id: { not: existing.id } },
            select: { slug: true },
        });
        return resolveUniqueSlug(base, new Set(taken.map((o) => o.slug)));
    }
    if (isGovt) {
        const base = generateSlug(data.title, data.company, undefined, { isGovt: true });
        const taken = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base }, id: { not: existing.id } },
            select: { slug: true },
        });
        return resolveUniqueSlug(base, new Set(taken.map((o) => o.slug)));
    }
    return generateSlug(data.title, data.company, existing.id);
}

async function resolveContributorId(rawOpportunityId: unknown): Promise<string | undefined> {
    if (typeof rawOpportunityId !== 'string' || !rawOpportunityId.trim()) return undefined;
    const raw = await prisma.rawOpportunity.findUnique({
        where: { id: rawOpportunityId },
        select: { createdByUserId: true },
    });
    return raw?.createdByUserId ?? undefined;
}

/**
 * Create a listing from a full admin payload.
 *
 * Idempotent by design: with `onDuplicate: 'update-existing'` a repeated submit
 * of the same job URL updates the pending draft instead of failing, and a URL
 * that already resolves to a PUBLISHED listing returns 409 so a live row is
 * never silently overwritten.
 */
export async function createListing(
    data: ExtendedAdminOpportunityData,
    options: CreateListingOptions,
): Promise<CreateListingResult> {
    const { category, recruitmentMethod, employmentTypes, isWalkIn, isGovt } =
        resolveOpportunityDimensions(data);

    const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
    if (!isWalkIn && !applyLink) {
        throw new ListingWriteError(
            400,
            'VALIDATION_FAILED',
            'At least one sourceLink or applyLink is required',
        );
    }

    const duplicate = await findDuplicate(applyLink, sourceLink);
    if (duplicate) {
        if (options.onDuplicate === 'reject') {
            throw new ListingWriteError(409, 'CONFLICT', 'Duplicate listing detected by applyLink', duplicate);
        }
        if (duplicate.status !== DbOpportunityStatus.DRAFT) {
            // Already live. Refusing here is the whole point of the policy: an
            // agent re-running its workflow must not rewrite a published post.
            throw new ListingWriteError(
                409,
                'CONFLICT',
                `A listing for this URL is already published (id ${duplicate.id}, slug ${duplicate.slug}). Use update_listing to change it.`,
                duplicate,
            );
        }
        const updated = await updateListing(
            duplicate.id,
            data,
            options.status === 'PUBLISHED' ? OpportunityStatus.PUBLISHED : OpportunityStatus.DRAFT,
        );
        return { listing: updated.listing, updatedExisting: true };
    }

    const walkInCreate = isWalkIn && data.driveDetails ? buildWalkInCreate(data) : undefined;
    const governmentJobCreate = buildGovernmentJobDetailsCreate(data);
    const eventDetailsCreate = buildEventDetailsCreate(data.eventDetails);
    const compensationCreates = buildCompensationCreates(data.compensations);
    const institutionIds = parseInstitutionIds(data.institutionIds);
    const sourceKind = parseSourceKind(data.sourceKind);
    const organizationId = parseOrganizationId(data.organizationId);

    const tempId = crypto.randomUUID();
    const slug = await resolveCreateSlug(data, tempId, isGovt);
    const govtDetails = data.governmentJobDetails;
    const education = normalizeEducationRequirements(data, govtDetails ?? undefined);
    const locations = isGovt
        ? extractGovtLocations(govtDetails ?? undefined, data.locations ?? [])
        : (data.locations ?? []);
    const contributorId = await resolveContributorId(data.rawOpportunityId);

    const listing = await prisma.$transaction(async (tx) => {
        const created = await tx.opportunity.create({
            data: {
                id: tempId, slug, category, recruitmentMethod,
                title: data.title, company: data.company,
                companyWebsite: data.companyWebsite,
                companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
                description: data.description,
                allowedDegrees: education.allowedDegrees,
                allowedCourses: education.allowedCourses,
                allowedSpecializations: education.allowedSpecializations,
                allowedPassoutYears: data.allowedPassoutYears,
                requiredSkills: normalizeSkills(data.requiredSkills),
                locations, workMode: data.workMode,
                salaryRange: data.salaryRange, stipend: data.stipend,
                employmentTypes,
                salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                incentives: data.incentives, jobFunction: data.jobFunction,
                selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                tags: buildGovernmentTags(data),
                sourceLink, applyLink,
                applicationDetails: toJsonInput(data.applicationDetails),
                applicationDeadline: toDateOrUndefined(data.applicationDeadline),
                registrationDeadline: toDateOrUndefined(data.registrationDeadline),
                startsAt: toDateOrUndefined(data.startsAt),
                endsAt: toDateOrUndefined(data.endsAt),
                ...(sourceKind && { sourceKind }),
                ...(organizationId && { organizationId }),
                expiresAt: deriveOpportunityExpiryDate(data, recruitmentMethod),
                ...(contributorId || options.actorId
                    ? { postedByUserId: contributorId || (options.actorId as string) }
                    : {}),
                status: options.status as unknown as DbOpportunityStatus,
                ...(walkInCreate && {
                    driveDetails: walkInCreate,
                    ...buildDriveDiscoveryColumns(data.driveDetails, walkInCreate.create.dates),
                }),
                ...(governmentJobCreate && { governmentJobDetails: governmentJobCreate }),
                ...(eventDetailsCreate && { eventDetails: eventDetailsCreate }),
                ...(compensationCreates && { compensations: { create: compensationCreates } }),
                ...(institutionIds.length > 0 && {
                    institutions: {
                        create: institutionIds.map((institutionId) => ({
                            institutionId,
                            targeting: isWalkIn ? 'TARGETED' : 'ELIGIBLE',
                        })),
                    },
                }),
            },
            include: LISTING_INCLUDE,
        });

        if (data.rawOpportunityId) {
            await tx.rawOpportunity.update({
                where: { id: String(data.rawOpportunityId) },
                data: {
                    status: 'DRAFT_CREATED',
                    mappedOpportunityId: created.id as string,
                },
            });
        }

        return created as ListingRecord;
    });

    if (options.status === 'PUBLISHED') {
        await handleOpportunityPublished(listing as unknown as Opportunity, { isNew: true });
    }
    adminCache.invalidateLists();

    return { listing, updatedExisting: false };
}

/**
 * Apply a full admin payload to an existing listing. `idOrSlug` accepts either,
 * matching the admin route's addressing.
 *
 * This is a full replace, not a merge: `opportunitySchema` is a closed object
 * and callers are expected to send the complete listing. That matches how the
 * admin form behaves and keeps "what will it store" predictable.
 */
export async function updateListing(
    idOrSlug: string,
    data: ExtendedAdminOpportunityData,
    status?: OpportunityStatus,
): Promise<UpdateListingResult> {
    const existing = await prisma.opportunity.findFirst({
        where: buildIdOrSlugWhere(idOrSlug),
        include: { governmentJobDetails: true, driveDetails: true },
    });
    if (!existing) {
        throw new ListingWriteError(404, 'NOT_FOUND', 'Opportunity not found');
    }

    const nextStatus = status ?? data.status;
    if (nextStatus && !DB_STATUS_VALUES.has(nextStatus)) {
        // `opportunitySchema` is bound to the shared OpportunityStatus enum, which
        // includes EXPIRED; Prisma's enum does not. Catching it here turns what
        // would be a 500 into an actionable 400.
        throw new ListingWriteError(
            400,
            'VALIDATION_FAILED',
            `status must be one of: ${[...DB_STATUS_VALUES].join(', ')}`,
        );
    }

    const { category, recruitmentMethod, employmentTypes, isWalkIn, isGovt } =
        resolveOpportunityDimensions(data);

    const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
    if (!isWalkIn && !applyLink) {
        throw new ListingWriteError(
            400,
            'VALIDATION_FAILED',
            'At least one sourceLink or applyLink is required',
        );
    }

    const walkInCreate = isWalkIn && data.driveDetails ? buildWalkInCreate(data) : undefined;
    const governmentJobUpdate = data.governmentJobDetails === null
        ? undefined
        : buildGovernmentJobDetailsUpsert(data);
    const eventDetailsUpdate = data.eventDetails === null
        ? undefined
        : buildEventDetailsUpsert(data.eventDetails);
    const sourceKind = parseSourceKind(data.sourceKind);
    const organizationId = parseOrganizationId(data.organizationId);
    const institutionIds = data.institutionIds !== undefined
        ? parseInstitutionIds(data.institutionIds)
        : undefined;

    const govtDetails = data.governmentJobDetails;
    const education = normalizeEducationRequirements(data, govtDetails ?? undefined);
    const locations = isGovt
        ? extractGovtLocations(govtDetails ?? undefined, data.locations ?? [])
        : (data.locations ?? []);

    const updateData: Prisma.OpportunityUpdateInput = {
        ...education, category, recruitmentMethod,
        ...(nextStatus ? { status: nextStatus as unknown as DbOpportunityStatus } : {}),
        title: data.title, company: data.company,
        companyWebsite: data.companyWebsite,
        companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
        description: data.description,
        allowedPassoutYears: data.allowedPassoutYears,
        requiredSkills: normalizeSkills(data.requiredSkills),
        locations, workMode: data.workMode,
        salaryMin: data.salaryMin, salaryMax: data.salaryMax,
        salaryPeriod: data.salaryPeriod, incentives: data.incentives,
        jobFunction: data.jobFunction, selectionProcess: data.selectionProcess,
        notesHighlights: data.notesHighlights,
        experienceMin: data.experienceMin, experienceMax: data.experienceMax,
        salaryRange: data.salaryRange, stipend: data.stipend,
        tags: buildGovernmentTags(data),
        employmentTypes, sourceLink, applyLink,
        applicationDetails: toJsonInput(data.applicationDetails),
        applicationDeadline: toDateOrUndefined(data.applicationDeadline),
        registrationDeadline: toDateOrUndefined(data.registrationDeadline),
        startsAt: toDateOrUndefined(data.startsAt),
        endsAt: toDateOrUndefined(data.endsAt),
        ...(sourceKind && { sourceKind }),
        ...(organizationId && { organizationId }),
        expiresAt: deriveOpportunityExpiryDate(data, recruitmentMethod),
        lastVerified: new Date(),
        ...(nextStatus === OpportunityStatus.PUBLISHED ? { expiredAt: null, deletedAt: null } : {}),
        ...(isWalkIn && walkInCreate && {
            driveDetails: { upsert: { create: walkInCreate.create, update: walkInCreate.create } },
            // Editing a drive's dates or city has to move the denormalised
            // discovery columns too, or "drives this week" keeps returning the
            // old date.
            ...buildDriveDiscoveryColumns(data.driveDetails, normalizeWalkInDates(data)),
        }),
        ...(governmentJobUpdate && { governmentJobDetails: governmentJobUpdate }),
        ...(eventDetailsUpdate && { eventDetails: eventDetailsUpdate }),
    };

    const nextSlug = await resolveUpdateSlug(data, {
        id: existing.id as string,
        slug: existing.slug,
        title: existing.title,
        company: existing.company,
    }, isGovt);
    if (nextSlug) updateData.slug = nextSlug;

    // Multi-table write (stale 1-to-1 detail rows + opportunity + raw link-back)
    // stays atomic so a crash cannot leave half-deleted detail rows or an
    // unlinked raw submission. Network side-effects run after the transaction.
    const listing = await prisma.$transaction(async (tx) => {
        // Delete-then-upsert rather than nested upsert so a row that no longer
        // applies (drive dropped, category changed) cannot trip Prisma P2025.
        if (!isWalkIn) {
            await tx.driveDetails.deleteMany({ where: { opportunityId: existing.id } });
        }
        if (data.governmentJobDetails === null) {
            await tx.governmentJobDetails.deleteMany({ where: { opportunityId: existing.id } });
        }
        if (data.eventDetails === null) {
            await tx.eventDetails.deleteMany({ where: { opportunityId: existing.id } });
        }
        if (institutionIds !== undefined) {
            await tx.opportunityInstitution.deleteMany({ where: { opportunityId: existing.id } });
            if (institutionIds.length > 0) {
                await tx.opportunityInstitution.createMany({
                    data: institutionIds.map((institutionId) => ({
                        opportunityId: existing.id as string,
                        institutionId,
                        targeting: isWalkIn ? 'TARGETED' : 'ELIGIBLE',
                    })),
                });
            }
        }

        const updated = await tx.opportunity.update({
            where: { id: existing.id as string },
            data: updateData,
            include: LISTING_INCLUDE,
        });

        if (data.rawOpportunityId) {
            await tx.rawOpportunity.update({
                where: { id: String(data.rawOpportunityId) },
                data: {
                    status: 'DRAFT_CREATED',
                    mappedOpportunityId: updated.id as string,
                },
            });
        }

        return updated as ListingRecord;
    });

    const previousStatus = existing.status as string | null;
    const becamePublished =
        nextStatus === OpportunityStatus.PUBLISHED && previousStatus !== OpportunityStatus.PUBLISHED;
    // A published listing edited back to DRAFT/ARCHIVED is a removal from the
    // live set. Without this the feed kept listing it and its `jobs/<id>.json`
    // shard stayed on the CDN, so a "draft" was still reachable at /jobs/<slug>
    // until somebody pressed "Regenerate all".
    const leftLiveSet =
        previousStatus === OpportunityStatus.PUBLISHED
        && listing.status !== OpportunityStatus.PUBLISHED;

    if (becamePublished) {
        await handleOpportunityPublished(listing as unknown as Opportunity, { isNew: true });
    } else if (listing.status === OpportunityStatus.PUBLISHED) {
        const { getGranularTagsForOpportunity } = await import(
            '../../infrastructure/services/opportunity/publish.service'
        );
        void invalidatePublicOpportunityCache({
            idsOrSlugs: [
                listing.id as string,
                listing.slug as string,
                ...(existing.slug !== listing.slug ? [existing.slug as string] : []),
            ],
            purgeFeed: true,
            type: listing.category as string,
            tags: getGranularTagsForOpportunity(listing as unknown as Partial<Opportunity>),
        });

        // An edit of a live listing changes what the hub pages show, so it
        // needs the same two steps a publish does: the feed files have to be
        // rebuilt, and the web app has to be told that its cached copies of
        // them are stale. Invalidating the cache above only clears copies of
        // a feed that still describes the OLD listing, which is why an edited
        // job used to stay invisible on /jobs until an operator pressed
        // "Refresh cache".
        //
        // The announcement is chained onto the rebuild: a tag bust only makes
        // Next re-read the SAME CDN URL, so the web has to be told AFTER the
        // new snapshot exists.
        void Promise.resolve(scheduleDiscoveryFeedRefresh())
            .then(() => notifyWebFeedChanged('listing-edit'))
            .catch((err) => {
                logger.error('[listingWrite] Web feed revalidation announcement failed', {
                    opportunityId: listing.id as string,
                    error: err instanceof Error ? err.message : String(err),
                });
            });

        // Per-job shard upload (atomic ~2.5KB object) — keeps /jobs/[slug]
        // resolvable from the CDN edge without falling back to the full
        // bootstrap feed. Same pattern as the publish path.
        void import('../../infrastructure/services/opportunity/staticFeed.service')
            .then(({ StaticFeedService }) =>
                StaticFeedService.uploadSingleJob(listing as unknown as Record<string, unknown>)
            )
            .catch((err) => {
                logger.error('[listingWrite] Job shard upload failed', {
                    opportunityId: listing.id as string,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
    } else if (leftLiveSet) {
        void invalidatePublicOpportunityCache({
            idsOrSlugs: [
                listing.id as string,
                listing.slug as string,
                ...(existing.slug !== listing.slug ? [existing.slug as string] : []),
            ],
            purgeFeed: true,
            type: listing.category as string,
            tags: [],
        });

        // The rebuild drops the listing from every feed and its collect step
        // deletes the now-orphaned shard; the announcement then makes the
        // web re-read the new snapshot.
        void refreshFeedsAndAnnounce('listing-unpublish');
    }

    adminCache.invalidate(existing.id as string);
    if (existing.slug) adminCache.invalidate(existing.slug);
    adminCache.invalidateLists();

    return {
        listing,
        previousSlug: existing.slug,
        previousStatus,
        becamePublished,
    };
}

/** Read one listing back with its detail rows, for verification. */
export async function getListing(idOrSlug: string): Promise<ListingRecord> {
    const listing = await prisma.opportunity.findFirst({
        where: buildIdOrSlugWhere(idOrSlug),
        include: LISTING_INCLUDE,
    });
    if (!listing) {
        throw new ListingWriteError(404, 'NOT_FOUND', 'Opportunity not found');
    }
    return listing as ListingRecord;
}
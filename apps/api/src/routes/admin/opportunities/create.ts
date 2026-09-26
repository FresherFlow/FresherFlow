import { Router, Request, Response, NextFunction } from 'express';
import prisma, { OpportunityStatus as DbOpportunityStatus } from '../../../infrastructure/database/prisma';
import { OpportunityStatus } from '@fresherflow/types';
import { Prisma } from '@fresherflow/database';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { validate } from '../../../middleware/validate';
import { opportunitySchema } from '../../../utils/validation';
import { requirePermission } from '../../../middleware/auth';
import { generateSlug, generateCompanyLogoUrl, normalizeSkills, sanitizeCustomSlug, resolveUniqueSlug } from '@fresherflow/utils';
import { normalizeOpportunityLinks } from '../../../utils/opportunityLinks';
import {
    normalizeEducationRequirements, buildWalkInCreate,
    deriveOpportunityExpiryDate, buildGovernmentJobDetailsCreate, buildGovernmentJobDetailsUpsert,
    buildGovernmentTags, extractGovtLocations, resolveOpportunityDimensions,
    parseSourceKind, parseOrganizationId, parseInstitutionIds,
    buildCompensationCreates, buildEventDetailsCreate, buildEventDetailsUpsert,
} from './_helpers';
import { handleOpportunityPublished } from '../../../infrastructure/services/opportunity/publish.service';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/opportunity/publicOpportunityCache.service';

import { Opportunity } from '@fresherflow/types';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * Status transitions need the permission of the destination state, mirroring
 * lifecycle.ts: publishing needs opportunity.publish, expiring/archiving
 * needs opportunity.archive, anything else needs opportunity.edit.
 */
function requireStatusPermission() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const status = typeof req.body?.status === 'string' ? req.body.status : '';
        const key = status === 'PUBLISHED'
            ? 'opportunity.publish'
            : status === 'EXPIRED' || status === 'ARCHIVED'
                ? 'opportunity.archive'
                : 'opportunity.edit';
        return requirePermission(key)(req, res, next);
    };
}

/**
 * POST /api/admin/opportunities
 * Create and immediately publish an opportunity.
 */
router.post(
    '/',
    requirePermission('opportunity.create'),
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            // Resolve the independent dimensions from the admin form once, up front.
            // Legacy `category` values (job / internship / walk-in) map onto the
            // split model: walk-in becomes a recruitment method, internship an
            // employment type, everything else an OpportunityCategory.
            const resolved = resolveOpportunityDimensions(data);
            const { category, recruitmentMethod, employmentTypes, isWalkIn, isGovt } = resolved;

            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (!isWalkIn && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            // Duplicate protection (same rule as ingest-draft): the immediate-
            // publish path previously skipped this, so double-submits created
            // two live rows with the same applyLink.
            if (applyLink || sourceLink) {
                const duplicateFilters = [
                    applyLink ? { applyLink } : null,
                    applyLink ? { sourceLink: applyLink } : null,
                    sourceLink ? { sourceLink } : null,
                    sourceLink ? { applyLink: sourceLink } : null,
                ].filter(Boolean) as Prisma.OpportunityWhereInput[];

                const existing = await prisma.opportunity.findFirst({
                    where: { deletedAt: null, OR: duplicateFilters },
                    select: { id: true, slug: true, status: true, title: true },
                });
                if (existing) {
                    return res.status(409).json({ message: 'Duplicate listing detected by applyLink', duplicate: existing });
                }
            }

            const walkInCreate = isWalkIn && data.driveDetails
                ? buildWalkInCreate(data)
                : undefined;
            const governmentJobCreate = buildGovernmentJobDetailsCreate(data);
            const eventDetailsCreate = buildEventDetailsCreate(data.eventDetails);
            const compensationCreates = buildCompensationCreates(data.compensations);
            const institutionIds = parseInstitutionIds(data.institutionIds);
            const sourceKind = parseSourceKind(data.sourceKind);
            const organizationId = parseOrganizationId(data.organizationId);
            const toDateOrUndefined = (v: unknown): Date | undefined => {
                if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
                if (typeof v !== 'string' || !v.trim()) return undefined;
                const parsed = new Date(v.trim());
                return Number.isNaN(parsed.getTime()) ? undefined : parsed;
            };

            const tempId = crypto.randomUUID();
            let slug: string;
            if (data.customSlug) {
                const base = sanitizeCustomSlug(data.customSlug);
                const slugMatches = await prisma.opportunity.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
                slug = resolveUniqueSlug(base, new Set(slugMatches.map(o => o.slug)));
            } else if (isGovt) {
                const base = generateSlug(data.title, data.company, undefined, { isGovt: true });
                const slugMatches = await prisma.opportunity.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
                slug = resolveUniqueSlug(base, new Set(slugMatches.map(o => o.slug)));
            } else {
                slug = generateSlug(data.title, data.company, tempId);
            }
            const govtDetails = data.governmentJobDetails;
            const education = normalizeEducationRequirements(data, govtDetails ?? undefined);
            const locations = isGovt
                ? extractGovtLocations(govtDetails ?? undefined, data.locations ?? [])
                : (data.locations ?? []);

            let contributorId: string | undefined = undefined;
            if (data.rawOpportunityId) {
                const rawOpp = await prisma.rawOpportunity.findUnique({
                    where: { id: data.rawOpportunityId as string },
                    select: { createdByUserId: true }
                });
                if (rawOpp?.createdByUserId) {
                    contributorId = rawOpp.createdByUserId;
                }
            }

            const opportunity = await prisma.$transaction(async (tx) => {
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
                        locations: locations, workMode: data.workMode,
                        salaryRange: data.salaryRange, stipend: data.stipend,
                        employmentTypes,
                        salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                        salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                        incentives: data.incentives, jobFunction: data.jobFunction,
                        selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                        experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                        tags: buildGovernmentTags(data),
                        sourceLink, applyLink,
                        applicationDetails: data.applicationDetails,
                        applicationDeadline: toDateOrUndefined(data.applicationDeadline),
                        registrationDeadline: toDateOrUndefined(data.registrationDeadline),
                        startsAt: toDateOrUndefined(data.startsAt),
                        endsAt: toDateOrUndefined(data.endsAt),
                        ...(sourceKind && { sourceKind }),
                        ...(organizationId && { organizationId }),
                        expiresAt: deriveOpportunityExpiryDate(data, recruitmentMethod),
                        postedByUserId: contributorId || (req.adminId as string),
                        status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
                        ...(walkInCreate && { driveDetails: walkInCreate }),
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
                    include: { driveDetails: true, governmentJobDetails: true, eventDetails: true },
                });

                // If linked to a raw opportunity submission, update it
                if (data.rawOpportunityId) {
                    await tx.rawOpportunity.update({
                        where: { id: data.rawOpportunityId as string },
                        data: {
                            status: 'DRAFT_CREATED',
                            mappedOpportunityId: created.id as string
                        }
                    });
                }

                return created;
            });

            await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });

            // Clear cache on write
            adminCache.invalidateLists();

            res.status(201).json({ opportunity, message: 'Opportunity created successfully.' });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * POST /api/admin/opportunities/ingest-draft
 * Automation-safe entrypoint — always creates DRAFT for admin review.
 */
router.post(
    '/ingest-draft',
    requirePermission('opportunity.create'),
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            const { category, recruitmentMethod, employmentTypes, isWalkIn, isGovt } =
                resolveOpportunityDimensions(data);

            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (!isWalkIn && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            // Lightweight de-duplication
            if (applyLink || sourceLink) {
                const duplicateFilters = [
                    applyLink ? { applyLink } : null,
                    applyLink ? { sourceLink: applyLink } : null,
                    sourceLink ? { sourceLink } : null,
                    sourceLink ? { applyLink: sourceLink } : null,
                ].filter(Boolean) as Prisma.OpportunityWhereInput[];

                const existing = await prisma.opportunity.findFirst({
                    where: { deletedAt: null, OR: duplicateFilters },
                    select: { id: true, slug: true, status: true, title: true },
                });
                if (existing) {
                    return res.status(409).json({ message: 'Duplicate listing detected by applyLink', duplicate: existing });
                }
            }

            const walkInCreate = isWalkIn && data.driveDetails
                ? buildWalkInCreate(data)
                : undefined;
            const governmentJobCreate = buildGovernmentJobDetailsCreate(data);
            const eventDetailsCreate = buildEventDetailsCreate(data.eventDetails);
            const compensationCreates = buildCompensationCreates(data.compensations);
            const institutionIds = parseInstitutionIds(data.institutionIds);
            const sourceKind = parseSourceKind(data.sourceKind);
            const organizationId = parseOrganizationId(data.organizationId);
            const toDateOrUndefined = (v: unknown): Date | undefined => {
                if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
                if (typeof v !== 'string' || !v.trim()) return undefined;
                const parsed = new Date(v.trim());
                return Number.isNaN(parsed.getTime()) ? undefined : parsed;
            };

            const tempId = crypto.randomUUID();
            let slug: string;
            if (data.customSlug) {
                const base = sanitizeCustomSlug(data.customSlug);
                const existing = await prisma.opportunity.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
                slug = resolveUniqueSlug(base, new Set(existing.map(o => o.slug)));
            } else if (isGovt) {
                const base = generateSlug(data.title, data.company, undefined, { isGovt: true });
                const existing = await prisma.opportunity.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
                slug = resolveUniqueSlug(base, new Set(existing.map(o => o.slug)));
            } else {
                slug = generateSlug(data.title, data.company, tempId);
            }
            const govtDetails = data.governmentJobDetails;
            const education = normalizeEducationRequirements(data, govtDetails ?? undefined);
            const locations = isGovt
                ? extractGovtLocations(govtDetails ?? undefined, data.locations ?? [])
                : (data.locations ?? []);

            let contributorId: string | undefined = undefined;
            if (data.rawOpportunityId) {
                const rawOpp = await prisma.rawOpportunity.findUnique({
                    where: { id: data.rawOpportunityId as string },
                    select: { createdByUserId: true }
                });
                if (rawOpp?.createdByUserId) {
                    contributorId = rawOpp.createdByUserId;
                }
            }

            const opportunity = await prisma.$transaction(async (tx) => {
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
                        locations: locations, workMode: data.workMode,
                        salaryRange: data.salaryRange, stipend: data.stipend,
                        employmentTypes,
                        salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                        salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                        incentives: data.incentives, jobFunction: data.jobFunction,
                        selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                        experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                        tags: buildGovernmentTags(data),
                        sourceLink, applyLink,
                        applicationDetails: data.applicationDetails,
                        applicationDeadline: toDateOrUndefined(data.applicationDeadline),
                        registrationDeadline: toDateOrUndefined(data.registrationDeadline),
                        startsAt: toDateOrUndefined(data.startsAt),
                        endsAt: toDateOrUndefined(data.endsAt),
                        ...(sourceKind && { sourceKind }),
                        ...(organizationId && { organizationId }),
                        expiresAt: deriveOpportunityExpiryDate(data, recruitmentMethod),
                        postedByUserId: contributorId || (req.adminId as string),
                        status: OpportunityStatus.DRAFT as unknown as DbOpportunityStatus,
                        ...(walkInCreate && { driveDetails: walkInCreate }),
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
                    include: { driveDetails: true, governmentJobDetails: true, eventDetails: true },
                });

                // If linked to a raw opportunity submission, update it
                if (data.rawOpportunityId) {
                    await tx.rawOpportunity.update({
                        where: { id: data.rawOpportunityId as string },
                        data: {
                            status: 'DRAFT_CREATED',
                            mappedOpportunityId: created.id as string
                        }
                    });
                }

                return created;
            });

            // Drafts only notify admin privately, no broadcast/alerts/social
            // But we might want a "draft created" internal notification if we had one.
            // Keeping it simple for now as it was.

            adminCache.invalidateLists();

            res.status(201).json({ opportunity, message: 'Draft ingested successfully. Review and publish from admin.' });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * PUT /api/admin/opportunities/:id
 */
router.put(
    '/:id',
    requirePermission('opportunity.edit'),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            const data = req.body;

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
                include: { governmentJobDetails: true, driveDetails: true },
            });
            if (!existing) return res.status(404).json({ message: 'Opportunity not found' });

            const { category, recruitmentMethod, employmentTypes, isWalkIn, isGovt } = resolveOpportunityDimensions(data);

            const walkInUpdate = isWalkIn && data.driveDetails
                ? { upsert: (() => { const b = buildWalkInCreate(data); return b ? { create: b.create, update: b.create } : undefined; })() }
                : undefined;
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
            const toDateOrUndefined = (v: unknown): Date | undefined => {
                if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
                if (typeof v !== 'string' || !v.trim()) return undefined;
                const parsed = new Date(v.trim());
                return Number.isNaN(parsed.getTime()) ? undefined : parsed;
            };

            const govtDetailsUpdate = data.governmentJobDetails;
            const education = normalizeEducationRequirements(data, govtDetailsUpdate ?? undefined);
            const locations = isGovt
                ? extractGovtLocations(govtDetailsUpdate ?? undefined, data.locations ?? [])
                : (data.locations ?? []);
            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (!isWalkIn && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            const updateData: Prisma.OpportunityUpdateInput = {
                ...education, category, recruitmentMethod, status: data.status as unknown as DbOpportunityStatus,
                title: data.title, company: data.company,
                companyWebsite: data.companyWebsite,
                companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
                description: data.description,
                allowedPassoutYears: data.allowedPassoutYears,
                requiredSkills: normalizeSkills(data.requiredSkills),
                locations: locations, workMode: data.workMode,
                salaryMin: data.salaryMin, salaryMax: data.salaryMax,
                salaryPeriod: data.salaryPeriod, incentives: data.incentives,
                jobFunction: data.jobFunction, selectionProcess: data.selectionProcess,
                notesHighlights: data.notesHighlights,
                experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                salaryRange: data.salaryRange, stipend: data.stipend,
                tags: buildGovernmentTags(data),
                employmentTypes, sourceLink, applyLink,
                applicationDetails: data.applicationDetails,
                applicationDeadline: toDateOrUndefined(data.applicationDeadline),
                registrationDeadline: toDateOrUndefined(data.registrationDeadline),
                startsAt: toDateOrUndefined(data.startsAt),
                endsAt: toDateOrUndefined(data.endsAt),
                ...(sourceKind && { sourceKind }),
                ...(organizationId && { organizationId }),
                expiresAt: deriveOpportunityExpiryDate(data, recruitmentMethod),
                lastVerified: new Date(),
                ...(data.status === OpportunityStatus.PUBLISHED ? { expiredAt: null, deletedAt: null } : {}),
                ...(isWalkIn && walkInUpdate && { driveDetails: walkInUpdate }),
                ...(governmentJobUpdate && { governmentJobDetails: governmentJobUpdate }),
                ...(eventDetailsUpdate && { eventDetails: eventDetailsUpdate }),
            };

            if (data.title !== existing.title || data.company !== existing.company || data.customSlug) {
                                if (data.customSlug) {
                    const base = sanitizeCustomSlug(data.customSlug);
                    const others = await prisma.opportunity.findMany({ where: { slug: { startsWith: base }, id: { not: existing.id as string } }, select: { slug: true } });
                    updateData.slug = resolveUniqueSlug(base, new Set(others.map(o => o.slug)));
                } else if (isGovt) {
                    const base = generateSlug(data.title as string, data.company as string, undefined, { isGovt: true });
                    const others = await prisma.opportunity.findMany({ where: { slug: { startsWith: base }, id: { not: existing.id as string } }, select: { slug: true } });
                    updateData.slug = resolveUniqueSlug(base, new Set(others.map(o => o.slug)));
                } else {
                    updateData.slug = generateSlug(data.title as string, data.company as string, existing.id as string);
                }
            }

            // Multi-table write (stale 1-to-1 detail rows + opportunity +
            // raw link-back) stays atomic so a crash cannot leave half-deleted
            // detail rows or an unlinked raw submission. Network side-effects
            // (publish pipeline, cache purge) run after the transaction.
            const opportunity = await prisma.$transaction(async (tx) => {
                // Safe deletions of related 1-to-1 records to prevent strict Prisma P2025 nested delete crashes
                if (!isWalkIn) {
                    await tx.driveDetails.deleteMany({ where: { opportunityId: existing.id } });
                }
                if (data.governmentJobDetails === null) {
                    await tx.governmentJobDetails.deleteMany({ where: { opportunityId: existing.id } });
                }
                if (data.eventDetails === null) {
                    await tx.eventDetails.deleteMany({ where: { opportunityId: existing.id } });
                }
                // Institution targeting is a join table: replace the set when
                // the admin sends an explicit list (empty array clears it).
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
                    include: { driveDetails: true, governmentJobDetails: true, eventDetails: true },
                });

                // If linked to a raw opportunity submission, update it
                if (data.rawOpportunityId) {
                    await tx.rawOpportunity.update({
                        where: { id: data.rawOpportunityId as string },
                        data: {
                            status: 'DRAFT_CREATED',
                            mappedOpportunityId: updated.id as string
                        }
                    });
                }

                return updated;
            });

            let responseMessage = 'Opportunity updated successfully';
            if (existing.status !== OpportunityStatus.PUBLISHED && opportunity.status === OpportunityStatus.PUBLISHED) {
                // Transitioning from draft → published: fire full side-effects (Telegram, alerts, OG image)
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });
                responseMessage = 'Opportunity published successfully.';
            } else if (opportunity.status === OpportunityStatus.PUBLISHED) {
                const { getGranularTagsForOpportunity } = await import('../../../infrastructure/services/opportunity/publish.service');
                void invalidatePublicOpportunityCache({
                    idsOrSlugs: [opportunity.id as string, opportunity.slug as string, ...(existing.slug !== opportunity.slug ? [existing.slug as string] : [])],
                    purgeFeed: true,
                    type: opportunity.category as string,
                    tags: getGranularTagsForOpportunity(opportunity as unknown as Partial<Opportunity>),
                });
                // StaticFeedService.scheduleRefresh(); // Commented out — use Generate JSON button instead
            }

            // Invalidate specific detail and all lists
            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            res.json({ opportunity, message: responseMessage });
        } catch (error) {
            next(error);
        }
    },
);


/**
 * PATCH /api/admin/opportunities/:id/status
 * Lightweight status-only update (used by quick Publish / quick Expire buttons).
 * Does NOT require the full opportunitySchema — just { status }.
 */
router.patch(
    '/:id/status',
    requireStatusPermission(),
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            const { status } = req.body as { status: string };

            if (!status) return res.status(400).json({ message: 'status is required' });

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
            });
            if (!existing) return res.status(404).json({ message: 'Opportunity not found' });

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: {
                    status: status as unknown as DbOpportunityStatus,
                    ...(status === OpportunityStatus.PUBLISHED ? { expiredAt: null, expiresAt: null, deletedAt: null, deletionReason: null } : {}),
                },
                include: { driveDetails: true, governmentJobDetails: true },
            });

            // Fire publish pipeline if transitioning to PUBLISHED
            if (existing.status !== OpportunityStatus.PUBLISHED && status === OpportunityStatus.PUBLISHED) {
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });
            }

            adminCache.invalidate(existing.id as string);
            if (existing.slug) adminCache.invalidate(existing.slug as string);
            adminCache.invalidateLists();

            res.json({ opportunity, message: `Status updated to ${status}` });
        } catch (error) {
            next(error);
        }
    },
);

export default router;

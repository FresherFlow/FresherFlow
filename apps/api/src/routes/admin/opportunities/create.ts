import { Router, Request, Response, NextFunction } from 'express';
import prisma, { OpportunityStatus as DbOpportunityStatus, OpportunityType as DbOpportunityType } from '../../../infrastructure/database/prisma';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { Prisma } from '@fresherflow/database';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { validate } from '../../../middleware/validate';
import { opportunitySchema } from '../../../utils/validation';
import { generateSlug, generateCompanyLogoUrl, normalizeSkills, sanitizeCustomSlug, resolveUniqueSlug } from '@fresherflow/utils';
import { normalizeOpportunityLinks } from '../../../utils/opportunityLinks';
import {
    normalizeEducationRequirements, buildWalkInCreate,
    deriveOpportunityExpiryDate, buildGovernmentJobDetailsCreate, buildGovernmentJobDetailsUpsert,
    buildGovernmentTags, extractGovtLocations,
} from './_helpers';
import { handleOpportunityPublished } from '../../../infrastructure/services/publish.service';
import { Opportunity } from '@fresherflow/types';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * POST /api/admin/opportunities
 * Create and immediately publish an opportunity.
 */
router.post(
    '/',
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            let type: OpportunityType = data.type;
            if (data.category) {
                const map: Record<string, OpportunityType> = {
                    job: OpportunityType.JOB,
                    internship: OpportunityType.INTERNSHIP,
                    'walk-in': OpportunityType.WALKIN,
                };
                type = map[data.category] || OpportunityType.JOB;
            }

            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (type !== OpportunityType.WALKIN && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            const walkInCreate = type === OpportunityType.WALKIN && data.walkInDetails
                ? buildWalkInCreate(data)
                : undefined;
            const governmentJobCreate = buildGovernmentJobDetailsCreate(data);

            const tempId = crypto.randomUUID();
            const isGovt = type === 'GOVERNMENT';
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

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId, slug, type: type as unknown as DbOpportunityType,
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
                    employmentType: data.employmentType,
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                    salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives, jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                    tags: buildGovernmentTags(data),
                    sourceLink, applyLink,
                    applicationDetails: data.applicationDetails,
                    expiresAt: deriveOpportunityExpiryDate(data, type),
                    postedByUserId: contributorId || (req.adminId as string),
                    status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
                    ...(walkInCreate && { walkInDetails: walkInCreate }),
                    ...(governmentJobCreate && { governmentJobDetails: governmentJobCreate }),
                },
                include: { walkInDetails: true, governmentJobDetails: true },
            });

            await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });

            // If linked to a raw opportunity submission, update it
            if (data.rawOpportunityId) {
                await prisma.rawOpportunity.update({
                    where: { id: data.rawOpportunityId as string },
                    data: {
                        status: 'DRAFT_CREATED',
                        mappedOpportunityId: opportunity.id as string
                    }
                });
            }

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
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            let type: OpportunityType = data.type;
            if (data.category) {
                const map: Record<string, OpportunityType> = {
                    job: OpportunityType.JOB,
                    internship: OpportunityType.INTERNSHIP,
                    'walk-in': OpportunityType.WALKIN,
                };
                type = map[data.category] || OpportunityType.JOB;
            }

            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (type !== OpportunityType.WALKIN && !applyLink) {
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

            const walkInCreate = type === OpportunityType.WALKIN && data.walkInDetails
                ? buildWalkInCreate(data)
                : undefined;
            const governmentJobCreate = buildGovernmentJobDetailsCreate(data);

            const tempId = crypto.randomUUID();
            const isGovt = type === 'GOVERNMENT';
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

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId, slug, type: type as unknown as DbOpportunityType,
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
                    employmentType: data.employmentType,
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                    salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives, jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                    tags: buildGovernmentTags(data),
                    sourceLink, applyLink,
                    applicationDetails: data.applicationDetails,
                    expiresAt: deriveOpportunityExpiryDate(data, type),
                    postedByUserId: contributorId || (req.adminId as string),
                    status: OpportunityStatus.DRAFT as unknown as DbOpportunityStatus,
                    ...(walkInCreate && { walkInDetails: walkInCreate }),
                    ...(governmentJobCreate && { governmentJobDetails: governmentJobCreate }),
                },
                include: { walkInDetails: true, governmentJobDetails: true },
            });

            // If linked to a raw opportunity submission, update it
            if (data.rawOpportunityId) {
                await prisma.rawOpportunity.update({
                    where: { id: data.rawOpportunityId as string },
                    data: {
                        status: 'DRAFT_CREATED',
                        mappedOpportunityId: opportunity.id as string
                    }
                });
            }

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
    adminRateLimit,
    withAdminAudit('UPDATE'),
    validate(opportunitySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            const data = req.body;

            const existing = await prisma.opportunity.findFirst({
                where: { OR: [{ id: idParam }, { slug: idParam }] },
                include: { governmentJobDetails: true, walkInDetails: true },
            });
            if (!existing) return res.status(404).json({ message: 'Opportunity not found' });

            const type = data.type as OpportunityType;

            // Safe deletions of related 1-to-1 records to prevent strict Prisma P2025 nested delete crashes
            if (type !== OpportunityType.WALKIN) {
                await prisma.walkInDetails.deleteMany({ where: { opportunityId: existing.id } });
            }
            if (data.governmentJobDetails === null) {
                await prisma.governmentJobDetails.deleteMany({ where: { opportunityId: existing.id } });
            }

            const walkInUpdate = type === OpportunityType.WALKIN && data.walkInDetails
                ? { upsert: (() => { const b = buildWalkInCreate(data); return b ? { create: b.create, update: b.create } : undefined; })() }
                : undefined;
            const governmentJobUpdate = data.governmentJobDetails === null
                ? undefined
                : buildGovernmentJobDetailsUpsert(data);

            const govtDetailsUpdate = data.governmentJobDetails;
            const education = normalizeEducationRequirements(data, govtDetailsUpdate ?? undefined);
            const locations = type === 'GOVERNMENT'
                ? extractGovtLocations(govtDetailsUpdate ?? undefined, data.locations ?? [])
                : (data.locations ?? []);
            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (type !== OpportunityType.WALKIN && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            const updateData: Prisma.OpportunityUpdateInput = {
                ...education, type: type as unknown as DbOpportunityType, status: data.status as unknown as DbOpportunityStatus,
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
                employmentType: data.employmentType, sourceLink, applyLink,
                applicationDetails: data.applicationDetails,
                expiresAt: deriveOpportunityExpiryDate(data, type),
                lastVerified: new Date(),
                ...(data.status === OpportunityStatus.PUBLISHED ? { expiredAt: null, deletedAt: null } : {}),
                ...(type === OpportunityType.WALKIN && walkInUpdate && { walkInDetails: walkInUpdate }),
                ...(governmentJobUpdate && { governmentJobDetails: governmentJobUpdate }),
            };

            if (data.title !== existing.title || data.company !== existing.company || data.customSlug) {
                const isGovtUpdate = type === 'GOVERNMENT';
                if (data.customSlug) {
                    const base = sanitizeCustomSlug(data.customSlug);
                    const others = await prisma.opportunity.findMany({ where: { slug: { startsWith: base }, id: { not: existing.id as string } }, select: { slug: true } });
                    updateData.slug = resolveUniqueSlug(base, new Set(others.map(o => o.slug)));
                } else if (isGovtUpdate) {
                    const base = generateSlug(data.title as string, data.company as string, undefined, { isGovt: true });
                    const others = await prisma.opportunity.findMany({ where: { slug: { startsWith: base }, id: { not: existing.id as string } }, select: { slug: true } });
                    updateData.slug = resolveUniqueSlug(base, new Set(others.map(o => o.slug)));
                } else {
                    updateData.slug = generateSlug(data.title as string, data.company as string, existing.id as string);
                }
            }

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id as string },
                data: updateData,
                include: { walkInDetails: true, governmentJobDetails: true },
            });

            // If linked to a raw opportunity submission, update it
            if (data.rawOpportunityId) {
                await prisma.rawOpportunity.update({
                    where: { id: data.rawOpportunityId as string },
                    data: {
                        status: 'DRAFT_CREATED',
                        mappedOpportunityId: opportunity.id as string
                    }
                });
            }

            let responseMessage = 'Opportunity updated successfully';
            if (existing.status !== OpportunityStatus.PUBLISHED && opportunity.status === OpportunityStatus.PUBLISHED) {
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });
                responseMessage = 'Opportunity published successfully.';
            } else if (opportunity.status === OpportunityStatus.PUBLISHED) {
                // Already published, just update cache and notify update
                await handleOpportunityPublished(opportunity as unknown as Opportunity, {
                    isNew: false,
                    oldSlug: existing.slug !== opportunity.slug ? (existing.slug as string) : undefined
                });
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
                    ...(status === OpportunityStatus.PUBLISHED ? { expiredAt: null, deletedAt: null, deletionReason: null } : {}),
                },
                include: { walkInDetails: true, governmentJobDetails: true },
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

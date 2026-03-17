import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../lib/prisma';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { Prisma } from '@fresherflow/database';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { validate } from '../../../middleware/validate';
import { opportunitySchema } from '../../../utils/validation';
import { generateSlug, generateCompanyLogoUrl, normalizeSkills } from '@fresherflow/utils';
import { normalizeOpportunityLinks } from '../../../utils/opportunityLinks';
import {
    normalizeEducationRequirements, buildWalkInCreate,
    deriveOpportunityExpiryDate,
} from './_helpers';
import { handleOpportunityPublished } from '../../../services/publish.service';
import { Opportunity } from '@fresherflow/types';

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

            const tempId = crypto.randomUUID();
            const slug = generateSlug(data.title, data.company, tempId);
            const education = normalizeEducationRequirements(data);

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId, slug, type,
                    title: data.title, company: data.company,
                    companyWebsite: data.companyWebsite,
                    companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                    description: data.description,
                    allowedDegrees: education.allowedDegrees,
                    allowedCourses: education.allowedCourses,
                    allowedSpecializations: education.allowedSpecializations,
                    allowedPassoutYears: data.allowedPassoutYears,
                    requiredSkills: normalizeSkills(data.requiredSkills),
                    locations: data.locations, workMode: data.workMode,
                    salaryRange: data.salaryRange, stipend: data.stipend,
                    employmentType: data.employmentType,
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                    salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives, jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                    sourceLink, applyLink,
                    expiresAt: deriveOpportunityExpiryDate(data, type),
                    postedByUserId: req.adminId!,
                    status: OpportunityStatus.PUBLISHED,
                    ...(walkInCreate && { walkInDetails: walkInCreate }),
                },
                include: { walkInDetails: true },
            });

            await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });

            res.status(201).json({ opportunity, message: 'Opportunity created successfully. Social posting queued.' });
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

            const tempId = crypto.randomUUID();
            const slug = generateSlug(data.title, data.company, tempId);
            const education = normalizeEducationRequirements(data);

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId, slug, type,
                    title: data.title, company: data.company,
                    companyWebsite: data.companyWebsite,
                    companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                    description: data.description,
                    allowedDegrees: education.allowedDegrees,
                    allowedCourses: education.allowedCourses,
                    allowedSpecializations: education.allowedSpecializations,
                    allowedPassoutYears: data.allowedPassoutYears,
                    requiredSkills: normalizeSkills(data.requiredSkills),
                    locations: data.locations, workMode: data.workMode,
                    salaryRange: data.salaryRange, stipend: data.stipend,
                    employmentType: data.employmentType,
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                    salaryMax: data.salaryMax, salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives, jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess, notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                    sourceLink, applyLink,
                    expiresAt: deriveOpportunityExpiryDate(data, type),
                    postedByUserId: req.adminId!,
                    status: OpportunityStatus.DRAFT,
                    ...(walkInCreate && { walkInDetails: walkInCreate }),
                },
                include: { walkInDetails: true },
            });

            // Drafts only notify admin privately, no broadcast/alerts/social
            // But we might want a "draft created" internal notification if we had one.
            // Keeping it simple for now as it was.

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
            });
            if (!existing) return res.status(404).json({ message: 'Opportunity not found' });

            const id = existing.id;
            const type = data.type as OpportunityType;
            const walkInUpdate = type === OpportunityType.WALKIN && data.walkInDetails
                ? { upsert: (() => { const b = buildWalkInCreate(data); return b ? { create: b.create, update: b.create } : undefined; })() }
                : {};

            const education = normalizeEducationRequirements(data);
            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (type !== OpportunityType.WALKIN && !applyLink) {
                return res.status(400).json({ message: 'At least one sourceLink or applyLink is required' });
            }

            const updateData: Prisma.OpportunityUpdateInput = {
                ...education, type, status: data.status,
                title: data.title, company: data.company,
                companyWebsite: data.companyWebsite,
                companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                description: data.description,
                allowedPassoutYears: data.allowedPassoutYears,
                requiredSkills: normalizeSkills(data.requiredSkills),
                locations: data.locations, workMode: data.workMode,
                salaryMin: data.salaryMin, salaryMax: data.salaryMax,
                salaryPeriod: data.salaryPeriod, incentives: data.incentives,
                jobFunction: data.jobFunction, selectionProcess: data.selectionProcess,
                notesHighlights: data.notesHighlights,
                experienceMin: data.experienceMin, experienceMax: data.experienceMax,
                salaryRange: data.salaryRange, stipend: data.stipend,
                employmentType: data.employmentType, sourceLink, applyLink,
                expiresAt: deriveOpportunityExpiryDate(data, type),
                lastVerified: new Date(),
                ...(data.status === OpportunityStatus.PUBLISHED ? { expiredAt: null, deletedAt: null } : {}),
                ...(type === OpportunityType.WALKIN && { walkInDetails: walkInUpdate }),
            };

            if (data.title !== existing.title || data.company !== existing.company) {
                updateData.slug = generateSlug(data.title, data.company, existing.id);
            }

            const opportunity = await prisma.opportunity.update({
                where: { id },
                data: updateData,
                include: { walkInDetails: true },
            });

            let responseMessage = 'Opportunity updated successfully';
            if (existing.status !== OpportunityStatus.PUBLISHED && opportunity.status === OpportunityStatus.PUBLISHED) {
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { isNew: true });
                responseMessage = 'Opportunity published successfully. Social posting queued.';
            } else if (opportunity.status === OpportunityStatus.PUBLISHED) {
                // Already published, just update cache and notify update
                await handleOpportunityPublished(opportunity as unknown as Opportunity, { 
                    isNew: false, 
                    oldSlug: existing.slug !== opportunity.slug ? existing.slug : undefined 
                });
            }

            res.json({ opportunity, message: responseMessage });
        } catch (error) {
            next(error);
        }
    },
);

export default router;

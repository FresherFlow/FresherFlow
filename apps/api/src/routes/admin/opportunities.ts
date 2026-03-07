import prisma from '../../lib/prisma';
import express, { Router, Request, Response, NextFunction } from 'express';
import { Prisma, OpportunityEventType, OpportunityStatus, OpportunityType } from '@prisma/client';
import { requireAdmin } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit, validateReason } from '../../middleware/adminAudit';
import { validate } from '../../middleware/validate';
import { opportunitySchema } from '../../utils/validation';
import { AppError } from '../../middleware/errorHandler';
import { OpportunityService } from '../../services/opportunity.service';
import { ParserService } from '../../services/parser.service';
import { sendNewJobAlerts } from '../../services/notification.service';
import { invalidatePublicOpportunityCache } from '../../services/publicOpportunityCache.service';
import { generateSlug } from '../../utils/slugify';
import { generateCompanyLogoUrl } from '../../utils/companyLogo';
import logger from '../../utils/logger';
import { normalizeEducationBuckets } from '../../utils/academicNormalization';
import { normalizeSkills } from '../../utils/skillNormalization';
import { normalizeOpportunityLinks } from '../../utils/opportunityLinks';

import TelegramService from '../../services/telegram.service';

const router: Router = express.Router();


function queueNewJobAlerts(opportunityId: string) {
    sendNewJobAlerts(opportunityId).catch((error) => {
        logger.error('Failed to dispatch new job alerts', {
            opportunityId,
            error: error instanceof Error ? error.message : String(error)
        });
    });
}

// Apply Admin Auth Globally for this router
router.use(requireAdmin);

function normalizeTypeParam(raw?: string) {
    if (!raw) return undefined;
    const value = raw.toLowerCase();
    if (value === 'job' || value === 'jobs') return OpportunityType.JOB;
    if (value === 'internship' || value === 'internships') return OpportunityType.INTERNSHIP;
    if (value === 'walk-in' || value === 'walkin' || value === 'walkins' || value === 'walk-ins') return OpportunityType.WALKIN;
    const upper = raw.toUpperCase();
    if (Object.values(OpportunityType).includes(upper as OpportunityType)) return upper as OpportunityType;
    return undefined;
}

function toCsvValue(value: unknown) {
    if (value === null || value === undefined) return '';
    const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
}

type AdminStatusFilter = OpportunityStatus | 'EXPIRED' | 'DELETED';

function parseAdminStatusFilter(raw?: string): AdminStatusFilter | undefined {
    if (!raw) return undefined;
    const normalized = raw.toUpperCase();
    if (normalized === 'EXPIRED') return 'EXPIRED';
    if (normalized === 'DELETED') return 'DELETED';
    if (Object.values(OpportunityStatus).includes(normalized as OpportunityStatus)) {
        return normalized as OpportunityStatus;
    }
    return undefined;
}

function buildExpiredWhere(now: Date): Prisma.OpportunityWhereInput {
    return {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        OR: [
            { expiredAt: { not: null } },
            { expiresAt: { lte: now } },
        ],
    };
}

function toDateOrNull(value: unknown): Date | null {
    if (!value || typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function normalizeWalkInDates(data: any): Date[] {
    const walkInDetails = data?.walkInDetails || {};
    const rawDates: string[] = [];

    if (Array.isArray(walkInDetails.dates)) {
        rawDates.push(...walkInDetails.dates);
    } else if (typeof walkInDetails.date === 'string') {
        rawDates.push(walkInDetails.date);
    }

    if (typeof data?.startDate === 'string') rawDates.push(data.startDate);
    if (typeof data?.endDate === 'string') rawDates.push(data.endDate);

    return rawDates
        .map((value) => toDateOrNull(value))
        .filter((value): value is Date => Boolean(value));
}

function deriveOpportunityExpiryDate(data: any, type: OpportunityType): Date | null {
    const explicit = toDateOrNull(data?.expiresAt);
    if (explicit) return explicit;
    if (type !== OpportunityType.WALKIN) return null;

    const walkInDates = normalizeWalkInDates(data);
    if (walkInDates.length === 0) return null;

    const endDate = new Date(Math.max(...walkInDates.map((d) => d.getTime())));
    endDate.setHours(23, 59, 59, 999);
    return endDate;
}

function normalizeEducationRequirements(data: any) {
    const normalized = normalizeEducationBuckets(
        data.allowedCourses || [],
        data.allowedSpecializations || []
    );

    return {
        allowedDegrees: Array.isArray(data.allowedDegrees) ? data.allowedDegrees : [],
        allowedCourses: normalized.allowedCourses,
        allowedSpecializations: normalized.allowedSpecializations,
    };
}

function parseEventType(raw?: string): OpportunityEventType {
    const fallback = OpportunityEventType.OTHER;
    if (!raw) return fallback;
    const normalized = raw.toUpperCase();
    return Object.values(OpportunityEventType).includes(normalized as OpportunityEventType)
        ? (normalized as OpportunityEventType)
        : fallback;
}

// GET /api/admin/opportunities/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const liveWhere: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            expiredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        };
        const [total, active, walkins, liveWalkins, drafts, archived, deleted, expired] = await prisma.$transaction([
            prisma.opportunity.count({ where: { deletedAt: null } }),
            prisma.opportunity.count({
                where: liveWhere
            }),
            prisma.opportunity.count({ where: { deletedAt: null, type: OpportunityType.WALKIN } }),
            prisma.opportunity.count({ where: { ...liveWhere, type: OpportunityType.WALKIN } }),
            prisma.opportunity.count({ where: { status: OpportunityStatus.DRAFT, deletedAt: null } }),
            prisma.opportunity.count({ where: { status: OpportunityStatus.ARCHIVED, deletedAt: null } }),
            prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
            prisma.opportunity.count({ where: buildExpiredWhere(now) })
        ]);

        res.json({
            summary: {
                total,
                active,
                walkins,
                liveWalkins,
                drafts,
                archived,
                deleted,
                expired
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/opportunities/parse
router.post('/parse', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: 'Text is required' });
        }

        const parsed = ParserService.parse(text);
        res.json({ parsed });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/opportunities/ingest-draft
// Automation-safe entrypoint: always creates DRAFT for admin review.
router.post(
    '/ingest-draft',
    adminRateLimit,
    withAdminAudit('CREATE'),
    validate(opportunitySchema as any),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;

            let type = data.type;
            if (data.category) {
                const map: Record<string, OpportunityType> = {
                    job: OpportunityType.JOB,
                    internship: OpportunityType.INTERNSHIP,
                    'walk-in': OpportunityType.WALKIN
                };
                type = map[data.category] || OpportunityType.JOB;
            }

            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);

            if (type !== OpportunityType.WALKIN && !applyLink) {
                return res.status(400).json({
                    message: 'At least one sourceLink or applyLink is required'
                });
            }

            // Lightweight de-duplication for automated ingestion.
            if (applyLink || sourceLink) {
                const duplicateFilters = [
                    applyLink ? { applyLink } : null,
                    applyLink ? { sourceLink: applyLink } : null,
                    sourceLink ? { sourceLink } : null,
                    sourceLink ? { applyLink: sourceLink } : null,
                ].filter(Boolean) as Prisma.OpportunityWhereInput[];

                const existing = await prisma.opportunity.findFirst({
                    where: {
                        deletedAt: null,
                        OR: duplicateFilters
                    },
                    select: { id: true, slug: true, status: true, title: true }
                });

                if (existing) {
                    return res.status(409).json({
                        message: 'Duplicate listing detected by applyLink',
                        duplicate: existing
                    });
                }
            }

            let walkInCreate = undefined;
            if (type === OpportunityType.WALKIN && data.walkInDetails) {
                const dates = normalizeWalkInDates(data);
                const venueAddress = data.walkInDetails.venueAddress || data.walkInDetails.venue;
                const reportingTime = data.walkInDetails.reportingTime || data.walkInDetails.startTime;

                if (venueAddress) {
                    walkInCreate = {
                        create: {
                            dates,
                            dateRange: data.walkInDetails.dateRange,
                            timeRange: data.walkInDetails.timeRange,
                            venueAddress,
                            venueLink: data.walkInDetails.venueLink,
                            reportingTime: reportingTime || 'Contact for timing',
                            requiredDocuments: data.walkInDetails.requiredDocuments || [],
                            contactPerson: data.walkInDetails.contactPerson,
                            contactPhone: data.walkInDetails.contactPhone
                        }
                    };
                }
            }

            const tempId = crypto.randomUUID();
            const slug = generateSlug(data.title, data.company, tempId);
            const education = normalizeEducationRequirements(data);

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId,
                    slug,
                    type: type as OpportunityType,
                    title: data.title,
                    company: data.company,
                    companyWebsite: data.companyWebsite,
                    companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                    description: data.description,
                    allowedDegrees: education.allowedDegrees,
                    allowedCourses: education.allowedCourses,
                    allowedSpecializations: education.allowedSpecializations,
                    allowedPassoutYears: data.allowedPassoutYears,
                    requiredSkills: normalizeSkills(data.requiredSkills),
                    locations: data.locations,
                    workMode: data.workMode,
                    salaryRange: data.salaryRange,
                    stipend: data.stipend,
                    employmentType: data.employmentType,
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined),
                    salaryMax: data.salaryMax,
                    salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives,
                    jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess,
                    notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin,
                    experienceMax: data.experienceMax,
                    sourceLink,
                    applyLink,
                    expiresAt: deriveOpportunityExpiryDate(data, type as OpportunityType),
                    postedByUserId: req.adminId!,
                    status: OpportunityStatus.DRAFT,
                    ...(walkInCreate && { walkInDetails: walkInCreate })
                },
                include: {
                    walkInDetails: true
                }
            });

            // Notify admin only; no public broadcast for draft ingestion.
            TelegramService.notifyNewJob(
                opportunity.title,
                opportunity.company,
                opportunity.id,
                false
            ).catch(() => { });

            res.status(201).json({
                opportunity,
                message: 'Draft ingested successfully. Review and publish from admin.'
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/admin/opportunities/bulk
router.post(
    '/bulk',
    withAdminAudit('BULK_ACTION'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { ids, action, reason } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'IDs array is required' });
            }

            if (!action) {
                return res.status(400).json({ message: 'Action is required' });
            }

            let result;
            const now = new Date();
            let idsNeedingAlerts: string[] = [];

            switch (action) {
                case 'DELETE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: {
                            status: OpportunityStatus.ARCHIVED,
                            deletedAt: now,
                            deletionReason: reason || 'Bulk deleted by admin'
                        }
                    });
                    break;
                case 'ARCHIVE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { status: OpportunityStatus.ARCHIVED }
                    });
                    break;
                case 'PUBLISH':
                    idsNeedingAlerts = (await prisma.opportunity.findMany({
                        where: {
                            id: { in: ids },
                            status: { not: OpportunityStatus.PUBLISHED }
                        },
                        select: { id: true }
                    })).map((item) => item.id);

                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { status: OpportunityStatus.PUBLISHED }
                    });
                    break;
                case 'EXPIRE':
                    result = await prisma.opportunity.updateMany({
                        where: { id: { in: ids } },
                        data: { expiredAt: now }
                    });
                    break;
                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }

            res.json({
                message: `Bulk ${action.toLowerCase()} completed`,
                action,
                requestedCount: ids.length,
                updatedCount: result.count,
                skippedCount: Math.max(0, ids.length - result.count)
            });
            void invalidatePublicOpportunityCache({ idsOrSlugs: ids, purgeFeed: true });

            if (action === 'PUBLISH' && idsNeedingAlerts.length > 0) {
                idsNeedingAlerts.forEach((opportunityId) => queueNewJobAlerts(opportunityId));
            }
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/admin/opportunities
router.post(
    '/',
    adminRateLimit, // Rate limit mutation
    withAdminAudit('CREATE'),
    validate(opportunitySchema as any),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;

            // 1. Map Category -> Type
            let type = data.type;
            if (data.category) {
                const map: any = { 'job': 'JOB', 'internship': 'INTERNSHIP', 'walk-in': 'WALKIN' };
                type = map[data.category] || 'JOB';
            }

            // 2. Normalize Walk-in Details
            let walkInCreate = undefined;
            if (type === OpportunityType.WALKIN && data.walkInDetails) {
                // Handle aliases (date -> dates, venue -> venueAddress)
                const dates = normalizeWalkInDates(data);
                const venueAddress = data.walkInDetails.venueAddress || data.walkInDetails.venue;
                const reportingTime = data.walkInDetails.reportingTime || data.walkInDetails.startTime;

                if (venueAddress) {
                    walkInCreate = {
                        create: {
                            dates,
                            dateRange: data.walkInDetails.dateRange,
                            timeRange: data.walkInDetails.timeRange,
                            venueAddress,
                            venueLink: data.walkInDetails.venueLink,
                            reportingTime: reportingTime || 'Contact for timing',
                            requiredDocuments: data.walkInDetails.requiredDocuments || [],
                            contactPerson: data.walkInDetails.contactPerson,
                            contactPhone: data.walkInDetails.contactPhone
                        }
                    };
                }
            }

            // Generate unique slug
            const tempId = crypto.randomUUID();
            const slug = generateSlug(data.title, data.company, tempId);
            const education = normalizeEducationRequirements(data);
            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);

            if (type !== OpportunityType.WALKIN && !applyLink) {
                return res.status(400).json({
                    message: 'At least one sourceLink or applyLink is required'
                });
            }

            const opportunity = await prisma.opportunity.create({
                data: {
                    id: tempId,
                    slug,
                    type: type as OpportunityType,
                    title: data.title,
                    company: data.company,
                    companyWebsite: data.companyWebsite,
                    companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                    description: data.description,
                    allowedDegrees: education.allowedDegrees,
                    allowedCourses: education.allowedCourses,
                    allowedSpecializations: education.allowedSpecializations,
                    allowedPassoutYears: data.allowedPassoutYears,
                    requiredSkills: normalizeSkills(data.requiredSkills),
                    locations: data.locations,
                    workMode: data.workMode,

                    // New Fields
                    salaryRange: data.salaryRange,
                    stipend: data.stipend,
                    employmentType: data.employmentType,

                    // Legacy Mapping
                    salaryMin: data.salaryMin || (data.salaryRange ? parseInt(data.salaryRange) : undefined), // Fallback
                    salaryMax: data.salaryMax,
                    salaryPeriod: data.salaryPeriod,
                    incentives: data.incentives,
                    jobFunction: data.jobFunction,
                    selectionProcess: data.selectionProcess,
                    notesHighlights: data.notesHighlights,
                    experienceMin: data.experienceMin,
                    experienceMax: data.experienceMax,
                    sourceLink,
                    applyLink,
                    expiresAt: deriveOpportunityExpiryDate(data, type as OpportunityType),
                    postedByUserId: req.adminId!,
                    status: OpportunityStatus.PUBLISHED,

                    ...(walkInCreate && { walkInDetails: walkInCreate })
                },
                include: {
                    walkInDetails: true
                }
            });

            // Notify Admin via Telegram (Async)
            TelegramService.notifyNewJob(
                opportunity.title,
                opportunity.company,
                opportunity.id,
                opportunity.status === OpportunityStatus.PUBLISHED
            ).catch(() => { });

            // Broadcast to Public Channel if Published (Async)
            if (opportunity.status === OpportunityStatus.PUBLISHED) {
                TelegramService.broadcastNewOpportunity(
                    opportunity.id,
                    opportunity.title,
                    opportunity.company,
                    opportunity.type,
                    opportunity.locations,
                    opportunity.slug
                ).catch(() => { });
            }

            if (opportunity.status === OpportunityStatus.PUBLISHED) {
                queueNewJobAlerts(opportunity.id);
            }

            res.status(201).json({
                opportunity,
                message: 'Opportunity created successfully'
            });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [opportunity.id, opportunity.slug],
                purgeFeed: true
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/admin/opportunities
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, status, includeCounts, includeWalkInDetails, limit, offset, q, sort, linkHealth, activeOnly } = req.query;
        const where: Prisma.OpportunityWhereInput = {};
        const andFilters: Prisma.OpportunityWhereInput[] = [];
        const now = new Date();

        const normalizedType = typeof type === 'string' ? normalizeTypeParam(type) : undefined;
        if (normalizedType) where.type = normalizedType;
        const statusFilter = typeof status === 'string' ? parseAdminStatusFilter(status) : undefined;
        if (statusFilter === 'EXPIRED') {
            where.deletedAt = null;
            andFilters.push(buildExpiredWhere(now));
        } else if (statusFilter === 'DELETED') {
            where.deletedAt = { not: null };
        } else if (statusFilter === OpportunityStatus.ARCHIVED) {
            where.status = OpportunityStatus.ARCHIVED;
            where.deletedAt = null;
        } else if (statusFilter) {
            where.status = statusFilter;
            where.deletedAt = null;
        } else {
            where.deletedAt = null;
        }

        if (typeof linkHealth === 'string') {
            const normalizedLinkHealth = linkHealth.toUpperCase();
            if (normalizedLinkHealth === 'HEALTHY' || normalizedLinkHealth === 'RETRYING' || normalizedLinkHealth === 'BROKEN') {
                where.linkHealth = normalizedLinkHealth as Prisma.EnumLinkHealthFilter<'Opportunity'>;
            }
        }

        const shouldForceLiveOnly = activeOnly === 'true' && (!statusFilter || statusFilter === OpportunityStatus.PUBLISHED);
        if (shouldForceLiveOnly) {
            where.status = OpportunityStatus.PUBLISHED;
            where.deletedAt = null;
            where.expiredAt = null;
            andFilters.push({
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
            });
        }

        const take = typeof limit === 'string' && !Number.isNaN(Number(limit)) ? Number(limit) : undefined;
        const skip = typeof offset === 'string' && !Number.isNaN(Number(offset)) ? Number(offset) : undefined;

        const shouldIncludeCounts = includeCounts === 'true';
        const shouldIncludeWalkInDetails = includeWalkInDetails === 'true';

        const keyword = typeof q === 'string' ? q.trim() : '';
        if (keyword) {
            andFilters.push({
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
                    { company: { contains: keyword, mode: 'insensitive' } },
                    { description: { contains: keyword, mode: 'insensitive' } },
                    { locations: { has: keyword } }
                ]
            });
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        const sortKey = typeof sort === 'string' ? sort : '';
        let orderBy: any = { postedAt: 'desc' };
        if (sortKey === 'postedAt_asc') orderBy = { postedAt: 'asc' };
        if (sortKey === 'company_asc') orderBy = { company: 'asc' };
        if (sortKey === 'company_desc') orderBy = { company: 'desc' };
        if (sortKey === 'title_asc') orderBy = { title: 'asc' };
        if (sortKey === 'title_desc') orderBy = { title: 'desc' };
        if (sortKey === 'status_asc') orderBy = { status: 'asc' };
        if (sortKey === 'status_desc') orderBy = { status: 'desc' };

        const total = await prisma.opportunity.count({ where });

        const orderByClause = Array.isArray(orderBy)
            ? orderBy
            : [{ status: 'asc' }, orderBy];

        const opportunities = await prisma.opportunity.findMany({
            where,
            ...(take !== undefined ? { take } : {}),
            ...(skip !== undefined ? { skip } : {}),
            include: {
                ...(shouldIncludeWalkInDetails ? { walkInDetails: true } : {}),
                ...(shouldIncludeCounts
                    ? {
                        _count: {
                            select: {
                                actions: true,
                                feedback: true
                            }
                        }
                    }
                    : {})
            },
            orderBy: orderByClause
        });

        const pageSize = take || total || 1;
        const currentPage = take ? Math.floor((skip || 0) / take) + 1 : 1;
        const totalPages = take ? Math.max(1, Math.ceil(total / take)) : 1;

        res.json({
            opportunities,
            total,
            page: currentPage,
            pageSize,
            totalPages
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/opportunities/export
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, status } = req.query;
        const where: Prisma.OpportunityWhereInput = {};
        const andFilters: Prisma.OpportunityWhereInput[] = [];
        const now = new Date();

        const normalizedType = typeof type === 'string' ? normalizeTypeParam(type) : undefined;
        if (normalizedType) where.type = normalizedType;
        const statusFilter = typeof status === 'string' ? parseAdminStatusFilter(status) : undefined;
        if (statusFilter === 'EXPIRED') {
            where.deletedAt = null;
            andFilters.push(buildExpiredWhere(now));
        } else if (statusFilter === 'DELETED') {
            where.deletedAt = { not: null };
        } else if (statusFilter === OpportunityStatus.ARCHIVED) {
            where.status = OpportunityStatus.ARCHIVED;
            where.deletedAt = null;
        } else if (statusFilter) {
            where.status = statusFilter;
            where.deletedAt = null;
        } else {
            where.deletedAt = null;
        }
        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        const opportunities = await prisma.opportunity.findMany({
            where,
            orderBy: { postedAt: 'desc' }
        });

        const header = [
            'id',
            'slug',
            'type',
            'status',
            'title',
            'company',
            'locations',
            'postedAt',
            'expiresAt',
            'linkHealth'
        ].join(',');

        const rows = opportunities.map(opp => ([
            toCsvValue(opp.id),
            toCsvValue(opp.slug),
            toCsvValue(opp.type),
            toCsvValue(opp.status),
            toCsvValue(opp.title),
            toCsvValue(opp.company),
            toCsvValue(opp.locations),
            toCsvValue(opp.postedAt),
            toCsvValue(opp.expiresAt),
            toCsvValue(opp.linkHealth)
        ].join(',')));

        if (req.adminId) {
            prisma.adminAudit.create({
                data: {
                    userId: req.adminId,
                    action: 'EXPORT',
                    targetId: 'opportunities',
                    reason: `type=${normalizedType || 'any'},status=${status || 'any'}`
                }
            }).catch(() => { });
        }

        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="opportunities.csv"');
        res.send(csv);
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/opportunities/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!id) throw new AppError('Opportunity ID or Slug is required', 400);

        const opportunity = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { id: id },
                    { slug: id }
                ]
            },
            include: {
                walkInDetails: true,
                events: {
                    orderBy: { eventDate: 'asc' }
                },
                _count: {
                    select: {
                        actions: true,
                        feedback: true
                    }
                }
            }
        });

        if (!opportunity) {
            throw new AppError('Opportunity not found', 404);
        }

        res.json({ opportunity });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/opportunities/:id/events
router.get('/:id/events', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = String(req.params.id || '');
        if (!idParam) throw new AppError('Opportunity ID is required', 400);

        const existing = await prisma.opportunity.findFirst({
            where: { OR: [{ id: idParam }, { slug: idParam }] },
            select: { id: true, slug: true }
        });
        if (!existing) throw new AppError('Opportunity not found', 404);

        const events = await prisma.opportunityEvent.findMany({
            where: { opportunityId: existing.id },
            orderBy: { eventDate: 'asc' }
        });

        res.json({ events });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/opportunities/:id/events
router.post('/:id/events', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = String(req.params.id || '');
        if (!idParam) throw new AppError('Opportunity ID is required', 400);

        const existing = await prisma.opportunity.findFirst({
            where: { OR: [{ id: idParam }, { slug: idParam }] },
            select: { id: true, slug: true }
        });
        if (!existing) throw new AppError('Opportunity not found', 404);

        const title = String(req.body?.title || '').trim();
        const eventDate = req.body?.eventDate ? new Date(req.body.eventDate) : null;
        if (!title) throw new AppError('Event title is required', 400);
        if (!eventDate || Number.isNaN(eventDate.getTime())) throw new AppError('Valid eventDate is required', 400);

        const event = await prisma.opportunityEvent.create({
            data: {
                opportunityId: existing.id,
                eventType: parseEventType(req.body?.eventType),
                eventDate,
                title,
                notes: req.body?.notes ? String(req.body.notes) : null,
                sourceLink: req.body?.sourceLink ? String(req.body.sourceLink) : null,
            }
        });

        res.status(201).json({ event });
        void invalidatePublicOpportunityCache({
            idsOrSlugs: [existing.id, existing.slug],
            purgeFeed: false
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/admin/opportunities/:id/events/:eventId
router.patch('/:id/events/:eventId', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = String(req.params.id || '');
        const eventId = String(req.params.eventId || '');
        if (!idParam || !eventId) throw new AppError('Opportunity ID and event ID are required', 400);

        const existing = await prisma.opportunity.findFirst({
            where: { OR: [{ id: idParam }, { slug: idParam }] },
            select: { id: true, slug: true }
        });
        if (!existing) throw new AppError('Opportunity not found', 404);

        const current = await prisma.opportunityEvent.findFirst({
            where: { id: eventId, opportunityId: existing.id },
            select: { id: true }
        });
        if (!current) throw new AppError('Event not found', 404);

        const data: Prisma.OpportunityEventUpdateInput = {};
        if (req.body?.title !== undefined) {
            const title = String(req.body.title || '').trim();
            if (!title) throw new AppError('Event title cannot be empty', 400);
            data.title = title;
        }
        if (req.body?.eventDate !== undefined) {
            const dt = new Date(req.body.eventDate);
            if (Number.isNaN(dt.getTime())) throw new AppError('Valid eventDate is required', 400);
            data.eventDate = dt;
        }
        if (req.body?.eventType !== undefined) {
            data.eventType = parseEventType(req.body.eventType);
        }
        if (req.body?.notes !== undefined) {
            data.notes = req.body.notes ? String(req.body.notes) : null;
        }
        if (req.body?.sourceLink !== undefined) {
            data.sourceLink = req.body.sourceLink ? String(req.body.sourceLink) : null;
        }

        const event = await prisma.opportunityEvent.update({
            where: { id: eventId },
            data
        });

        res.json({ event });
        void invalidatePublicOpportunityCache({
            idsOrSlugs: [existing.id, existing.slug],
            purgeFeed: false
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/opportunities/:id/events/:eventId
router.delete('/:id/events/:eventId', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = String(req.params.id || '');
        const eventId = String(req.params.eventId || '');
        if (!idParam || !eventId) throw new AppError('Opportunity ID and event ID are required', 400);

        const existing = await prisma.opportunity.findFirst({
            where: { OR: [{ id: idParam }, { slug: idParam }] },
            select: { id: true, slug: true }
        });
        if (!existing) throw new AppError('Opportunity not found', 404);

        await prisma.opportunityEvent.deleteMany({
            where: {
                id: eventId,
                opportunityId: existing.id
            }
        });

        res.json({ success: true });
        void invalidatePublicOpportunityCache({
            idsOrSlugs: [existing.id, existing.slug],
            purgeFeed: false
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/opportunities/:id
router.put(
    '/:id',
    adminRateLimit, // Rate limit mutation
    withAdminAudit('UPDATE'),
    validate(opportunitySchema as any),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);
            const data = req.body;

            // Find existing first to resolve ID/Slug
            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { id: idParam },
                        { slug: idParam }
                    ]
                }
            });

            if (!existing) {
                throw new AppError('Opportunity not found', 404);
            }

            const id = existing.id; // Use resolved UUID

            // Prepare nested walk-in details update if applicable
            const walkInUpdate: any = {};
            if (data.type === OpportunityType.WALKIN && data.walkInDetails) {
                const dates = normalizeWalkInDates(data);
                const venueAddress = data.walkInDetails.venueAddress || data.walkInDetails.venue;
                const reportingTime = data.walkInDetails.reportingTime || data.walkInDetails.startTime;

                walkInUpdate.upsert = {
                    create: {
                        dates,
                        dateRange: data.walkInDetails.dateRange,
                        timeRange: data.walkInDetails.timeRange,
                        venueAddress: venueAddress!,
                        venueLink: data.walkInDetails.venueLink,
                        reportingTime: reportingTime || 'Contact for timing',
                        requiredDocuments: data.walkInDetails.requiredDocuments || [],
                        contactPerson: data.walkInDetails.contactPerson,
                        contactPhone: data.walkInDetails.contactPhone
                    },
                    update: {
                        dates,
                        dateRange: data.walkInDetails.dateRange,
                        timeRange: data.walkInDetails.timeRange,
                        venueAddress: venueAddress!,
                        venueLink: data.walkInDetails.venueLink,
                        reportingTime: reportingTime || 'Contact for timing',
                        requiredDocuments: data.walkInDetails.requiredDocuments || [],
                        contactPerson: data.walkInDetails.contactPerson,
                        contactPhone: data.walkInDetails.contactPhone
                    }
                };
            }

            // Regenerate slug if title or company changed
            const education = normalizeEducationRequirements(data);
            const { sourceLink, applyLink } = normalizeOpportunityLinks(data.sourceLink, data.applyLink);
            if (data.type !== OpportunityType.WALKIN && !applyLink) {
                throw new AppError('At least one sourceLink or applyLink is required', 400);
            }
            const updateData: any = {
                allowedDegrees: education.allowedDegrees,
                allowedCourses: education.allowedCourses,
                allowedSpecializations: education.allowedSpecializations,
                type: data.type,
                status: data.status,
                title: data.title,
                company: data.company,
                companyWebsite: data.companyWebsite,
                companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                description: data.description,
                allowedPassoutYears: data.allowedPassoutYears,
                requiredSkills: normalizeSkills(data.requiredSkills),
                locations: data.locations,
                workMode: data.workMode,
                salaryMin: data.salaryMin,
                salaryMax: data.salaryMax,
                salaryPeriod: data.salaryPeriod,
                incentives: data.incentives,
                jobFunction: data.jobFunction,
                selectionProcess: data.selectionProcess,
                notesHighlights: data.notesHighlights,
                experienceMin: data.experienceMin,
                experienceMax: data.experienceMax,
                salaryRange: data.salaryRange,
                stipend: data.stipend,
                employmentType: data.employmentType,
                sourceLink,
                applyLink,
                expiresAt: deriveOpportunityExpiryDate(data, data.type as OpportunityType),
                lastVerified: new Date(),
                ...(data.type === OpportunityType.WALKIN && { walkInDetails: walkInUpdate })
            };

            // Update slug if title or company changed
            if (data.title !== existing.title || data.company !== existing.company) {
                updateData.slug = generateSlug(data.title, data.company, existing.id);
            }

            const opportunity = await prisma.opportunity.update({
                where: { id },
                data: updateData,
                include: {
                    walkInDetails: true
                }
            });

            if (existing.status !== OpportunityStatus.PUBLISHED && opportunity.status === OpportunityStatus.PUBLISHED) {
                queueNewJobAlerts(opportunity.id);
            }

            res.json({
                opportunity,
                message: 'Opportunity updated successfully'
            });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id, existing.slug, opportunity.id, opportunity.slug],
                purgeFeed: true
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/admin/opportunities/:id/expire
router.post(
    '/:id/expire',
    adminRateLimit, // Rate limit mutation
    withAdminAudit('EXPIRE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            // Find existing first to resolve ID/Slug
            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { id: idParam },
                        { slug: idParam }
                    ]
                }
            });

            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id },
                data: {
                    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Update LOGIC field (backdated)
                    expiredAt: new Date() // Update AUDIT field (now)
                }
            });

            res.json({
                opportunity,
                message: 'Opportunity marked as expired'
            });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id, existing.slug],
                purgeFeed: true
            });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/admin/opportunities/:id
router.delete(
    '/:id',
    adminRateLimit, // Rate limit mutation
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);
            const { reason } = req.body;

            // Find existing first to resolve ID/Slug
            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { id: idParam },
                        { slug: idParam }
                    ]
                }
            });

            if (!existing) throw new AppError('Opportunity not found', 404);

            // Soft delete - mark as ARCHIVED
            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id },
                data: {
                    status: OpportunityStatus.ARCHIVED,
                    deletedAt: new Date(),
                    deletionReason: reason || 'Deleted by admin'
                }
            });

            res.json({
                opportunity,
                message: 'Opportunity removed successfully (soft delete)'
            });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id, existing.slug],
                purgeFeed: true
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/admin/opportunities/:id/restore
router.post(
    '/:id/restore',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const idParam = req.params.id as string;
            if (!idParam) throw new AppError('Opportunity ID is required', 400);

            const existing = await prisma.opportunity.findFirst({
                where: {
                    OR: [
                        { id: idParam },
                        { slug: idParam }
                    ]
                }
            });

            if (!existing) throw new AppError('Opportunity not found', 404);

            const opportunity = await prisma.opportunity.update({
                where: { id: existing.id },
                data: {
                    deletedAt: null,
                    deletionReason: null,
                    status: OpportunityStatus.ARCHIVED
                }
            });

            res.json({
                opportunity,
                message: 'Opportunity restored from deleted list'
            });
            void invalidatePublicOpportunityCache({
                idsOrSlugs: [existing.id, existing.slug, opportunity.id, opportunity.slug],
                purgeFeed: true
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;



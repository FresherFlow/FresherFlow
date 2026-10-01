import { Router, Request, Response, NextFunction } from 'express';
import prisma, { OpportunityStatus as DbOpportunityStatus } from '../../../infrastructure/database/prisma';
import { Prisma } from '@fresherflow/database';
import { OpportunityStatus } from '@fresherflow/types';
import { searchOpportunities, parseOpportunityFilters } from '../../../application/opportunity';
import { requirePermission } from '../../../middleware/auth';
import { parsePagination } from '../../../utils/pagination';
import { sendError, ErrorCode } from '../../../middleware/errorHandler';
import {
    normalizeTypeParam, parseAdminStatusFilter, buildExpiredWhere, buildIdOrSlugWhere,
} from './_helpers';
import { adminCache } from '../../../infrastructure/cache/adminCache';

const router = Router();

/**
 * GET /api/admin/opportunities
 * List and search opportunities with filtering, sorting, and cursor/offset pagination.
 */
router.get('/', requirePermission('opportunity.review'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = `list_${JSON.stringify(req.query)}`;
        const cached = adminCache.get(cacheKey);
        if (cached) return res.json(cached);

        const { type, status, includeCounts, includeWalkInDetails, limit, offset, cursor, page, q, sort, linkHealth, activeOnly, sector } = req.query;
        const where: Prisma.OpportunityWhereInput = {};
        const andFilters: Prisma.OpportunityWhereInput[] = [];
        const now = new Date();

        // A single legacy `type` param can now expand into several dimensions,
        // so push each as its own AND clause rather than assigning one field.
        const normalizedType = typeof type === 'string' ? normalizeTypeParam(type) : undefined;
        if (normalizedType?.category) andFilters.push({ category: normalizedType.category });
        if (normalizedType?.recruitmentMethod) andFilters.push({ recruitmentMethod: normalizedType.recruitmentMethod });
        if (normalizedType?.employmentType) andFilters.push({ employmentTypes: { has: normalizedType.employmentType } });
        if (normalizedType?.sector) andFilters.push({ sector: normalizedType.sector });

        if (typeof sector === 'string' && sector) {
            if (sector === 'GOVERNMENT') {
                where.governmentJobDetails = { isNot: null };
            } else if (sector === 'PRIVATE') {
                where.governmentJobDetails = null;
            }
        }

        const statusFilter = typeof status === 'string' ? parseAdminStatusFilter(status) : undefined;
        if (statusFilter === 'EXPIRED') {
            where.deletedAt = null;
            andFilters.push(buildExpiredWhere(now));
        } else if (statusFilter === 'DELETED') {
            where.deletedAt = { not: null };
        } else if (statusFilter === OpportunityStatus.ARCHIVED) {
            where.status = OpportunityStatus.ARCHIVED as unknown as DbOpportunityStatus;
            where.deletedAt = null;
        } else if (statusFilter === 'LIVE') {
            where.status = OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus;
            where.deletedAt = null;
            where.expiredAt = null;
            andFilters.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
        } else if (statusFilter) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where.status = statusFilter as any;
            where.deletedAt = null;
        } else {
            where.deletedAt = null;
        }

        if (typeof linkHealth === 'string') {
            const lh = linkHealth.toUpperCase();
            if (lh === 'HEALTHY' || lh === 'RETRYING' || lh === 'BROKEN') {
                where.linkHealth = lh as Prisma.EnumLinkHealthFilter<'Opportunity'>;
            }
        }

        const shouldForceLiveOnly = activeOnly === 'true' && (!statusFilter || statusFilter === OpportunityStatus.PUBLISHED);
        if (shouldForceLiveOnly) {
            where.status = OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus;
            where.deletedAt = null;
            where.expiredAt = null;
            andFilters.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
        }

        // Standardized offset pagination: one clamped `page`/`limit` contract.
        // An explicit `offset` still wins when provided (deep-link/exports),
        // otherwise it derives from the page window.
        const { page: pageNumber, limit: take, skip: pageSkip } = parsePagination(
            { page, limit },
            { defaultLimit: 20, maxLimit: 100 },
        );
        const explicitOffset = typeof offset === 'string' && !Number.isNaN(Number(offset)) ? Number(offset) : undefined;
        const skip = explicitOffset !== undefined
            ? Math.max(0, Math.min(Math.trunc(explicitOffset), 5000))
            : pageSkip;
        const shouldIncludeCounts = includeCounts === 'true';
        const shouldIncludeWalkInDetails = includeWalkInDetails === 'true';
        const keyword = typeof q === 'string' ? q.trim() : '';

        // Full-text search path
        if (keyword) {
            // Phase 6: the admin list shares the public filter contract, so a
            // `?type=` value here resolves across the split dimensions exactly
            // as it does on the public route. Admin-only concerns (statuses,
            // deleted/expired visibility) stay in the second argument.
            const searchResults = await searchOpportunities(
                parseOpportunityFilters({
                    q: keyword,
                    type: typeof type === 'string' ? type : undefined,
                    // Mirror the admin list's own `sector` handling: a
                    // GOVERNMENT filter means the govt site, otherwise private.
                    siteMode:
                        typeof sector === 'string' && sector.toUpperCase() === 'GOVERNMENT'
                            ? 'govt'
                            : 'private',
                }, now),
                {
                limit: take,
                offset: skip,
                cursor: typeof cursor === 'string' ? cursor : undefined,
                includeTotal: true,
                statuses: statusFilter && statusFilter !== 'EXPIRED' && statusFilter !== 'DELETED'
                    ? [statusFilter === 'LIVE' ? 'PUBLISHED' : statusFilter]
                    : ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
                includeExpired: statusFilter === 'EXPIRED' || !statusFilter,
                includeDeleted: statusFilter === 'DELETED',
            });

            // Hydrate the raw search hits with full Prisma relations
            let fullOpportunities: any[] = [];
            if (searchResults.hits.length > 0) {
                const hitIds = searchResults.hits.map(h => h.id);
                const fetchedOpportunities = await prisma.opportunity.findMany({
                    where: { id: { in: hitIds } },
                    include: {
                        ...(shouldIncludeWalkInDetails ? { driveDetails: true } : {}),
                        governmentJobDetails: true,
                        ...(shouldIncludeCounts ? { _count: { select: { actions: true, feedback: true } } } : {}),
                        socialPosts: true,
                    }
                });
                // Restore the original search ranking order
                fullOpportunities = hitIds
                    .map(id => fetchedOpportunities.find(o => o.id === id))
                    .filter(Boolean);
            }

            return res.json({
                opportunities: fullOpportunities,
                total: searchResults.totalHits ?? 0,
                nextCursor: searchResults.nextCursor,
                page: pageNumber,
                pageSize: take,
                totalPages: Math.max(1, Math.ceil((searchResults.totalHits ?? 0) / take)),
            });
        }

        if (andFilters.length > 0) where.AND = andFilters;

        const sortKey = typeof sort === 'string' ? sort : '';
        // Allowlisted sort keys: unknown values fall back to newest-first
        // rather than reaching Prisma/orderBy as an unvalidated string.
        let orderBy: Prisma.OpportunityOrderByWithRelationInput = { postedAt: 'desc' };
        if (sortKey === 'postedAt_asc') orderBy = { postedAt: 'asc' };
        if (sortKey === 'company_asc') orderBy = { company: 'asc' };
        if (sortKey === 'company_desc') orderBy = { company: 'desc' };
        if (sortKey === 'title_asc') orderBy = { title: 'asc' };
        if (sortKey === 'title_desc') orderBy = { title: 'desc' };
        if (sortKey === 'status_asc') orderBy = { status: 'asc' };
        if (sortKey === 'status_desc') orderBy = { status: 'desc' };

        const total = await prisma.opportunity.count({ where });
        const orderByClause: Prisma.OpportunityOrderByWithRelationInput[] = Array.isArray(orderBy)
            ? (orderBy as Prisma.OpportunityOrderByWithRelationInput[])
            : [{ status: 'asc' as const }, orderBy];

        const opportunities = await prisma.opportunity.findMany({
            where,
            take,
            skip,
            include: {
                ...(shouldIncludeWalkInDetails ? { driveDetails: true } : {}),
                governmentJobDetails: true,
                ...(shouldIncludeCounts ? { _count: { select: { actions: true, feedback: true } } } : {}),
                socialPosts: true,
            },
            orderBy: orderByClause,
        });

        const pageSize = take;
        const currentPage = explicitOffset !== undefined ? Math.floor(skip / take) + 1 : pageNumber;
        const totalPages = Math.max(1, Math.ceil(total / take));

        const responsePayload = { opportunities, total, page: currentPage, pageSize, totalPages };

        // Cache the list response
        adminCache.set(cacheKey, responsePayload);

        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/opportunities/summary
 * Aggregate counts by status for dashboard widgets.
 */
router.get('/summary', requirePermission('opportunity.review'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'summary_all';
        const cached = adminCache.get(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const liveWhere: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
            deletedAt: null,
            expiredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };
        const [total, active, walkins, liveWalkins, drafts, archived, deleted, expired, submissions] =
            await prisma.$transaction([
                prisma.opportunity.count({ where: { deletedAt: null } }),
                prisma.opportunity.count({ where: liveWhere }),
                prisma.opportunity.count({ where: { deletedAt: null, recruitmentMethod: 'WALK_IN' } }),
                prisma.opportunity.count({ where: { ...liveWhere, recruitmentMethod: 'WALK_IN' } }),
                prisma.opportunity.count({ where: { status: OpportunityStatus.DRAFT as unknown as DbOpportunityStatus, deletedAt: null } }),
                prisma.opportunity.count({ where: { status: OpportunityStatus.ARCHIVED as unknown as DbOpportunityStatus, deletedAt: null } }),
                prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
                prisma.opportunity.count({ where: buildExpiredWhere(now) }),
                prisma.rawOpportunity.count({ where: { status: 'FETCHED' } }),
            ]);

        const responsePayload = { summary: { total, active, walkins, liveWalkins, drafts, archived, deleted, expired, submissions } };
        adminCache.set(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/opportunities/:id
 */
router.get('/:id', requirePermission('opportunity.review'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!id) return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Opportunity ID or slug is required', req.requestId);

        const cacheKey = `detail_${id}`;
        const cached = adminCache.get(cacheKey);
        if (cached) return res.json(cached);

        const opportunity = await prisma.opportunity.findFirst({
            where: buildIdOrSlugWhere(id),
            include: {
                driveDetails: true,
                governmentJobDetails: true,
                events: { orderBy: { eventDate: 'asc' } },
                socialPosts: { orderBy: { createdAt: 'desc' } },
                _count: { select: { actions: true, feedback: true } },
            },
        });
        if (!opportunity) return sendError(res, 404, ErrorCode.NOT_FOUND, 'Opportunity not found', req.requestId);

        const responsePayload = { opportunity };
        adminCache.set(cacheKey, responsePayload);
        res.json(responsePayload);
    } catch (error) {
        next(error);
    }
});

export default router;

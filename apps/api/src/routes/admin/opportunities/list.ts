import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../lib/prisma';
import { Prisma } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { OpportunityService } from '../../../domain/opportunity';
import {
    normalizeTypeParam, parseAdminStatusFilter, buildExpiredWhere,
} from './_helpers';

const router = Router();

/**
 * GET /api/admin/opportunities
 * List and search opportunities with filtering, sorting, and cursor/offset pagination.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, status, includeCounts, includeWalkInDetails, limit, offset, cursor, page, q, sort, linkHealth, activeOnly } = req.query;
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
            const lh = linkHealth.toUpperCase();
            if (lh === 'HEALTHY' || lh === 'RETRYING' || lh === 'BROKEN') {
                where.linkHealth = lh as Prisma.EnumLinkHealthFilter<'Opportunity'>;
            }
        }

        const shouldForceLiveOnly = activeOnly === 'true' && (!statusFilter || statusFilter === OpportunityStatus.PUBLISHED);
        if (shouldForceLiveOnly) {
            where.status = OpportunityStatus.PUBLISHED;
            where.deletedAt = null;
            where.expiredAt = null;
            andFilters.push({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
        }

        const take = typeof limit === 'string' && !Number.isNaN(Number(limit)) ? Number(limit) : undefined;
        const explicitOffset = typeof offset === 'string' && !Number.isNaN(Number(offset)) ? Number(offset) : undefined;
        const pageNumber = typeof page === 'string' && !Number.isNaN(Number(page)) ? Math.max(1, Number(page)) : 1;
        const skip = explicitOffset !== undefined
            ? explicitOffset
            : take !== undefined
                ? (pageNumber - 1) * take
                : undefined;
        const shouldIncludeCounts = includeCounts === 'true';
        const shouldIncludeWalkInDetails = includeWalkInDetails === 'true';
        const keyword = typeof q === 'string' ? q.trim() : '';

        // Full-text search path
        if (keyword) {
            const searchResults = await OpportunityService.searchOpportunities(keyword, {
                filterType: normalizedType,
                limit: take,
                offset: skip,
                cursor: typeof cursor === 'string' ? cursor : undefined,
                statuses: statusFilter && statusFilter !== 'EXPIRED' && statusFilter !== 'DELETED'
                    ? [statusFilter]
                    : ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
                includeExpired: statusFilter === 'EXPIRED' || !statusFilter,
                includeDeleted: statusFilter === 'DELETED',
            });
            return res.json({
                opportunities: searchResults.hits,
                total: searchResults.totalHits,
                nextCursor: searchResults.nextCursor,
                page: pageNumber,
                pageSize: take || searchResults.hits.length || 1,
                totalPages: take ? Math.max(1, Math.ceil(searchResults.totalHits / take)) : 1,
            });
        }

        if (andFilters.length > 0) where.AND = andFilters;

        const sortKey = typeof sort === 'string' ? sort : '';
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
            ...(take !== undefined ? { take } : {}),
            ...(skip !== undefined ? { skip } : {}),
            include: {
                ...(shouldIncludeWalkInDetails ? { walkInDetails: true } : {}),
                ...(shouldIncludeCounts ? { _count: { select: { actions: true, feedback: true } } } : {}),
            },
            orderBy: orderByClause,
        });

        const pageSize = take || total || 1;
        const currentPage = take ? Math.floor((skip || 0) / take) + 1 : 1;
        const totalPages = take ? Math.max(1, Math.ceil(total / take)) : 1;

        res.json({ opportunities, total, page: currentPage, pageSize, totalPages });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/opportunities/summary
 * Aggregate counts by status for dashboard widgets.
 */
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const now = new Date();
        const liveWhere: Prisma.OpportunityWhereInput = {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            expiredAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        };
        const [total, active, walkins, liveWalkins, drafts, archived, deleted, expired] =
            await prisma.$transaction([
                prisma.opportunity.count({ where: { deletedAt: null } }),
                prisma.opportunity.count({ where: liveWhere }),
                prisma.opportunity.count({ where: { deletedAt: null, type: OpportunityType.WALKIN } }),
                prisma.opportunity.count({ where: { ...liveWhere, type: OpportunityType.WALKIN } }),
                prisma.opportunity.count({ where: { status: OpportunityStatus.DRAFT, deletedAt: null } }),
                prisma.opportunity.count({ where: { status: OpportunityStatus.ARCHIVED, deletedAt: null } }),
                prisma.opportunity.count({ where: { deletedAt: { not: null } } }),
                prisma.opportunity.count({ where: buildExpiredWhere(now) }),
            ]);
        res.json({ summary: { total, active, walkins, liveWalkins, drafts, archived, deleted, expired } });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/opportunities/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        if (!id) return res.status(400).json({ message: 'Opportunity ID or slug is required' });
        const opportunity = await prisma.opportunity.findFirst({
            where: { OR: [{ id }, { slug: id }] },
            include: {
                walkInDetails: true,
                events: { orderBy: { eventDate: 'asc' } },
                _count: { select: { actions: true, feedback: true } },
            },
        });
        if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
        res.json({ opportunity });
    } catch (error) {
        next(error);
    }
});

export default router;

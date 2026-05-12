import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { Prisma } from '@fresherflow/database';
import { normalizeTypeParam, parseAdminStatusFilter, buildExpiredWhere, toCsvValue } from './_helpers';

const router = Router();

/**
 * GET /api/admin/opportunities/export
 * Returns a CSV of all opportunities matching the given filters.
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, status } = req.query;
        const where: Prisma.OpportunityWhereInput = {};
        const andFilters: Prisma.OpportunityWhereInput[] = [];
        const now = new Date();

        const normalizedType = typeof type === 'string' ? normalizeTypeParam(type) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (normalizedType) where.type = normalizedType as any;

        const statusFilter = typeof status === 'string' ? parseAdminStatusFilter(status) : undefined;
        if (statusFilter === 'EXPIRED') {
            where.deletedAt = null;
            andFilters.push(buildExpiredWhere(now));
        } else if (statusFilter === 'DELETED') {
            where.deletedAt = { not: null };
        } else if (statusFilter) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where.status = statusFilter as any;
            where.deletedAt = null;
        } else {
            where.deletedAt = null;
        }
        if (andFilters.length > 0) where.AND = andFilters;

        const opportunities = await prisma.opportunity.findMany({ where, orderBy: { postedAt: 'desc' } });

        const header = ['id', 'slug', 'type', 'status', 'title', 'company', 'locations', 'postedAt', 'expiresAt', 'linkHealth'].join(',');
        const rows = opportunities.map((opp) =>
            [
                toCsvValue(opp.id), toCsvValue(opp.slug), toCsvValue(opp.type),
                toCsvValue(opp.status), toCsvValue(opp.title), toCsvValue(opp.company),
                toCsvValue(opp.locations), toCsvValue(opp.postedAt),
                toCsvValue(opp.expiresAt), toCsvValue(opp.linkHealth),
            ].join(','),
        );

        // Audit log (fire and forget)
        if (req.adminId) {
            prisma.adminAudit.create({
                data: {
                    userId: req.adminId,
                    action: 'EXPORT',
                    targetId: 'opportunities',
                    reason: `type=${normalizedType || 'any'},status=${status || 'any'}`,
                },
            }).catch(() => {});
        }

        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="opportunities.csv"');
        res.send(csv);
    } catch (error) {
        next(error);
    }
});

export default router;

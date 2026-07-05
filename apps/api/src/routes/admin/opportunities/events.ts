import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../../infrastructure/database/prisma';
import { adminRateLimit } from '../../../middleware/adminRateLimit';
import { withAdminAudit } from '../../../middleware/adminAudit';
import { AppError } from '../../../middleware/errorHandler';
import { invalidatePublicOpportunityCache } from '../../../infrastructure/services/publicOpportunityCache.service';
import { getGranularTagsForOpportunity } from '../../../infrastructure/services/publish.service';
import { parseEventType } from './_helpers';
import { Prisma } from '@fresherflow/database';
import { Opportunity } from '@fresherflow/types';

const router = Router({ mergeParams: true });

/** Resolve opportunity by id or slug — shared guard for all event routes */
async function resolveOpportunity(idParam: string) {
    if (!idParam) throw new AppError('Opportunity ID is required', 400);
    const opp = await prisma.opportunity.findFirst({
        where: { OR: [{ id: idParam }, { slug: idParam }] },
        select: { id: true, slug: true, type: true, company: true, locations: true, requiredSkills: true, title: true, allowedPassoutYears: true },
    });
    if (!opp) throw new AppError('Opportunity not found', 404);
    return opp;
}

/**
 * GET /api/admin/opportunities/:id/events
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await resolveOpportunity(String(req.params.id || ''));
        const events = await prisma.opportunityEvent.findMany({
            where: { opportunityId: opp.id },
            orderBy: { eventDate: 'asc' },
        });
        res.json({ events });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/opportunities/:id/events
 */
router.post('/', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await resolveOpportunity(String(req.params.id || ''));
        const title = String(req.body?.title || '').trim();
        const eventDate = req.body?.eventDate ? new Date(req.body.eventDate) : null;
        if (!title) throw new AppError('Event title is required', 400);
        if (!eventDate || Number.isNaN(eventDate.getTime())) throw new AppError('Valid eventDate is required', 400);

        const event = await prisma.opportunityEvent.create({
            data: {
                opportunityId: opp.id,
                eventType: parseEventType(req.body?.eventType),
                eventDate, title,
                notes: req.body?.notes ? String(req.body.notes) : null,
                sourceLink: req.body?.sourceLink ? String(req.body.sourceLink) : null,
            },
        });

        res.status(201).json({ event });
        void invalidatePublicOpportunityCache({ idsOrSlugs: [opp.id, opp.slug], purgeFeed: false, type: opp.type as string, tags: getGranularTagsForOpportunity(opp as unknown as Partial<Opportunity>) });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/admin/opportunities/:id/events/:eventId
 */
router.patch('/:eventId', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await resolveOpportunity(String(req.params.id || ''));
        const eventId = String(req.params.eventId || '');
        if (!eventId) throw new AppError('Event ID is required', 400);

        const current = await prisma.opportunityEvent.findFirst({
            where: { id: eventId, opportunityId: opp.id },
            select: { id: true },
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
        if (req.body?.eventType !== undefined) data.eventType = parseEventType(req.body.eventType);
        if (req.body?.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes) : null;
        if (req.body?.sourceLink !== undefined) data.sourceLink = req.body.sourceLink ? String(req.body.sourceLink) : null;

        const event = await prisma.opportunityEvent.update({ where: { id: eventId }, data });
        res.json({ event });
        void invalidatePublicOpportunityCache({ idsOrSlugs: [opp.id, opp.slug], purgeFeed: false, type: opp.type as string, tags: getGranularTagsForOpportunity(opp as unknown as Partial<Opportunity>) });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/opportunities/:id/events/:eventId
 */
router.delete('/:eventId', adminRateLimit, withAdminAudit('UPDATE'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const opp = await resolveOpportunity(String(req.params.id || ''));
        const eventId = String(req.params.eventId || '');
        if (!eventId) throw new AppError('Event ID is required', 400);

        await prisma.opportunityEvent.deleteMany({ where: { id: eventId, opportunityId: opp.id } });
        res.json({ success: true });
        void invalidatePublicOpportunityCache({ idsOrSlugs: [opp.id, opp.slug], purgeFeed: false, type: opp.type as string, tags: getGranularTagsForOpportunity(opp as unknown as Partial<Opportunity>) });
    } catch (error) {
        next(error);
    }
});

export default router;

import prisma from '../../infrastructure/database/prisma';
import express, { NextFunction, Request, Response } from 'express';
import { eventService } from '../../infrastructure/services/event.service';

import { optionalAuth } from '../../middleware/auth';
import { updateOpportunityEngagement } from '../../application/opportunity/engagement';

const router = express.Router();

// IP hashing removed for privacy-first tracking

function normalize(input: unknown, max = 200): string | null {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
}

router.post('/opportunities/:id/click', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Disabled & Commented Out Temporarily - Bypassed to save API & DB free tier resources
        // Job views/clicks are now fully handled in real-time on Firebase RTDB.
        return res.status(202).json({ ok: true });

        /*
        const opportunityId = String(req.params.id || '').trim();
        if (!opportunityId) {
            return res.status(400).json({ message: 'Opportunity ID is required' });
        }

        const opportunity = await prisma.opportunity.findUnique({
            where: { id: opportunityId },
            select: { id: true, status: true, deletedAt: true }
        });

        if (!opportunity || opportunity.deletedAt || opportunity.status !== 'PUBLISHED') {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        const source = normalize(req.body?.source, 100) || 'unknown';
        const sessionId = normalize(req.body?.sessionId, 100);
        const targetUrl = normalize(req.body?.targetUrl, 500);
        const referrer = normalize(req.get('referer') || req.get('referrer'), 500);

        let isInternal = false;
        let userId: string | null = req.userId || null;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true, email: true }
            });

            if (!user) {
                userId = null;
            } else {
                const internalEmails = (process.env.INTERNAL_TRACKING_EMAILS || '')
                    .split(',')
                    .map((value) => value.trim().toLowerCase())
                    .filter(Boolean);

                isInternal = user.role === 'ADMIN' || internalEmails.includes((user.email || '').toLowerCase());
            }
        }

        if (!isInternal && source.startsWith('admin_')) {
            isInternal = true;
        }

        // Use Buffered Event Service
        await eventService.track({
            type: 'CLICK_APPLY',
            opportunityId: opportunity.id,
            userId: userId || undefined,
            sessionId: sessionId || undefined,
            source,
            metadata: {
                targetUrl,
                referrer,
                isInternal
            }
        });

        // Update Engagement Counters (Item 160 in plan)
        if (!isInternal) {
            await updateOpportunityEngagement(opportunity.id, 'click');
        }

        return res.status(202).json({ ok: true });
        */
    } catch (error) {
        return next(error);
    }
});

export default router;

import prisma from '../lib/prisma';
import express, { NextFunction, Request, Response, Router } from 'express';
import { OpportunityStatus, Profile, Opportunity } from '@fresherflow/types';

import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { alertPreferencesSchema, pushSubscriptionSchema } from '../utils/validation';
import { checkEligibility } from '../domain/eligibility';

const router: Router = express.Router();
const UNREAD_COUNT_CACHE_TTL_MS = 30 * 1000;
const unreadCountCache = new Map<string, { count: number; expiresAt: number }>();

function getCachedUnreadCount(userId: string): number | null {
    const cached = unreadCountCache.get(userId);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        unreadCountCache.delete(userId);
        return null;
    }
    return cached.count;
}

function setCachedUnreadCount(userId: string, count: number) {
    unreadCountCache.set(userId, { count, expiresAt: Date.now() + UNREAD_COUNT_CACHE_TTL_MS });
}

function invalidateUnreadCount(userId: string) {
    unreadCountCache.delete(userId);
}


router.get('/preferences', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const preference = await prisma.alertPreference.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });

        res.json({ preference });
    } catch (error) {
        next(error);
    }
});

router.get('/feed', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const kindRaw = String(req.query.kind || 'all').toUpperCase();
        const limitRaw = Number(req.query.limit || 50);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

        const where: {
            userId: string;
            kind?: 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';
            channel?: 'APP';
        } = { userId };
        where.channel = 'APP';

        if (['DAILY_DIGEST', 'CLOSING_SOON', 'HIGHLIGHT', 'APP_UPDATE', 'NEW_JOB', 'EVENT_REMINDER'].includes(kindRaw)) {
            where.kind = kindRaw as typeof where.kind;
        }

        const userWithProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { profile: true }
        });
        const profile = userWithProfile?.profile || null;

        const deliveries = await prisma.alertDelivery.findMany({
            where,
            orderBy: { sentAt: 'desc' },
            take: Math.min(limit * 3, 300),
            include: {
                opportunity: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        company: true,
                        type: true,
                        allowedDegrees: true,
                        allowedCourses: true,
                        allowedSpecializations: true,
                        allowedPassoutYears: true,
                        requiredSkills: true,
                        expiresAt: true,
                        status: true,
                        deletedAt: true,
                        expiredAt: true,
                        applyLink: true,
                        companyWebsite: true,
                        savedBy: {
                            where: { userId },
                            select: { id: true },
                            take: 1,
                        }
                    }
                }
            }
        });

        const now = new Date();
        const filteredDeliveries = deliveries.filter((item) => {
            if (!item.opportunity) return true;
            if (item.opportunity.status !== OpportunityStatus.PUBLISHED) return false;
            if (item.opportunity.deletedAt || item.opportunity.expiredAt) return false;
            if (item.opportunity.expiresAt && new Date(item.opportunity.expiresAt) <= now) return false;
            if (!profile) return false;
            return checkEligibility(item.opportunity as unknown as Opportunity, profile as unknown as Profile, userId).eligible;
        }).slice(0, limit);

        const normalizedDeliveries = filteredDeliveries.map((item) => ({
            ...item,
            opportunity: item.opportunity
                ? {
                    ...item.opportunity,
                    isSaved: item.opportunity.savedBy.length > 0,
                    savedBy: undefined,
                }
                : null,
        }));

        const summary = {
            total: normalizedDeliveries.length,
            dailyDigest: normalizedDeliveries.filter((item) => (item.kind as string) === 'DAILY_DIGEST').length,
            closingSoon: normalizedDeliveries.filter((item) => (item.kind as string) === 'CLOSING_SOON').length,
            highlight: normalizedDeliveries.filter((item) => (item.kind as string) === 'HIGHLIGHT').length,
            appUpdate: normalizedDeliveries.filter((item) => (item.kind as string) === 'APP_UPDATE').length,
            newJob: normalizedDeliveries.filter((item) => (item.kind as string) === 'NEW_JOB').length,
            eventReminder: normalizedDeliveries.filter((item) => (item.kind as string) === 'EVENT_REMINDER').length,
        };

        const unreadRaw = await prisma.alertDelivery.findMany({
            where: { userId, readAt: null, channel: 'APP' },
            include: {
                opportunity: {
                    select: {
                        id: true,
                        type: true,
                        allowedDegrees: true,
                        allowedCourses: true,
                        allowedSpecializations: true,
                        allowedPassoutYears: true,
                        requiredSkills: true,
                        expiresAt: true,
                        status: true,
                        deletedAt: true,
                        expiredAt: true,
                    }
                }
            }
        });

        const unreadCount = unreadRaw.filter((item) => {
            if (!item.opportunity) return true;
            if (item.opportunity.status !== OpportunityStatus.PUBLISHED) return false;
            if (item.opportunity.deletedAt || item.opportunity.expiredAt) return false;
            if (item.opportunity.expiresAt && new Date(item.opportunity.expiresAt) <= now) return false;
            if (!profile) return false;
            return checkEligibility(item.opportunity as unknown as Opportunity, profile as unknown as Profile, userId).eligible;
        }).length;

        res.json({ deliveries: normalizedDeliveries, summary, unreadCount });
    } catch (error) {
        next(error);
    }
});

router.get('/:id/digest-items', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const alertId = String(req.params.id || '');
        if (!userId) return next(new AppError('Unauthorized', 401));

        const delivery = await prisma.alertDelivery.findFirst({
            where: {
                id: alertId,
                userId,
                channel: 'APP'
            },
            select: {
                id: true,
                kind: true,
                metadata: true
            }
        });

        if (!delivery || delivery.kind !== 'DAILY_DIGEST') {
            return next(new AppError('Digest alert not found', 404));
        }

        let opportunityIds: string[] = [];
        let requestedCount = 0;

        if (delivery.metadata) {
            try {
                const parsed = JSON.parse(delivery.metadata) as { opportunityIds?: unknown; count?: unknown };
                if (Array.isArray(parsed.opportunityIds)) {
                    opportunityIds = parsed.opportunityIds
                        .filter((value): value is string => typeof value === 'string' && value.length > 0);
                }
                if (typeof parsed.count === 'number' && Number.isFinite(parsed.count)) {
                    requestedCount = Math.max(0, Math.floor(parsed.count));
                }
            } catch {
                opportunityIds = [];
                requestedCount = 0;
            }
        }

        if (requestedCount === 0) requestedCount = opportunityIds.length;
        if (opportunityIds.length === 0) {
            return res.json({ items: [], requestedCount, activeCount: 0 });
        }

        const opportunities = await prisma.opportunity.findMany({
            where: {
                id: { in: opportunityIds },
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                expiredAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
                id: true,
                slug: true,
                title: true,
                company: true,
                type: true,
                locations: true,
                allowedDegrees: true,
                allowedCourses: true,
                allowedSpecializations: true,
                allowedPassoutYears: true,
                requiredSkills: true,
                applyLink: true,
                companyWebsite: true,
                expiresAt: true,
                savedBy: {
                    where: { userId },
                    select: { id: true },
                    take: 1,
                }
            }
        });

        const userWithProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { profile: true }
        });
        const profile = userWithProfile?.profile || null;

        const eligibleOpportunities = opportunities.filter((item) => {
            if (!profile) return false;
            return checkEligibility(item as unknown as Opportunity, profile as unknown as Profile, userId).eligible;
        });

        const byId = new Map(eligibleOpportunities.map((item) => [item.id, item]));
        const ordered = opportunityIds
            .map((id) => byId.get(id))
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .map((item) => ({
                ...item,
                isSaved: item.savedBy.length > 0,
                savedBy: undefined
            }));

        return res.json({
            items: ordered,
            requestedCount,
            activeCount: ordered.length
        });
    } catch (error) {
        next(error);
    }
});

router.get('/unread-count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));
        const cachedCount = getCachedUnreadCount(userId);
        if (cachedCount !== null) {
            return res.json({ count: cachedCount });
        }

        const userWithProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { profile: true }
        });
        const profile = userWithProfile?.profile || null;
        const now = new Date();

        const unreadRaw = await prisma.alertDelivery.findMany({
            where: { userId, readAt: null, channel: 'APP' },
            include: {
                opportunity: {
                    select: {
                        id: true,
                        type: true,
                        allowedDegrees: true,
                        allowedCourses: true,
                        allowedSpecializations: true,
                        allowedPassoutYears: true,
                        requiredSkills: true,
                        expiresAt: true,
                        status: true,
                        deletedAt: true,
                        expiredAt: true,
                    }
                }
            }
        });

        const count = unreadRaw.filter((item) => {
            if (!item.opportunity) return true;
            if (item.opportunity.status !== OpportunityStatus.PUBLISHED) return false;
            if (item.opportunity.deletedAt || item.opportunity.expiredAt) return false;
            if (item.opportunity.expiresAt && new Date(item.opportunity.expiresAt) <= now) return false;
            if (!profile) return false;
            return checkEligibility(item.opportunity as unknown as Opportunity, profile as unknown as Profile, userId).eligible;
        }).length;

        setCachedUnreadCount(userId, count);
        res.json({ count });
    } catch (error) {
        next(error);
    }
});

router.post('/mark-all-read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        await prisma.alertDelivery.updateMany({
            where: {
                userId,
                readAt: null,
                channel: 'APP'
            },
            data: {
                readAt: new Date()
            }
        });

        invalidateUnreadCount(userId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/read', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) return next(new AppError('Unauthorized', 401));

        await prisma.alertDelivery.updateMany({
            where: {
                id: String(id),
                userId, // Ensure user owns the alert
                channel: 'APP'
            },
            data: {
                readAt: new Date()
            }
        });

        invalidateUnreadCount(userId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const result = await prisma.alertDelivery.deleteMany({
            where: {
                id: String(id),
                userId,
                channel: 'APP'
            }
        });

        invalidateUnreadCount(userId);
        res.json({ success: true, deleted: result.count > 0 });
    } catch (error) {
        next(error);
    }
});

router.put('/preferences', requireAuth, validate(alertPreferencesSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const preference = await prisma.alertPreference.upsert({
            where: { userId },
            create: {
                userId,
                ...req.body,
            },
            update: req.body,
        });

        res.json({ preference });
    } catch (error) {
        next(error);
    }
});

router.post('/push/subscribe', requireAuth, validate(pushSubscriptionSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const subscription = req.body.subscription as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
        };

        await prisma.$transaction(async (tx) => {
            await tx.pushSubscription.deleteMany({
                where: {
                    endpoint: subscription.endpoint,
                    userId: { not: userId },
                },
            });

            await tx.pushSubscription.upsert({
                where: { userId },
                create: {
                    userId,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    userAgent: req.get('user-agent') || null,
                },
                update: {
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    userAgent: req.get('user-agent') || null,
                },
            });
        });

        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

router.delete('/push/unsubscribe', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        await prisma.pushSubscription.deleteMany({ where: { userId } });
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

export default router;

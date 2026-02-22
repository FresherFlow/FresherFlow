import prisma from '../lib/prisma';
import express, { NextFunction, Request, Response, Router } from 'express';

import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { alertPreferencesSchema, pushSubscriptionSchema } from '../utils/validation';

const router: Router = express.Router();


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
            where.kind = kindRaw as any;
        }

        const deliveries = await prisma.alertDelivery.findMany({
            where,
            orderBy: { sentAt: 'desc' },
            take: limit,
            include: {
                opportunity: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        company: true,
                        type: true,
                        expiresAt: true,
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

        const normalizedDeliveries = deliveries.map((item) => ({
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
            dailyDigest: normalizedDeliveries.filter((item) => (item.kind as any) === 'DAILY_DIGEST').length,
            closingSoon: normalizedDeliveries.filter((item) => (item.kind as any) === 'CLOSING_SOON').length,
            highlight: normalizedDeliveries.filter((item) => (item.kind as any) === 'HIGHLIGHT').length,
            appUpdate: normalizedDeliveries.filter((item) => (item.kind as any) === 'APP_UPDATE').length,
            newJob: normalizedDeliveries.filter((item) => (item.kind as any) === 'NEW_JOB').length,
            eventReminder: normalizedDeliveries.filter((item) => (item.kind as any) === 'EVENT_REMINDER').length,
        };

        const unreadCount = await prisma.alertDelivery.count({
            where: { userId, readAt: null, channel: 'APP' }
        });

        res.json({ deliveries: normalizedDeliveries, summary, unreadCount });
    } catch (error) {
        next(error);
    }
});

router.get('/unread-count', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(new AppError('Unauthorized', 401));

        const count = await prisma.alertDelivery.count({
            where: {
                userId,
                readAt: null,
                channel: 'APP'
            }
        });

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

        res.json({ success: true });
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

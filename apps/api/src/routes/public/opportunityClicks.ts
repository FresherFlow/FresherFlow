import prisma from '../../infrastructure/database/prisma';
import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';

import { optionalAuth } from '../../middleware/auth';

const router = express.Router();


function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const cfIp = req.headers['cf-connecting-ip'];
    const realIp = req.headers['x-real-ip'];

    const firstForwarded = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : undefined;

    const raw = (firstForwarded || (Array.isArray(cfIp) ? cfIp[0] : cfIp) || (Array.isArray(realIp) ? realIp[0] : realIp) || req.ip || 'unknown')
        .toString()
        .trim();

    return raw.replace(/^::ffff:/, '');
}

function hashIp(ip: string): string {
    const salt = process.env.ANALYTICS_IP_HASH_SALT || 'fresherflow-default-salt';
    return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

function normalize(input: unknown, max = 200): string | null {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
}

router.post('/opportunities/:id/click', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
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
        const userAgent = normalize(req.get('user-agent'), 300);
        const ipHash = hashIp(getClientIp(req));

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

        await prisma.opportunityClick.create({
            data: {
                opportunityId: opportunity.id,
                userId,
                sessionId,
                source,
                targetUrl,
                referrer,
                userAgent,
                ipHash,
                isInternal,
            }
        });

        return res.status(202).json({ ok: true });
    } catch (error) {
        return next(error);
    }
});

export default router;

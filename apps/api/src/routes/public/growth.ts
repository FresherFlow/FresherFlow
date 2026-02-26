import express, { Request, Response } from 'express';
import { recordGrowthEvent } from '../../services/growthFunnel.service';
import { createRateLimiter } from '../../middleware/rateLimit';

const router = express.Router();
const growthEventLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many analytics events. Please retry shortly.',
    keyPrefix: 'growth_event_public',
});
const DETAIL_VIEW_DEDUPE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DEDUPE_TTL_MS = 10 * 1000;
const recentEvents = new Map<string, number>();

const ALLOWED_EVENTS = new Set([
    'DETAIL_VIEW',
    'LOGIN_VIEW',
    'AUTH_SUCCESS',
    'SIGNUP_SUCCESS',
    'SAVE_JOB',
    'APPLY_CLICK',
    'SHARE_JOB',
    'SIGNUP_VIEW',
    'INSTALL_PROMPT_SHOWN',
    'INSTALL_ACCEPTED',
    'OPENED_STANDALONE',
]);

function cleanupRecentEvents(now: number) {
    for (const [key, timestamp] of recentEvents.entries()) {
        if (timestamp <= now) {
            recentEvents.delete(key);
        }
    }
}

function sanitizeValue(value: unknown, maxLen = 128) {
    return String(value || '').trim().slice(0, maxLen);
}

function getEventDedupeWindow(event: string) {
    if (event === 'DETAIL_VIEW') {
        return DETAIL_VIEW_DEDUPE_TTL_MS;
    }
    return DEFAULT_DEDUPE_TTL_MS;
}

// Lightweight public tracking endpoint for growth funnel events.
router.post('/event', growthEventLimiter, async (req: Request, res: Response) => {
    const { source, event, route, sessionId, opportunityId } = req.body || {};
    const normalizedEvent = sanitizeValue(event, 64).toUpperCase();

    if (!ALLOWED_EVENTS.has(normalizedEvent)) {
        return res.status(400).json({ ok: false, message: 'Invalid growth event' });
    }

    const normalizedSource = sanitizeValue(source, 64).toLowerCase() || 'unknown';
    const normalizedRoute = sanitizeValue(route, 256).toLowerCase();
    const normalizedSessionId = sanitizeValue(sessionId, 128);
    const normalizedOpportunityId = sanitizeValue(opportunityId, 64).toLowerCase();

    const now = Date.now();
    cleanupRecentEvents(now);

    const dedupeKey = [
        normalizedSource,
        normalizedEvent,
        normalizedRoute,
        normalizedSessionId,
        normalizedOpportunityId,
    ].join('|');

    const lastSeen = recentEvents.get(dedupeKey);
    const ttl = getEventDedupeWindow(normalizedEvent);
    if (!lastSeen || lastSeen <= now) {
        recentEvents.set(dedupeKey, now + ttl);
        await recordGrowthEvent(normalizedSource, normalizedEvent);
    }

    res.status(202).json({ ok: true });
});

export default router;

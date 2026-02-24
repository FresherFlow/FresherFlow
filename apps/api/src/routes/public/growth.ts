import express, { Request, Response } from 'express';
import { recordGrowthEvent } from '../../services/growthFunnel.service';

const router = express.Router();
const RECENT_EVENT_TTL_MS = 10 * 1000;
const recentEvents = new Map<string, number>();

function cleanupRecentEvents(now: number) {
    for (const [key, timestamp] of recentEvents.entries()) {
        if (now - timestamp > RECENT_EVENT_TTL_MS) {
            recentEvents.delete(key);
        }
    }
}

// Lightweight public tracking endpoint for growth funnel events.
router.post('/event', async (req: Request, res: Response) => {
    const { source, event, route, sessionId } = req.body || {};
    const now = Date.now();
    cleanupRecentEvents(now);

    const dedupeKey = [
        String(source || 'unknown').toLowerCase().trim(),
        String(event || '').toUpperCase().trim(),
        String(route || '').toLowerCase().trim(),
        String(sessionId || '').trim(),
    ].join('|');

    const lastSeen = recentEvents.get(dedupeKey);
    if (!lastSeen || now - lastSeen > RECENT_EVENT_TTL_MS) {
        recentEvents.set(dedupeKey, now);
        await recordGrowthEvent(source, event);
    }

    res.status(202).json({ ok: true });
});

export default router;

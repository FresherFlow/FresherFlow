import prisma from '../../infrastructure/database/prisma';
import { GrowthFunnelEvent } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';
import { 
    FunnelEvent, SourceCounters, 
    emptyCounters, sanitizeSource, normalizeEvent, formatFunnelRows,
    type GrowthWindow 
} from '@fresherflow/domain';
export type { GrowthWindow } from '@fresherflow/domain';

// Safety fallback when DB migration is pending/unavailable.
const fallbackSourceMetrics = new Map<string, SourceCounters>();
type GrowthEventModel = {
    create: (args: { data: { source: string; event: GrowthFunnelEvent } }) => Promise<unknown>;
    groupBy: (args: {
        by: ['source', 'event'];
        where?: { createdAt: { gte: Date } };
        _count: { _all: true };
    }) => Promise<Array<{ source: string | null; event: string; _count: { _all: number } }>>;
};

function toDateRange(window: GrowthWindow): Date | null {
    if (window === 'all') return null;
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

export async function recordGrowthEvent(source?: string, event?: string) {
    const sanitizedSource = sanitizeSource(source);
    const normalizedEvent = normalizeEvent(event);
    if (!normalizedEvent) return;

    try {
        await (prisma as unknown as { growthEvent: GrowthEventModel }).growthEvent.create({
            data: {
                source: sanitizedSource,
                event: normalizedEvent as GrowthFunnelEvent
            }
        });
    } catch {
        const existing = fallbackSourceMetrics.get(sanitizedSource) || emptyCounters();
        existing[normalizedEvent] += 1;
        fallbackSourceMetrics.set(sanitizedSource, existing);
        logger.warn('Growth event persisted to fallback store', { source: sanitizedSource, event: normalizedEvent });
    }
}

export async function recordAuthSuccess(source?: string, isSignup = false) {
    await recordGrowthEvent(source, 'AUTH_SUCCESS');
    if (isSignup) await recordGrowthEvent(source, 'SIGNUP_SUCCESS');
}

export async function getGrowthFunnelMetrics(window: GrowthWindow = '30d') {
    const since = toDateRange(window);
    const fallbackRows = Array.from(fallbackSourceMetrics.entries()).map(([source, counters]) => ({ source, counters }));

    try {
        const grouped = await (prisma as unknown as { growthEvent: GrowthEventModel }).growthEvent.groupBy({
            by: ['source', 'event'],
            ...(since ? { where: { createdAt: { gte: since } } } : {}),
            _count: { _all: true }
        });

        const bySource = new Map<string, SourceCounters>();
        for (const row of grouped) {
            const source = row.source || 'unknown';
            const counters = bySource.get(source) || emptyCounters();
            counters[row.event as FunnelEvent] = row._count._all;
            bySource.set(source, counters);
        }

        const dbRows = Array.from(bySource.entries()).map(([source, counters]) => ({ source, counters }));
        return formatFunnelRows([...dbRows, ...fallbackRows]);
    } catch {
        return formatFunnelRows(fallbackRows);
    }
}

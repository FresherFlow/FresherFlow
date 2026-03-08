import prisma from '../lib/prisma';
import { GrowthFunnelEvent } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';



export type FunnelEvent =
    | 'DETAIL_VIEW'
    | 'LOGIN_VIEW'
    | 'AUTH_SUCCESS'
    | 'SIGNUP_SUCCESS'
    | 'SAVE_JOB'
    | 'APPLY_CLICK'
    | 'SHARE_JOB'
    | 'SIGNUP_VIEW'
    | 'INSTALL_PROMPT_SHOWN'
    | 'INSTALL_ACCEPTED'
    | 'OPENED_STANDALONE';
export type GrowthWindow = '24h' | '7d' | '30d' | 'all';

type SourceCounters = Record<FunnelEvent, number>;

// Safety fallback when DB migration is pending/unavailable.
const fallbackSourceMetrics = new Map<string, SourceCounters>();

function emptyCounters(): SourceCounters {
    return {
        DETAIL_VIEW: 0,
        LOGIN_VIEW: 0,
        AUTH_SUCCESS: 0,
        SIGNUP_SUCCESS: 0,
        SAVE_JOB: 0,
        APPLY_CLICK: 0,
        SHARE_JOB: 0,
        SIGNUP_VIEW: 0,
        INSTALL_PROMPT_SHOWN: 0,
        INSTALL_ACCEPTED: 0,
        OPENED_STANDALONE: 0,
    };
}

function sanitizeSource(source?: string): string {
    const value = (source || '').trim().toLowerCase();
    if (!value) return 'unknown';
    return value.replace(/[^a-z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

function normalizeEvent(event?: string): FunnelEvent | null {
    const normalized = (event || '').trim().toUpperCase() as FunnelEvent;
    const allowed: FunnelEvent[] = [
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
    ];
    if (!allowed.includes(normalized)) {
        return null;
    }
    return normalized;
}

function fallbackRecord(source: string, event: FunnelEvent) {
    const existing = fallbackSourceMetrics.get(source) || emptyCounters();
    existing[event] += 1;
    fallbackSourceMetrics.set(source, existing);
}

function toDateRange(window: GrowthWindow): Date | null {
    if (window === 'all') return null;
    const now = Date.now();
    if (window === '24h') return new Date(now - 24 * 60 * 60 * 1000);
    if (window === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

function formatRows(rows: Array<{ source: string; counters: SourceCounters }>) {
    const sources = rows.map(({ source, counters }) => {
        const detailToLoginPct = counters.DETAIL_VIEW > 0
            ? Number(((counters.LOGIN_VIEW / counters.DETAIL_VIEW) * 100).toFixed(2))
            : 0;
        const loginToAuthPct = counters.LOGIN_VIEW > 0
            ? Number(((counters.AUTH_SUCCESS / counters.LOGIN_VIEW) * 100).toFixed(2))
            : 0;

        return {
            source,
            ...counters,
            detailToLoginPct,
            loginToAuthPct
        };
    }).sort((a, b) => b.AUTH_SUCCESS - a.AUTH_SUCCESS);

    const totals = sources.reduce((acc: any, row: any) => {
        acc.DETAIL_VIEW += row.DETAIL_VIEW;
        acc.LOGIN_VIEW += row.LOGIN_VIEW;
        acc.AUTH_SUCCESS += row.AUTH_SUCCESS;
        acc.SIGNUP_SUCCESS += row.SIGNUP_SUCCESS;
        acc.SAVE_JOB += row.SAVE_JOB || 0;
        acc.APPLY_CLICK += row.APPLY_CLICK || 0;
        acc.SHARE_JOB += row.SHARE_JOB || 0;
        acc.SIGNUP_VIEW += row.SIGNUP_VIEW || 0;
        acc.INSTALL_PROMPT_SHOWN += row.INSTALL_PROMPT_SHOWN || 0;
        acc.INSTALL_ACCEPTED += row.INSTALL_ACCEPTED || 0;
        acc.OPENED_STANDALONE += row.OPENED_STANDALONE || 0;
        return acc;
    }, emptyCounters());

    return { totals, sources };
}

export async function recordGrowthEvent(source?: string, event?: string) {
    const sanitizedSource = sanitizeSource(source);
    const normalizedEvent = normalizeEvent(event);
    if (!normalizedEvent) return;

    try {
        await prisma.growthEvent.create({
            data: {
                source: sanitizedSource,
                event: normalizedEvent as GrowthFunnelEvent
            }
        });
    } catch (error) {
        fallbackRecord(sanitizedSource, normalizedEvent);
        logger.warn('Growth event persisted to fallback store', { source: sanitizedSource, event: normalizedEvent, error });
    }
}

export async function recordAuthSuccess(source?: string, isSignup = false) {
    await recordGrowthEvent(source, 'AUTH_SUCCESS');
    if (isSignup) {
        await recordGrowthEvent(source, 'SIGNUP_SUCCESS');
    }
}

export async function getGrowthFunnelMetrics(window: GrowthWindow = '30d') {
    const since = toDateRange(window);
    const fallbackRows = Array.from(fallbackSourceMetrics.entries()).map(([source, counters]) => ({ source, counters }));

    try {
        const grouped = await prisma.growthEvent.groupBy({
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
        return formatRows([...dbRows, ...fallbackRows]);
    } catch (error) {
        logger.warn('Growth metrics served from fallback store', { error });
        return formatRows(fallbackRows);
    }
}

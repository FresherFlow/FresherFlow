/**
 * Phase 13 - ingestion metrics and source health.
 *
 * Health is derived from recent runs rather than stored, so it can never drift
 * out of sync with the run history. A source is unhealthy when its most recent
 * run failed, and stale when it has not run within several cycles.
 */

import prisma from '../../infrastructure/database/prisma';

export type SourceHealth = 'healthy' | 'degraded' | 'failing' | 'never_run' | 'disabled';

export interface SourceMetric {
    sourceId: string;
    name: string;
    enabled: boolean;
    sourceType: string;
    health: SourceHealth;
    lastRunAt: Date | null;
    lastSuccessAt: Date | null;
    runsLast24h: number;
    draftsLast24h: number;
    errorsLast24h: number;
    /** Consecutive failed runs, the clearest signal of a broken source. */
    consecutiveFailures: number;
}

const DAY_MS = 86_400_000;
const STALE_AFTER_CYCLES = 3;

export async function getSourceMetrics(
    options: { since?: Date } = {}
): Promise<SourceMetric[]> {
    const since = options.since ?? new Date(Date.now() - DAY_MS);
    const now = new Date();

    const [sources, recentRuns] = await Promise.all([
        prisma.ingestionSource.findMany({ orderBy: { name: 'asc' } }),
        prisma.ingestionRun.findMany({
            where: { startedAt: { gte: since } },
            select: {
                sourceId: true,
                status: true,
                fetchedCount: true,
                draftCreatedCount: true,
                errorCount: true,
            },
        }),
    ]);

    // Recent runs for the 24h counters.
    const bySourceRecent = new Map<string, typeof recentRuns>();
    for (const run of recentRuns) {
        const list = bySourceRecent.get(run.sourceId) ?? [];
        list.push(run);
        bySourceRecent.set(run.sourceId, list);
    }

    // Only the most recent runs per source, for the consecutive-failure count.
    const latestRuns = await prisma.ingestionRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 500,
        select: { sourceId: true, status: true, startedAt: true },
    });

    const latestBySource = new Map<string, { status: string; startedAt: Date }[]>();
    for (const run of latestRuns) {
        const list = latestBySource.get(run.sourceId) ?? [];
        list.push(run);
        latestBySource.set(run.sourceId, list);
    }

    return sources.map((source) => {
        const recent = bySourceRecent.get(source.id) ?? [];
        const latest = latestBySource.get(source.id) ?? [];

        let consecutiveFailures = 0;
        for (const run of latest) {
            if (run.status === 'FAILED') consecutiveFailures += 1;
            else break;
        }

        return {
            sourceId: source.id,
            name: source.name,
            enabled: source.enabled,
            sourceType: source.sourceType,
            health: computeHealth(source, latest, consecutiveFailures, now),
            lastRunAt: source.lastRunAt,
            lastSuccessAt: source.lastSuccessAt,
            runsLast24h: recent.length,
            draftsLast24h: recent.reduce((sum, run) => sum + run.draftCreatedCount, 0),
            errorsLast24h: recent.reduce((sum, run) => sum + run.errorCount, 0),
            consecutiveFailures,
        };
    });
}

function computeHealth(
    source: { enabled: boolean; runFrequencyMinutes: number; lastRunAt: Date | null },
    latest: { status: string; startedAt: Date }[],
    consecutiveFailures: number,
    now: Date
): SourceHealth {
    if (!source.enabled) return 'disabled';
    if (latest.length === 0 || !source.lastRunAt) return 'never_run';

    if (consecutiveFailures >= 3) return 'failing';

    const staleAfter = source.runFrequencyMinutes * 60_000 * STALE_AFTER_CYCLES;
    if (now.getTime() - source.lastRunAt.getTime() > staleAfter) return 'degraded';

    if (latest[0].status === 'FAILED' || latest[0].status === 'PARTIAL') return 'degraded';
    return 'healthy';
}

export interface IngestionOverview {
    sources: SourceMetric[];
    totals: {
        sourceCount: number;
        enabledCount: number;
        healthyCount: number;
        failingCount: number;
        draftsLast24h: number;
        rejectedLast24h: number;
        dedupedLast24h: number;
    };
}

export async function getIngestionOverview(): Promise<IngestionOverview> {
    const metrics = await getSourceMetrics();
    const since = new Date(Date.now() - DAY_MS);

    const [rejected, deduped] = await Promise.all([
        prisma.rawOpportunity.count({
            where: { status: 'REJECTED', createdAt: { gte: since } },
        }),
        prisma.rawOpportunity.count({
            where: { status: 'DEDUPED', createdAt: { gte: since } },
        }),
    ]);

    return {
        sources: metrics,
        totals: {
            sourceCount: metrics.length,
            enabledCount: metrics.filter((m) => m.enabled).length,
            healthyCount: metrics.filter((m) => m.health === 'healthy').length,
            failingCount: metrics.filter((m) => m.health === 'failing').length,
            draftsLast24h: metrics.reduce((sum, m) => sum + m.draftsLast24h, 0),
            rejectedLast24h: rejected,
            dedupedLast24h: deduped,
        },
    };
}

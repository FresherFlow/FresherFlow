/**
 * Phase 13 - ingestion scheduling.
 *
 * `listDueSources` answers "which sources are due". This module answers "run
 * them": the cron/secret path calls `runDueSources`, never the public request
 * path, and the admin "run now" button keeps using `runIngestion` for a single
 * source so the operator gets an immediate verdict.
 *
 * Per-source isolation: one broken source must not abort the rest of the
 * batch. A source-level throw becomes a FAILED summary for that source, and
 * the batch continues.
 */

import { logger } from '@fresherflow/utils';
import { listDueSources } from './sources';
import { runIngestion, type RunSource } from './runPipeline';
import type { RunSummary } from './types';

export interface DueRunResult {
    sourceId: string;
    sourceName: string;
    summary: RunSummary | null;
    error: string | null;
}

export async function runDueSources(
    options: { maxItems?: number; timeoutMs?: number; now?: Date } = {}
): Promise<DueRunResult[]> {
    const due = await listDueSources(options.now ?? new Date());
    const results: DueRunResult[] = [];

    for (const source of due) {
        const runSource: RunSource = {
            id: source.id,
            name: source.name,
            sourceType: source.sourceType,
            endpoint: source.endpoint,
            defaultCategory: source.defaultCategory,
        };
        try {
            const summary = await runIngestion(runSource, {
                maxItems: options.maxItems,
                timeoutMs: options.timeoutMs,
            });
            results.push({ sourceId: source.id, sourceName: source.name, summary, error: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('Scheduled ingestion source failed', { sourceId: source.id });
            results.push({ sourceId: source.id, sourceName: source.name, summary: null, error: message.slice(0, 500) });
        }
    }

    return results;
}

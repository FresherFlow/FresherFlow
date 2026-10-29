import './bootstrap';

import { logger } from '@fresherflow/utils';
import { redis } from '@fresherflow/database';
import { eventService } from './infrastructure/services/platform/event.service';
import { StorageService } from './infrastructure/services/platform/storage.service';
import { announceFeedChangeNow } from './infrastructure/services/opportunity/webRevalidation.service';

logger.info('Starting FresherFlow background worker', {
    nodeEnv: process.env.NODE_ENV || 'development'
});

/**
 * Event Flush Cycle
 * Flushes buffered tracking events from Redis to Postgres every 30 seconds.
 * This is CRITICAL for moving high-frequency analytics into the database efficiently.
 */
const FLUSH_INTERVAL_MS = 30 * 1000;

async function startEventFlushCycle() {
    logger.info('Initialized Event Flush Cycle', { intervalMs: FLUSH_INTERVAL_MS });

    while (true) {
        try {
            await eventService.flush();
        } catch (error) {
            logger.error('Error in Event Flush Cycle', error);
        }
        await new Promise(resolve => setTimeout(resolve, FLUSH_INTERVAL_MS));
    }
}

/**
 * Feed-cache Reconciliation
 *
 * The web app has no ISR timers. Public pages stay cached until a tag is
 * busted, and the publish path busts it. This loop is the backstop for the
 * case where that call never arrived (web down, secret rotated, request
 * dropped): it compares the live CDN feed version with the last version this
 * process announced and re-announces only when the version actually moved.
 *
 * Version-gating is the point. A sweep that busted tags unconditionally every
 * few minutes would put every visited page back on a timer — the exact cost
 * this design exists to remove. Gated, the steady state is one small R2 read
 * per interval and zero page regenerations.
 */
const RECONCILE_INTERVAL_MS = 2 * 60 * 1000;
const ANNOUNCED_VERSION_KEY = 'web:announced-feed-version';

function announcementConfigured(): boolean {
    const hasSecret = Boolean((process.env.REVALIDATE_SECRET_TOKEN || '').trim());
    const hasOrigin = Boolean(
        (process.env.PUBLIC_WEB_URL || process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || '').trim()
    );
    return hasSecret && hasOrigin;
}

async function readFeedVersion(): Promise<string | null> {
    // A db-mode deployment reads Postgres directly and has no CDN manifest.
    if ((process.env.FEED_SOURCE || '').trim().toLowerCase() === 'db') return null;

    const raw = await StorageService.fetchFromR2('meta/feed-version.json');
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as { version?: unknown };
        return typeof parsed.version === 'string' && parsed.version ? parsed.version : null;
    } catch {
        return null;
    }
}

async function reconcileFeedCache(): Promise<void> {
    if (!announcementConfigured()) return;

    const current = await readFeedVersion();
    if (!current) return;

    const announced = await redis.get(ANNOUNCED_VERSION_KEY);
    if (announced === current) return;

    const summary = await announceFeedChangeNow('sweep');
    // Leave the key untouched on failure so the next tick retries.
    if (summary.targets === 0 || summary.failures.length > 0) return;

    await redis.set(ANNOUNCED_VERSION_KEY, current);
    logger.info('Feed cache reconciled', {
        version: current,
        previousVersion: announced,
        targets: summary.targets,
    });
}

async function startFeedReconcileCycle() {
    if (!announcementConfigured()) {
        logger.warn(
            'Feed cache reconciliation disabled: REVALIDATE_SECRET_TOKEN and a public web origin are both required. '
                + 'Public pages will then only refresh when the publish path delivers its tag bust.'
        );
        return;
    }

    logger.info('Initialized Feed Cache Reconciliation', { intervalMs: RECONCILE_INTERVAL_MS });

    while (true) {
        try {
            await reconcileFeedCache();
        } catch (error) {
            logger.error('Error in Feed Cache Reconciliation', error);
        }
        await new Promise(resolve => setTimeout(resolve, RECONCILE_INTERVAL_MS));
    }
}

// Start cycles
startEventFlushCycle().catch(err => {
    logger.error('Fatal error in Event Flush Cycle', err);
    process.exit(1);
});

startFeedReconcileCycle().catch(err => {
    logger.error('Fatal error in Feed Cache Reconciliation', err);
    process.exit(1);
});

// Graceful shutdown
// Flush buffered events to Postgres before exiting; process.exit() alone would
// discard up to one flush interval of analytics.
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Worker ${signal} received, shutting down`);

    const forceExitTimer = setTimeout(() => {
        logger.error('Worker graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    try {
        await eventService.flush();
        logger.info('Pending events flushed');
    } catch (error) {
        logger.error('Error flushing events during shutdown', error);
    }

    try {
        const { prisma } = await import('./infrastructure/database/prisma');
        await prisma.$disconnect();
        logger.info('Prisma disconnected');
    } catch (error) {
        logger.error('Error disconnecting Prisma', error);
    }

    clearTimeout(forceExitTimer);
    logger.info('Worker shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

process.on('SIGINT', () => { void shutdown('SIGINT'); });

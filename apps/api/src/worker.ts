import './bootstrap';

import { logger } from '@fresherflow/utils';
import { eventService } from './infrastructure/services/event.service';

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

// Start cycles
startEventFlushCycle().catch(err => {
    logger.error('Fatal error in Event Flush Cycle', err);
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

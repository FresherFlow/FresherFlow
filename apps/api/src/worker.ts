import dotenv from 'dotenv';
dotenv.config();

import { logger } from '@fresherflow/logger';
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
process.on('SIGTERM', () => {
    logger.info('Worker SIGTERM received, shutting down');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Worker SIGINT received, shutting down');
    process.exit(0);
});

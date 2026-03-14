/**
 * Utility to clean up noisy worker logs, especially the persistent
 * eviction policy warnings from BullMQ/ioredis.
 */
import { logger } from '@fresherflow/logger';

export function setupCleanLogging() {
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;

    const BANNED_MESSAGES = [
        'Eviction policy is volatile-lru',
        'It should be "noeviction"'
    ];

    console.warn = (...args: any[]) => {
        const msg = args.join(' ');
        if (BANNED_MESSAGES.some(b => msg.includes(b))) {
            return;
        }
        // Redirect standard warns to our logger
        logger.warn(msg);
    };

    console.error = (...args: any[]) => {
        const msg = args.join(' ');
        // If it's a known non-critical error, we could filter it here
        logger.error(msg);
    };

    console.log = (...args: any[]) => {
        const msg = args.join(' ');
        // Optional: filter other noise
        if (msg.includes('nodemon')) return;
        logger.info(msg);
    };
}

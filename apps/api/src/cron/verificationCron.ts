import cron from 'node-cron';
import logger from '../utils/logger';
import { runLinkVerification } from '../services/verificationBot';

let isRunning = false;

export function startVerificationCron() {
    const enabled = process.env.VERIFICATION_CRON_ENABLED !== 'false';
    if (!enabled) {
        logger.info('Verification cron disabled via VERIFICATION_CRON_ENABLED=false');
        return;
    }

    const schedule = process.env.VERIFICATION_CRON_SCHEDULE || '30 2 * * *';
    const timezone = process.env.VERIFICATION_CRON_TIMEZONE || 'Asia/Kolkata';

    cron.schedule(schedule, async () => {

        if (isRunning) {
            logger.warn('Verification cron skipped because a previous run is still in progress');
            return;
        }

        isRunning = true;
        try {
            const result = await runLinkVerification();
            logger.info('Verification cron completed', result);
        } catch (error) {
            logger.error('Verification cron failed', error);
            const Sentry = await import('@sentry/node');
            Sentry.captureException(error);
        } finally {
            isRunning = false;
        }
    }, { timezone });

    logger.info('Verification cron scheduled successfully', { schedule, timezone });
}


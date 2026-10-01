import { Router } from 'express';
import { runExpiryCycle } from '../cron/expiryCron';
import { runLinkVerification } from '../infrastructure/services/opportunity/verificationBot';
import { runAlertsCycle } from '../infrastructure/services/alerts/alerts.service';
import { runDueSources } from '../application/ingestion/scheduling';
import { StaticFeedService } from '../infrastructure/services/opportunity/staticFeed.service';
import { logger } from '@fresherflow/utils';
import { sendError, ErrorCode } from '../middleware/errorHandler';

const router = Router();

function isCronTaskEnabled(envVar: string): boolean {
    // Check global master switch first
    if (process.env.ENABLE_CRON_TASKS === 'false') return false;

    const rawValue = process.env[envVar];
    if (typeof rawValue === 'string') {
        const normalized = rawValue.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }

    return false; // Default to false (Manual-First / Lean Infrastructure)
}

// Middleware to verify cron secret
router.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET is not configured for github actions');
        sendError(res, 500, ErrorCode.INTERNAL, 'Server configuration error', req.requestId);
        return;
    }

    // Support both Bearer token and direct secret
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (token !== cronSecret) {
        logger.warn('Unauthorized cron invocation attempt');
        sendError(res, 401, ErrorCode.UNAUTHENTICATED, 'Unauthorized', req.requestId);
        return;
    }

    next();
});


router.post('/verify', async (req, res) => {
    try {
        if (!isCronTaskEnabled('ENABLE_LINK_VERIFICATION')) {
            logger.info('Skipping link verification cycle because ENABLE_LINK_VERIFICATION is disabled');
            res.status(202).json({ success: true, skipped: true, reason: 'ENABLE_LINK_VERIFICATION disabled' });
            return;
        }

        logger.info('Starting link verification cycle via cron API');
        const results = await runLinkVerification();
        res.json({ success: true, message: 'Link verification complete', results });
    } catch (error) {
        logger.error('Failed to run cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/alerts', async (req, res) => {
    try {
        if (!isCronTaskEnabled('ENABLE_CRON_ALERTS')) {
            logger.info('Skipping alerts cycle because ENABLE_CRON_ALERTS is disabled');
            res.status(202).json({ success: true, skipped: true, reason: 'ENABLE_CRON_ALERTS disabled' });
            return;
        }

        logger.info('Starting alerts cycle via cron API');
        const results = await runAlertsCycle();
        // Phase 7: re-attempt recent FAILED APP dispatches (idempotent via
        // dedupeKey). Best-effort — a retry failure never fails the cycle.
        let retried: { retried: number; delivered: number; alreadyDelivered: number } = {
            retried: 0,
            delivered: 0,
            alreadyDelivered: 0,
        };
        try {
            const { retryFailedDispatches } = await import('../infrastructure/services/alerts/alertDispatch.service');
            retried = await retryFailedDispatches(50);
        } catch (error) {
            logger.warn('Failed to retry dispatches', error);
        }
        res.json({ success: true, message: 'Alerts cycle complete', results: { ...results, retried } });
    } catch (error) {
        logger.error('Failed to run cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/expire', async (req, res) => {
    try {
        if (!isCronTaskEnabled('ENABLE_CRON_EXPIRE')) {
            logger.info('Skipping expiry cycle because ENABLE_CRON_EXPIRE is disabled');
            res.status(202).json({ success: true, skipped: true, reason: 'ENABLE_CRON_EXPIRE disabled' });
            return;
        }

        logger.info('Starting expiry cycle via cron API');
        const results = await runExpiryCycle();
        res.json({ success: true, message: 'Expiry cycle complete', results });
    } catch (error) {
        logger.error('Failed to run cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/ingestion', async (req, res) => {
    try {
        if (!isCronTaskEnabled('ENABLE_INGESTION_CRON')) {
            logger.info('Skipping ingestion cycle because ENABLE_INGESTION_CRON is disabled');
            res.status(202).json({ success: true, skipped: true, reason: 'ENABLE_INGESTION_CRON disabled' });
            return;
        }

        const maxItems = Math.min(Math.max(Number(req.body?.maxItems) || 200, 1), 2000);
        logger.info('Starting ingestion due-sources cycle via cron API');
        const results = await runDueSources({ maxItems });
        const succeeded = results.filter((r) => r.summary && r.summary.status !== 'FAILED').length;
        res.json({ success: true, message: 'Ingestion cycle complete', ran: results.length, succeeded, results });
    } catch (error) {
        logger.error('Failed to run ingestion cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/bootstrap-feed', async (req, res) => {
    try {
        logger.info('Generating bootstrap feed via cron API');
        const results = await StaticFeedService.generateBootstrapFeed();
        res.json(results);
    } catch (error) {
        logger.error('Failed to generate bootstrap feed', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        logger.info('Starting full static asset refresh via cron API');
        await StaticFeedService.refresh();
        res.json({ success: true, message: 'Static refresh initiated' });
    } catch (error) {
        logger.error('Failed to refresh static shards', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

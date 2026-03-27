import { Router } from 'express';
import { runExpiryCycle } from '../cron/expiryCron';
import { runLinkVerification } from '../infrastructure/services/verificationBot';
import { runAlertsCycle } from '../infrastructure/services/alerts.service';
import { logger } from '@fresherflow/logger';

const router = Router();

function isCronTaskEnabled(envVar: string): boolean {
    const rawValue = process.env[envVar];
    if (typeof rawValue === 'string') {
        const normalized = rawValue.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }

    return process.env.NODE_ENV !== 'production';
}

// Middleware to verify cron secret
router.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET is not configured for github actions');
        res.status(500).json({ error: 'Server configuration error' });
        return;
    }

    // Support both Bearer token and direct secret
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (token !== cronSecret) {
        logger.warn('Unauthorized cron invocation attempt');
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    next();
});


router.post('/verify', async (req, res) => {
    try {
        if (!isCronTaskEnabled('ENABLE_CRON_VERIFY')) {
            logger.info('Skipping link verification cycle because ENABLE_CRON_VERIFY is disabled');
            res.status(202).json({ success: true, skipped: true, reason: 'ENABLE_CRON_VERIFY disabled' });
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
        res.json({ success: true, message: 'Alerts cycle complete', results });
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

export default router;

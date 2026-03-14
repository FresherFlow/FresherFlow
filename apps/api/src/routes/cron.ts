import { Router } from 'express';
import { runExpiryCycle } from '../cron/expiryCron';
import { runLinkVerification } from '../services/verificationBot';
import { runAlertsCycle } from '../services/alerts.service';
import { logger } from '@fresherflow/logger';

const router = Router();

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
        logger.info('Starting expiry cycle via cron API');
        const results = await runExpiryCycle();
        res.json({ success: true, message: 'Expiry cycle complete', results });
    } catch (error) {
        logger.error('Failed to run cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

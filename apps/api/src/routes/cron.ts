import { Router } from 'express';
import { runIngestionCycle } from '../services/ingestion.service';
import { runLinkVerification } from '../services/verificationBot';
import { runAlertsCycle } from '../services/alerts.service';
import { runExpiryCycle } from '../cron/expiryCron';
import logger from '../utils/logger';

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

router.post('/ingest', async (req, res) => {
    try {
        logger.info('Starting external ingestion cycle via cron API');
        const result = await runIngestionCycle();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Ingestion cron failed via API', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        logger.info('Starting link verification cycle via cron API');
        const result = await runLinkVerification();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Verification cron failed via API', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/alerts', async (req, res) => {
    try {
        logger.info('Starting alerts cycle via cron API');
        const result = await runAlertsCycle();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Alerts cron failed via API', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/expire', async (req, res) => {
    try {
        logger.info('Starting expiry cycle via cron API');
        const result = await runExpiryCycle();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Expiry cron failed via API', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

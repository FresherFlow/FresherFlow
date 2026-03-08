import { Router } from 'express';
import { cronQueue } from '@fresherflow/queue';
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
        logger.info('Queuing link verification cycle via cron API');
        await cronQueue.add('LINK_VERIFICATION', { task: 'LINK_VERIFICATION' });
        res.json({ success: true, message: 'Link verification task queued' });
    } catch (error) {
        logger.error('Failed to queue verification cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/alerts', async (req, res) => {
    try {
        logger.info('Queuing alerts cycle via cron API');
        await cronQueue.add('ALERTS_CYCLE', { task: 'ALERTS_CYCLE' });
        res.json({ success: true, message: 'Alerts cycle task queued' });
    } catch (error) {
        logger.error('Failed to queue alerts cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.post('/expire', async (req, res) => {
    try {
        logger.info('Queuing expiry cycle via cron API');
        await cronQueue.add('EXPIRY_CHECK', { task: 'EXPIRY_CHECK' });
        res.json({ success: true, message: 'Expiry cycle task queued' });
    } catch (error) {
        logger.error('Failed to queue expiry cron', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;

import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import type { CronJobData } from '../index';

const TASK_ENDPOINTS: Record<CronJobData['task'], string> = {
    LINK_VERIFICATION: '/cron/verify',
    ALERTS_CYCLE: '/cron/alerts',
    EXPIRY_CHECK: '/cron/expire',
};

async function callCronEndpoint(endpoint: string): Promise<void> {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.API_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!apiUrl) {
        throw new Error('INTERNAL_API_URL (or API_URL) env var is not set — cannot dispatch cron task');
    }
    if (!cronSecret) {
        throw new Error('CRON_SECRET env var is not set — cannot authenticate cron dispatch');
    }

    const url = `${apiUrl.replace(/\/$/, '')}${endpoint}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Cron endpoint ${endpoint} returned ${response.status}: ${body}`);
    }
}

export async function processCronJob(job: Job<CronJobData>): Promise<void> {
    const { task } = job.data;
    logger.info(`[cron] Starting task: ${task}`, { jobId: job.id });

    const endpoint = TASK_ENDPOINTS[task];
    if (!endpoint) {
        logger.warn(`[cron] Unknown task: ${task}`, { jobId: job.id });
        return;
    }

    try {
        await callCronEndpoint(endpoint);
        logger.info(`[cron] Task completed: ${task}`, { jobId: job.id });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[cron] Task failed: ${task}`, { jobId: job.id, error: message });
        throw err; // Re-throw so BullMQ retries
    }
}

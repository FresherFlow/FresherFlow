import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import type { CacheRevalidateJobData } from '../index';

async function fetchRevalidate(paths: string[]): Promise<void> {
    const internalUrl = process.env.INTERNAL_API_URL || process.env.API_URL || process.env.PUBLIC_WEB_URL;
    const revalidateToken = process.env.REVALIDATE_SECRET_TOKEN;
    
    // We send requests to the Next.js app to trigger revalidatePath.
    // Ensure we send it to the NEXT.js app (PUBLIC_WEB_URL), not the express API URL.
    const baseUrlRaw = process.env.PUBLIC_WEB_URL || internalUrl;

    if (!baseUrlRaw) {
        throw new Error('No base URL defined for revalidation ping (missing PUBLIC_WEB_URL)');
    }
    if (!revalidateToken) {
        throw new Error('REVALIDATE_SECRET_TOKEN is missing');
    }

    const baseUrls = baseUrlRaw.split(',').map(u => u.trim()).filter(Boolean);

    await Promise.all(baseUrls.map(async (baseUrl) => {
        const url = `${baseUrl.replace(/\/$/, '')}/api/revalidate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ secret: revalidateToken, paths }),
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Revalidate endpoint ${url} returned ${response.status}: ${body}`);
        }
    }));
}

export async function processCacheRevalidateJob(job: Job<CacheRevalidateJobData>): Promise<void> {
    const { paths } = job.data;
    logger.info(`[cache-revalidate] Starting revalidation job`, { jobId: job.id, pathCount: paths.length });

    if (!paths || paths.length === 0) {
        logger.info(`[cache-revalidate] No paths to revalidate`, { jobId: job.id });
        return;
    }

    // Chunk size: 5 paths at a time to avoid CPU spikes
    const chunkSize = 5;
    for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        
        try {
            await fetchRevalidate(chunk);
            logger.debug(`[cache-revalidate] Revalidated chunk of paths`, { jobId: job.id, paths: chunk });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`[cache-revalidate] Failed to revalidate chunk`, { jobId: job.id, error: message });
            throw err; // Retry later
        }

        // Wait 2 seconds before the next chunk
        if (i + chunkSize < paths.length) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    logger.info(`[cache-revalidate] Completed revalidation job`, { jobId: job.id, pathCount: paths.length });
}

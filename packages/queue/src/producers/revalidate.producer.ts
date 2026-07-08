import { cacheRevalidateQueue } from '../index';
import { logger } from '@fresherflow/logger';

export async function enqueueCacheRevalidation(paths: string[]): Promise<void> {
    if (!paths || paths.length === 0) return;
    
    try {
        await cacheRevalidateQueue.add('cache-revalidate', { paths });
        logger.info('Enqueued cache revalidation job', { pathCount: paths.length });
    } catch (error) {
        logger.error('Failed to enqueue cache revalidation job', { error: error instanceof Error ? error.message : String(error) });
    }
}

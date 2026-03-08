import { ingestionQueue } from '../index';
import { logger } from '@fresherflow/logger';

export async function enqueueIngestionPayload(payload: any) {
    try {
        await ingestionQueue.add('save-ingestion', { payload }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });
        logger.debug(`Enqueued ingestion payload to database for ${payload.company} - ${payload.title}`);
    } catch (error) {
        logger.error(`Failed to enqueue ingestion payload:`, error);
    }
}

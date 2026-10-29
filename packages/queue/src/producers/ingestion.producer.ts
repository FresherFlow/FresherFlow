import { ingestionQueue } from '../index';
import { logger } from '@fresherflow/utils';

export async function enqueueIngestionPayload(payload: Record<string, unknown>) {
    try {
        // The `internal` queue worker dispatches `ingestion-payload` to
        // processIngestionJob (see WORKER_DEFINITIONS in ../index.ts). The
        // previous name, `save-ingestion`, matched no branch and failed with
        // "Unknown job name" before the processor ever ran.
        await ingestionQueue.add('ingestion-payload', { payload }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });
        logger.debug(`Enqueued ingestion payload to database for ${payload.company} - ${payload.title}`);
    } catch (error) {
        logger.error(`Failed to enqueue ingestion payload:`, error);
    }
}

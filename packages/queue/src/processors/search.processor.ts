import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import { indexOpportunity, removeOpportunityFromIndex } from '@fresherflow/search';
import { SearchIndexJobData } from '../index';

export async function processSearchJob(job: Job<SearchIndexJobData>) {
    const { action, opportunity } = job.data;

    try {
        if (action === 'UPSERT') {
            await indexOpportunity(opportunity);
        } else if (action === 'DELETE') {
            await removeOpportunityFromIndex(opportunity.id);
        }
    } catch (error) {
        logger.error(`Error processing search index job for ${opportunity?.id}:`, error);
        throw error;
    }
}

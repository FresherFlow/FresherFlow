import { Opportunity } from '@fresherflow/types';
import { logger } from '@fresherflow/logger';

/**
 * Handle Opportunity Created background jobs.
 */
export async function handleCreated(opportunity: Partial<Opportunity>) {
    logger.info('[Worker] Processing created opportunity', { title: opportunity.title });
    // add elastic indexes updates or side-effects triggers here
}

import { logger } from '@fresherflow/logger';

/**
 * No-op: PostgreSQL indexes automatically.
 * Kept for interface compatibility — callers don't need to change.
 */
export async function indexOpportunity(opportunityData: any): Promise<void> {
    logger.debug(`[search] indexOpportunity no-op for ${opportunityData?.id} (using PG FTS)`);
}

export async function removeOpportunityFromIndex(id: string): Promise<void> {
    logger.debug(`[search] removeOpportunityFromIndex no-op for ${id} (using PG FTS)`);
}

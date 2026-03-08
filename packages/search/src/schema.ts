import { logger } from '@fresherflow/logger';

/**
 * No-op: PostgreSQL handles schema and indexes automatically via Prisma.
 * Kept so that the startup routine in the API/worker doesn't break.
 */
export async function setupSearchIndex(): Promise<void> {
    logger.info(`[search] setupSearchIndex no-op (using PG FTS)`);
}

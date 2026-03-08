import { searchClient, OPPORTUNITIES_INDEX } from './client';
import { logger } from '@fresherflow/logger';

/**
 * Ensures the basic index exists and standard settings are applied.
 * Call this during deployment or server startup.
 */
export async function setupSearchIndex() {
    try {
        await searchClient.createIndex(OPPORTUNITIES_INDEX, { primaryKey: 'id' });

        const index = searchClient.index(OPPORTUNITIES_INDEX);
        await index.updateFilterableAttributes([
            'role',
            'company',
            'locations',
            'allowedPassoutYears',
            'academicDegrees',
            'type'
        ]);

        await index.updateSortableAttributes([
            'createdAt',
            'deadline'
        ]);

        await index.updateSearchableAttributes([
            'title',
            'company',
            'description',
            'locations',
            'skills'
        ]);

        logger.info(`Meilisearch index '${OPPORTUNITIES_INDEX}' configured.`);
    } catch (err: any) {
        if (err.code === 'index_already_exists') {
            logger.debug(`Meilisearch index '${OPPORTUNITIES_INDEX}' already exists.`);
            return;
        }
        logger.error('Failed to setup Meilisearch index:', err);
    }
}

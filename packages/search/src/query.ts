import { searchClient, OPPORTUNITIES_INDEX } from './client';
import { logger } from '@fresherflow/logger';

export async function searchOpportunitiesQuery(query: string, options: {
    filterType?: string;
    limit?: number;
    offset?: number;
    locations?: string[];
} = {}) {
    const { filterType, limit = 20, offset = 0, locations } = options;
    const filter: string[] = [];

    if (filterType) filter.push(`type = "${filterType}"`);
    if (locations && locations.length > 0) {
        const locFilter = locations.map(l => `locations = "${l}"`).join(' OR ');
        filter.push(`(${locFilter})`);
    }

    try {
        const searchParams: any = {
            limit,
            offset,
            filter,
            sort: ['createdAt:desc']
        };

        const response = await searchClient.index(OPPORTUNITIES_INDEX).search(query || '', searchParams);
        return response;
    } catch (e: any) {
        logger.error('Failed to search opportunities in Meilisearch via query:', e);
        throw new Error('Search failed');
    }
}

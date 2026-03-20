import { searchOpportunitiesQuery, SearchResult, SearchOptions } from '@fresherflow/search';

/**
 * Use Case: Search Opportunities
 */
export async function searchOpportunities(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    return searchOpportunitiesQuery(query, options);
}

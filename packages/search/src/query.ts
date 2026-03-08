import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';

export interface SearchOptions {
    filterType?: string;
    limit?: number;
    offset?: number;
    locations?: string[];
}

export interface SearchResult {
    hits: any[];
    totalHits: number;
    query: string;
}

/**
 * Searches opportunities using PostgreSQL full-text search (tsvector/tsquery).
 * Uses the GIN indexes already on the Opportunity table.
 * No external search service required.
 */
export async function searchOpportunitiesQuery(
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult> {
    const { filterType, limit = 20, offset = 0, locations } = options;

    try {
        // Build WHERE conditions
        const conditions: string[] = [
            `"deletedAt" IS NULL`,
            `"expiredAt" IS NULL`,
            `status = 'PUBLISHED'`,
        ];

        if (filterType) {
            conditions.push(`type = '${filterType}'`);
        }

        if (locations && locations.length > 0) {
            const locList = locations.map(l => `'${l.replace(/'/g, "''")}'`).join(', ');
            conditions.push(`locations && ARRAY[${locList}]::text[]`);
        }

        const whereClause = conditions.join(' AND ');

        let results: any[];
        let countResult: any[];

        if (query && query.trim().length > 0) {
            // Use PostgreSQL FTS — searches title + company + description
            results = await prisma.$queryRawUnsafe(`
                SELECT id, slug, title, company, type, "workMode", locations,
                       "salaryMin", "salaryMax", "salaryRange", "postedAt", "expiresAt",
                       "companyLogoUrl", "allowedDegrees", "requiredSkills",
                       ts_rank(
                         to_tsvector('english', coalesce(title,'') || ' ' || coalesce(company,'') || ' ' || coalesce(description,'')),
                         plainto_tsquery('english', $1)
                       ) AS rank
                FROM "Opportunity"
                WHERE ${whereClause}
                  AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(company,'') || ' ' || coalesce(description,''))
                      @@ plainto_tsquery('english', $1)
                ORDER BY rank DESC, "postedAt" DESC
                LIMIT $2 OFFSET $3
            `, query, limit, offset);

            countResult = await prisma.$queryRawUnsafe(`
                SELECT COUNT(*) as count FROM "Opportunity"
                WHERE ${whereClause}
                  AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(company,'') || ' ' || coalesce(description,''))
                      @@ plainto_tsquery('english', $1)
            `, query);
        } else {
            // No query — return latest published
            results = await prisma.$queryRawUnsafe(`
                SELECT id, slug, title, company, type, "workMode", locations,
                       "salaryMin", "salaryMax", "salaryRange", "postedAt", "expiresAt",
                       "companyLogoUrl", "allowedDegrees", "requiredSkills"
                FROM "Opportunity"
                WHERE ${whereClause}
                ORDER BY "postedAt" DESC
                LIMIT $1 OFFSET $2
            `, limit, offset);

            countResult = await prisma.$queryRawUnsafe(`
                SELECT COUNT(*) as count FROM "Opportunity"
                WHERE ${whereClause}
            `);
        }

        const totalHits = Number(countResult[0]?.count ?? 0);

        logger.debug(`PG FTS search "${query}" → ${results.length} hits (total: ${totalHits})`);

        return {
            hits: results,
            totalHits,
            query,
        };
    } catch (e: any) {
        logger.error('PostgreSQL FTS search failed:', e.message);
        throw new Error('Search failed');
    }
}

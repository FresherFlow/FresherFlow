import { Opportunity } from '@fresherflow/types';
import { prisma, Prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';

export interface SearchOptions {
    filterType?: string;
    limit?: number;
    offset?: number;
    cursor?: string; // ISO string of postedAt for keyset pagination
    locations?: string[];
    // Admin-specific filters
    statuses?: string[];
    includeDeleted?: boolean;
    includeExpired?: boolean;
}

export interface OpportunitySearchHit extends Partial<Opportunity> {
    id: string;
    slug: string;
    title: string;
    company: string;
    postedAt: Date;
    rank?: number;
}

export interface SearchResult {
    hits: OpportunitySearchHit[];
    totalHits: number;
    query: string;
    nextCursor?: string;
}

/**
 * Searches opportunities using PostgreSQL full-text search (tsvector/tsquery).
 * Uses keyset (cursor) pagination for stable O(log n) scrolling.
 * Count queries use baseConditions (no cursor) for accurate totals.
 */
export async function searchOpportunitiesQuery(
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult> {
    const {
        filterType,
        limit = 20,
        offset = 0,
        cursor,
        locations,
        statuses = ['PUBLISHED'],
        includeDeleted = false,
        includeExpired = false,
    } = options;

    try {
        // baseConditions: stable filters used for count queries (no cursor)
        const baseConditions: Prisma.Sql[] = [];
        if (!includeDeleted) baseConditions.push(Prisma.sql`"deletedAt" IS NULL`);
        if (!includeExpired) baseConditions.push(Prisma.sql`"expiredAt" IS NULL`);
        if (statuses.length > 0) baseConditions.push(Prisma.sql`status::text = ANY(${statuses})`);
        if (filterType) baseConditions.push(Prisma.sql`type = ${filterType}`);
        if (locations && locations.length > 0) baseConditions.push(Prisma.sql`locations && ${locations}::text[]`);

        // pageConditions: adds cursor for keyset pagination
        const pageConditions: Prisma.Sql[] = [...baseConditions];
        if (cursor) pageConditions.push(Prisma.sql`"postedAt" < ${new Date(cursor)}`);


        const searchExpr = query && query.trim().length > 0
            ? Prisma.sql`search_vector @@ plainto_tsquery('english', ${query.trim()})`
            : null;

        const allPageConditions = [...pageConditions];
        if (searchExpr) allPageConditions.push(searchExpr);

        const allBaseConditions = [...baseConditions];
        if (searchExpr) allBaseConditions.push(searchExpr);

        const whereClause = allPageConditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(allPageConditions, ' AND ')}`
            : Prisma.empty;

        const countWhere = allBaseConditions.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(allBaseConditions, ' AND ')}`
            : Prisma.empty;

        let hits: OpportunitySearchHit[] = [];
        let totalHits = 0;

        hits = await prisma.$queryRaw<OpportunitySearchHit[]>`
            SELECT id, slug, title, company, type, "workMode", locations,
                   "salaryMin", "salaryMax", "salaryRange", "postedAt", "expiresAt",
                   "companyLogoUrl", "allowedDegrees", "requiredSkills", status
                   ${searchExpr ? Prisma.sql`, ts_rank(search_vector, plainto_tsquery('english', ${query.trim()})) AS rank` : Prisma.empty}
            FROM "Opportunity"
            ${whereClause}
            ORDER BY ${searchExpr ? Prisma.sql`rank DESC,` : Prisma.empty} "postedAt" DESC
            OFFSET ${offset}
            LIMIT ${limit}
        `;

        const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM "Opportunity" ${countWhere}
        `;
        totalHits = Number(countResult[0]?.count ?? 0);


        const nextCursor = hits.length > 0 ? hits[hits.length - 1].postedAt.toISOString() : undefined;

        return { hits, totalHits, query, nextCursor };
    } catch (err: unknown) {
        logger.error('Search query failed:', err);
        throw new Error('Search failed');
    }
}

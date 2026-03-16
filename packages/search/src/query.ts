import { Opportunity } from '@fresherflow/types';
import { prisma, Prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';

export interface SearchOptions {
    filterType?: string;
    limit?: number;
    offset?: number;
    cursor?: string; // ISO string of postedAt for keyset pagination
    locations?: string[];
    includeTotal?: boolean;
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
    totalHits?: number;
    hasMore: boolean;
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
        includeTotal = false,
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


        const sanitizedQuery = query.trim();
        if (sanitizedQuery.length === 0) {
            return { hits: [], totalHits: includeTotal ? 0 : undefined, hasMore: false, query, nextCursor: undefined };
        }

        const lowerQuery = sanitizedQuery.toLowerCase();
        const titlePrefixQuery = `${lowerQuery}%`;
        const phraseQuery = `%${lowerQuery}%`;
        
        // 1. Build a prefix term for query matching
        const cleanWords = sanitizedQuery.split(/\s+/)
            .map(w => w.replace(/[*:&|!'( )]/g, ''))
            .filter(w => w.length > 0);
            
        const prefixTerm = cleanWords.length > 0 
            ? cleanWords.map(w => `${w}:*`).join(' & ')
            : null;

        // Combine them: (WebQuery English OR WebQuery Simple OR Prefix Query)
        // In this environment, || is the operator for tsquery OR combination.
        const fullTsQuery = prefixTerm 
            ? Prisma.sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}) || to_tsquery('simple', ${prefixTerm}))`
            : Prisma.sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}))`;

        const allPageConditions = [...pageConditions];
        allPageConditions.push(Prisma.sql`search_vector @@ ${fullTsQuery}`);

        const allBaseConditions = [...baseConditions];
        allBaseConditions.push(Prisma.sql`search_vector @@ ${fullTsQuery}`);

        const whereClause = Prisma.sql`WHERE ${Prisma.join(allPageConditions, ' AND ')}`;
        let hits: OpportunitySearchHit[] = [];
        let totalHits: number | undefined;

        hits = await prisma.$queryRaw<OpportunitySearchHit[]>`
            SELECT id, slug, title, company, type, "workMode", locations,
                   "salaryMin", "salaryMax", "salaryRange", "postedAt", "expiresAt",
                   "companyLogoUrl", "companyWebsite", "applyLink",
                   "allowedDegrees", "allowedCourses", "allowedSpecializations",
                   "allowedPassoutYears", "requiredSkills", status,
                   CASE WHEN lower(title) = ${lowerQuery} THEN 1 ELSE 0 END AS exact_title_match,
                   CASE WHEN lower(company) = ${lowerQuery} THEN 1 ELSE 0 END AS exact_company_match,
                   CASE WHEN lower(title) LIKE ${titlePrefixQuery} THEN 1 ELSE 0 END AS title_prefix_match,
                   CASE WHEN lower(company) LIKE ${titlePrefixQuery} THEN 1 ELSE 0 END AS company_prefix_match,
                   CASE WHEN lower(title) LIKE ${phraseQuery} THEN 1 ELSE 0 END AS title_phrase_match,
                   CASE WHEN lower(company) LIKE ${phraseQuery} THEN 1 ELSE 0 END AS company_phrase_match,
                   ts_rank_cd(search_vector, ${fullTsQuery}) AS rank
            FROM "Opportunity"
            ${whereClause}
            ORDER BY
                exact_title_match DESC,
                exact_company_match DESC,
                title_prefix_match DESC,
                company_prefix_match DESC,
                title_phrase_match DESC,
                company_phrase_match DESC,
                rank DESC,
                "postedAt" DESC
            OFFSET ${offset}
            LIMIT ${includeTotal ? limit : limit + 1}
        `;

        const hasMore = hits.length > limit;
        if (hasMore) {
            hits = hits.slice(0, limit);
        }

        if (includeTotal) {
            const countWhere = Prisma.sql`WHERE ${Prisma.join(allBaseConditions, ' AND ')}`;
            const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM "Opportunity" ${countWhere}
            `;
            totalHits = Number(countResult[0]?.count ?? 0);
        }

        const nextCursor = hits.length > 0 ? hits[hits.length - 1].postedAt.toISOString() : undefined;

        return { hits, totalHits, hasMore, query, nextCursor };
    } catch (err: unknown) {
        logger.error('Search query failed:', err);
        throw new Error('Search failed');
    }
}

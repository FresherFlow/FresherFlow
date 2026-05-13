import { Opportunity } from '@fresherflow/types';
import { prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/logger';
import { join, sqltag as sql, type Sql } from '@prisma/client/runtime/library';

export interface SearchOptions {
    filterType?: string;
    limit?: number;
    offset?: number;
    cursor?: string; // ISO string of postedAt for keyset pagination
    locations?: string[];
    includeTotal?: boolean;
    siteMode?: 'private' | 'govt';
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
        siteMode = 'private',
        statuses = ['PUBLISHED'],
        includeDeleted = false,
        includeExpired = false,
    } = options;

    try {
        // baseConditions: stable filters used for count queries (no cursor)
        const baseConditions: Sql[] = [];
        if (!includeDeleted) baseConditions.push(sql`"deletedAt" IS NULL`);
        if (!includeExpired) baseConditions.push(sql`"expiredAt" IS NULL`);
        if (statuses.length > 0) baseConditions.push(sql`status::text = ANY(${statuses})`);
        if (filterType) baseConditions.push(sql`type = ${filterType}`);
        if (locations && locations.length > 0) baseConditions.push(sql`locations && ${locations}::text[]`);
        if (siteMode === 'govt') {
            baseConditions.push(sql`EXISTS (SELECT 1 FROM "GovernmentJobDetails" gjd WHERE gjd."opportunityId" = "Opportunity"."id")`);
        } else {
            baseConditions.push(sql`NOT EXISTS (SELECT 1 FROM "GovernmentJobDetails" gjd WHERE gjd."opportunityId" = "Opportunity"."id")`);
        }

        // pageConditions: adds cursor for keyset pagination
        const pageConditions: Sql[] = [...baseConditions];
        if (cursor) pageConditions.push(sql`"postedAt" < ${new Date(cursor)}`);


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
            ? sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}) || to_tsquery('simple', ${prefixTerm}))`
            : sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}))`;

        const allPageConditions = [...pageConditions];
        allPageConditions.push(sql`search_vector @@ ${fullTsQuery}`);

        const allBaseConditions = [...baseConditions];
        allBaseConditions.push(sql`search_vector @@ ${fullTsQuery}`);

        const whereClause = sql`WHERE ${join(allPageConditions, ' AND ')}`;
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
                   ts_rank_cd(search_vector, ${fullTsQuery}) AS rank,
                   similarity(title, ${sanitizedQuery}) AS title_similarity,
                   similarity(company, ${sanitizedQuery}) AS company_similarity
            FROM "Opportunity"
            ${whereClause}
            ORDER BY
                exact_title_match DESC,
                exact_company_match DESC,
                title_prefix_match DESC,
                company_prefix_match DESC,
                title_similarity DESC,
                company_similarity DESC,
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
            const countWhere = sql`WHERE ${join(allBaseConditions, ' AND ')}`;
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

import { Opportunity } from '@fresherflow/types';
import { prisma, Prisma } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import {
    buildOpportunityFilterSql,
    buildOpportunityOrderSql,
    type OpportunityFilters,
} from './filters';

const { join, sql } = Prisma;
type Sql = Prisma.Sql;

export interface SearchOptions {
    /**
     * Legacy `type` filter, now expressed across the independent dimensions.
     * Kept as a structured object so one legacy value can expand into several
     * column predicates (INTERNSHIP -> category + employmentTypes).
     */
    filterType?: {
        category?: string;
        recruitmentMethod?: string;
        employmentType?: string;
    };
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

    /**
     * Phase 6: the full validated filter set from `parseOpportunityFilters`.
     *
     * Purely additive. When present it is the single source of every public
     * WHERE predicate, so the legacy fields above are ignored for the public
     * route; they are retained only for the admin list, which has not been
     * migrated yet. This keeps the existing signature valid for every caller
     * while the public route moves onto the shared filter contract.
     */
    filters?: OpportunityFilters;
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
 * node-pg has no OID mapping for custom enum array columns (e.g.
 * EducationLevel[]), so `$queryRaw` returns them as Postgres array literals
 * like `"{DEGREE}"` instead of JS arrays. The eligibility engine calls
 * `.join()/.some()` on these fields, which 500s authed search. Normalize at
 * this raw-SQL boundary so hits honor the Opportunity[] contract.
 */
function parsePgEnumArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '' || trimmed === '{}') return [];
        const inner = trimmed.startsWith('{') && trimmed.endsWith('}')
            ? trimmed.slice(1, -1)
            : trimmed;
        if (inner.trim() === '') return [];
        return inner
            .split(',')
            .map((part) => part.trim().replace(/^"|"$/g, ''))
            .filter((part) => part.length > 0);
    }
    return [];
}

/**
 * Searches opportunities using PostgreSQL full-text search (tsvector/tsquery).
 * Uses keyset (cursor) pagination for stable O(log n) scrolling.
 * Count queries use baseConditions (no cursor) for accurate totals.
 *
 * Separation: this is the stateless PUBLIC search path. It must not import
 * SavedSearch (personal matching, Phase 7) or Room (community curation):
 * those read this module's filters, never the other way round.
 */
export async function searchOpportunitiesQuery(
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult> {
    const {
        filterType,
        filters,
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

    // Phase 6: when the central filter set is present it owns pagination and
    // sorting, so the public route cannot silently drop ?page/?limit/?sort.
    const effectiveLimit = filters?.limit ?? limit;
    const effectiveOffset = filters?.offset ?? offset;
    const orderFragment: Sql | undefined = filters
        ? buildOpportunityOrderSql(filters)
        : undefined;

    try {
        // baseConditions: stable filters used for count queries (no cursor)
        let baseConditions: Sql[];

        if (filters) {
            // Phase 6: the shared builder owns every public predicate, so
            // search, feed, and the Phase 7 saved-search matcher cannot drift.
            baseConditions = buildOpportunityFilterSql(filters, {
                statuses,
                includeDeleted,
                includeExpired,
            });
        } else {
            baseConditions = [];
            if (!includeDeleted) baseConditions.push(sql`"deletedAt" IS NULL`);
            if (!includeExpired) baseConditions.push(sql`"expiredAt" IS NULL`);
            if (statuses.length > 0) baseConditions.push(sql`status::text = ANY(${statuses})`);
            // The old single `type` column no longer exists; filter each dimension.
            if (filterType?.category) baseConditions.push(sql`"category"::text = ${filterType.category}`);
            if (filterType?.recruitmentMethod) {
                baseConditions.push(sql`"recruitmentMethod"::text = ${filterType.recruitmentMethod}`);
            }
            if (filterType?.employmentType) {
                baseConditions.push(sql`"employmentTypes" @> ARRAY[${filterType.employmentType}]::"EmploymentType"[]`);
            }
            if (locations && locations.length > 0) baseConditions.push(sql`locations && ${locations}::text[]`);
            if (siteMode === 'govt') {
                baseConditions.push(sql`EXISTS (SELECT 1 FROM "GovernmentJobDetails" gjd WHERE gjd."opportunityId" = "Opportunity"."id")`);
            } else {
                baseConditions.push(sql`NOT EXISTS (SELECT 1 FROM "GovernmentJobDetails" gjd WHERE gjd."opportunityId" = "Opportunity"."id")`);
            }
        }

        // pageConditions: adds cursor for keyset pagination
        const pageConditions: Sql[] = [...baseConditions];
        if (cursor) pageConditions.push(sql`"postedAt" < ${new Date(cursor)}`);

        const sanitizedQuery = query.trim();
        const hasQuery = sanitizedQuery.length > 0;

        // A filter-only search (`?workMode=REMOTE` with no `q`) is a first-class
        // case in the new contract: return the matching set ordered by
        // relevance, rather than short-circuiting to an empty page.
        if (!hasQuery && !filters) {
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
        const fullTsQuery = prefixTerm
            ? sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}) || to_tsquery('simple', ${prefixTerm}))`
            : sql`(websearch_to_tsquery('english', ${sanitizedQuery}) || websearch_to_tsquery('simple', ${sanitizedQuery}))`;

        const allPageConditions = [...pageConditions];
        const allBaseConditions = [...baseConditions];
        if (hasQuery) {
            allPageConditions.push(sql`search_vector @@ ${fullTsQuery}`);
            allBaseConditions.push(sql`search_vector @@ ${fullTsQuery}`);
        }

        const whereClause = sql`WHERE ${join(allPageConditions, ' AND ')}`;
        let hits: OpportunitySearchHit[] = [];
        let totalHits: number | undefined;

        hits = await prisma.$queryRaw<OpportunitySearchHit[]>`
            SELECT id, slug, title, company,
                   category, "employmentTypes", "recruitmentMethod", sector,
                   "workMode", locations,
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
                   ${hasQuery
                        ? sql`ts_rank_cd(search_vector, ${fullTsQuery})`
                        : sql`0.0::float`} AS rank,
                   ${hasQuery
                        ? sql`similarity(title, ${sanitizedQuery})`
                        : sql`0.0::float`} AS title_similarity,
                   ${hasQuery
                        ? sql`similarity(company, ${sanitizedQuery})`
                        : sql`0.0::float`} AS company_similarity
            FROM "Opportunity"
            ${whereClause}
            ORDER BY
                ${orderFragment ?? sql`exact_title_match DESC,
                exact_company_match DESC,
                title_prefix_match DESC,
                company_prefix_match DESC,
                title_similarity DESC,
                company_similarity DESC,
                title_phrase_match DESC,
                company_phrase_match DESC,
                rank DESC,
                "postedAt" DESC`},
                -- Stable tiebreaker: without a unique column, rows with equal rank
                -- and postedAt can be returned in a different order per page, which
                -- duplicates some rows and drops others while paging.
                "id" DESC

            -- Always fetch one extra row to detect whether a next page exists.
            -- Tying this to includeTotal meant any caller asking for a total
            -- silently got hasMore: false and an empty-looking last page.
            OFFSET ${effectiveOffset}
            LIMIT ${effectiveLimit + 1}
        `;

        const hasMore = hits.length > effectiveLimit;
        if (hasMore) {
            hits = hits.slice(0, effectiveLimit);
        }

        hits = hits.map((hit) => ({
            ...hit,
            allowedDegrees: parsePgEnumArray(hit.allowedDegrees) as OpportunitySearchHit['allowedDegrees'],
        }));

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

export async function searchOpportunities(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    return searchOpportunitiesQuery(query, options);
}

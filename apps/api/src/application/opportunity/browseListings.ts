import { Prisma } from '@fresherflow/database';
import prisma from '../../infrastructure/database/prisma';
import { liveOpportunityWhere, liveDriveOpportunityWhere } from '../../utils/liveWhere';
import { getPublicSiteUrl } from '../../utils/runtimeConfig';

/**
 * Browse the live listings — the read model behind the MCP `get_jobs` tool.
 *
 * Membership is not decided here: it comes from `liveOpportunityWhere`, the same
 * rule the public feed and the CDN snapshot use. That is the whole point of this
 * service. A browse surface that rolled its own filter would eventually report a
 * job that a visitor cannot open, which is worse than returning nothing.
 *
 * The route owns request validation and clamping; this module owns the query and
 * the response shape.
 */

export const BROWSE_DEFAULT_LIMIT = 20;
export const BROWSE_MAX_LIMIT = 50;
export const BROWSE_MAX_PAGE = 50;

export type BrowseListingType = 'internship' | 'walk-in' | 'government';

export interface BrowseListingsInput {
    q?: string;
    city?: string;
    company?: string;
    type?: BrowseListingType;
    page: number;
    limit: number;
}

/**
 * Card-level fields only. A browse result should not carry descriptions: the
 * agent renders these directly, and the payload stays small enough to page.
 *
 * Derived from the select so the shape cannot drift from the query.
 */
const BROWSE_SELECT = {
    id: true,
    slug: true,
    title: true,
    company: true,
    locations: true,
    employmentTypes: true,
    workMode: true,
    category: true,
    recruitmentMethod: true,
    salaryRange: true,
    salaryPeriod: true,
    experienceMin: true,
    experienceMax: true,
    postedAt: true,
    expiresAt: true,
} as const;

export type BrowseListing = Prisma.OpportunityGetPayload<{ select: typeof BROWSE_SELECT }> & {
    /** Canonical public page for the listing. */
    url: string | null;
};

export interface BrowseListingsResult {
    jobs: BrowseListing[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

export async function browseLiveListings(input: BrowseListingsInput): Promise<BrowseListingsResult> {
    const now = new Date();
    const conditions: Prisma.OpportunityWhereInput[] = [
        liveOpportunityWhere(now),
        // A drive whose last date has passed is no longer "open", even though the
        // row itself is still live for the site's history pages.
        liveDriveOpportunityWhere(now),
    ];

    if (input.q) {
        conditions.push({
            OR: [
                { title: { contains: input.q, mode: 'insensitive' } },
                { company: { contains: input.q, mode: 'insensitive' } },
            ],
        });
    }
    if (input.city) conditions.push({ locations: { has: input.city } });
    if (input.company) conditions.push({ company: { equals: input.company, mode: 'insensitive' } });

    if (input.type === 'internship') {
        conditions.push({ employmentTypes: { has: 'INTERNSHIP' } });
    } else if (input.type === 'walk-in') {
        conditions.push({ recruitmentMethod: 'WALK_IN' });
    } else if (input.type === 'government') {
        conditions.push({ governmentJobDetails: { isNot: null } });
    }

    const where: Prisma.OpportunityWhereInput = { AND: conditions };
    const skip = (input.page - 1) * input.limit;

    const [total, rows] = await Promise.all([
        prisma.opportunity.count({ where }),
        prisma.opportunity.findMany({
            where,
            orderBy: { postedAt: 'desc' },
            skip,
            take: input.limit,
            select: BROWSE_SELECT,
        }),
    ]);

    const siteUrl = getPublicSiteUrl();
    const jobs: BrowseListing[] = rows.map((row) => ({
        ...row,
        url: row.slug ? `${siteUrl}/jobs/${row.slug}` : null,
    }));

    return {
        jobs,
        total,
        page: input.page,
        limit: input.limit,
        hasMore: skip + rows.length < total,
    };
}

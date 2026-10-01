import {
    EmploymentType,
    Opportunity,
    OpportunityCategory,
    RecruitmentMethod,
    Sector,
} from '@fresherflow/types';

/**
 * Legacy feed kinds (old `OpportunityType` values) kept as plain strings for
 * feed routing, titles, and UI branching. Filtering derives from the new
 * independent taxonomy dimensions — never read `opp.type`, which no longer
 * exists. Mirrors `apps/web/.../walkinMapUtils.ts`.
 */
export type FeedType =
    | 'JOB'
    | 'INTERNSHIP'
    | 'WALKIN'
    | 'GOVERNMENT'
    | 'REMOTE'
    | 'HACKATHONS';

export const EXPLORE_FEED_TABS: readonly FeedType[] = [
    'JOB',
    'INTERNSHIP',
    'WALKIN',
    'REMOTE',
] as const;

export const FEED_TAB_LABELS: Record<FeedType, string> = {
    JOB: 'Jobs',
    INTERNSHIP: 'Internships',
    WALKIN: 'Walk-ins',
    GOVERNMENT: 'Government',
    REMOTE: 'Remote Only',
    HACKATHONS: 'Hackathons',
};

interface DriveDetailsLike {
    dates?: unknown;
    dateRange?: string | null;
    venueAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    techCluster?: string | null;
    clusterName?: string | null;
    city?: string | null;
}

export function getDriveDetails(opp: Opportunity): DriveDetailsLike | undefined {
    const raw = opp as unknown as {
        walkInDetails?: DriveDetailsLike | null;
        driveDetails?: DriveDetailsLike | null;
    };
    return raw.walkInDetails ?? raw.driveDetails ?? undefined;
}

export function isWalkinOpportunity(opp: Opportunity): boolean {
    return (
        opp.recruitmentMethod === RecruitmentMethod.WALK_IN ||
        Boolean(getDriveDetails(opp))
    );
}

export function isInternshipOpportunity(opp: Opportunity): boolean {
    if ((opp.employmentTypes || []).includes(EmploymentType.INTERNSHIP))
        return true;
    const legacy = (opp as unknown as { employmentType?: unknown })
        .employmentType;
    return (
        typeof legacy === 'string' && legacy.toUpperCase() === 'INTERNSHIP'
    );
}

export function isGovernmentOpportunity(opp: Opportunity): boolean {
    return opp.sector === Sector.GOVERNMENT || Boolean(opp.governmentJobDetails);
}

export function isRemoteOpportunity(opp: Opportunity): boolean {
    if (opp.workMode === 'REMOTE') return true;
    const locLabel = (opp.locations || []).join(' ').toLowerCase();
    if (
        locLabel.includes('remote') ||
        locLabel.includes('work from home') ||
        locLabel.includes('wfh') ||
        locLabel.includes('pan india')
    ) {
        return true;
    }
    return (opp.title || '').toLowerCase().includes('remote');
}

/** Raw single badge mirroring old `opp.type` values. */
export function getFeedBadgeLabel(opp: Opportunity): FeedType {
    if (isGovernmentOpportunity(opp)) return 'GOVERNMENT';
    if (isWalkinOpportunity(opp)) return 'WALKIN';
    if (isInternshipOpportunity(opp)) return 'INTERNSHIP';
    if (opp.category === OpportunityCategory.COMPETITION) return 'HACKATHONS';
    if (isRemoteOpportunity(opp)) return 'REMOTE';
    return 'JOB';
}

/** Display label for card/detail badges (`Full Time` / `Internship` / ...). */
export function getTypeDisplayLabel(opp: Opportunity): string {
    const badge = getFeedBadgeLabel(opp);
    switch (badge) {
        case 'JOB':
            return 'Full Time';
        case 'INTERNSHIP':
            return 'Internship';
        case 'WALKIN':
            return 'Walk-in';
        case 'GOVERNMENT':
            return 'Government';
        case 'REMOTE':
            return 'Remote';
        case 'HACKATHONS':
            return 'Hackathon';
        default:
            return badge;
    }
}

/** Whether an opportunity belongs on a feed page of the given kind. */
export function matchesFeedType(
    opp: Opportunity,
    type: FeedType | string | null | undefined,
): boolean {
    if (!type) return true;
    switch (type) {
        case 'GOVERNMENT':
            return isGovernmentOpportunity(opp);
        case 'WALKIN':
            return isWalkinOpportunity(opp);
        case 'INTERNSHIP':
            return isInternshipOpportunity(opp);
        case 'HACKATHONS':
            return opp.category === OpportunityCategory.COMPETITION;
        case 'REMOTE':
            return isRemoteOpportunity(opp);
        case 'JOB':
            return (
                opp.category === OpportunityCategory.EMPLOYMENT &&
                !isInternshipOpportunity(opp) &&
                !isWalkinOpportunity(opp) &&
                !isGovernmentOpportunity(opp) &&
                !isRemoteOpportunity(opp)
            );
        default:
            return true;
    }
}

/** First employment-type label, with legacy singular fallback. */
export function getPrimaryEmploymentType(opp: Opportunity): string | null {
    const legacy = (opp as unknown as { employmentType?: unknown })
        .employmentType;
    if (typeof legacy === 'string' && legacy.trim()) return legacy;
    return opp.employmentTypes?.[0] ?? null;
}

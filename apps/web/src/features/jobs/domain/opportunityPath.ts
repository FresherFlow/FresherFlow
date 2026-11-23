type OpportunityType = string | undefined;

function isUnsafeSlug(value: string): boolean {
    const v = value.toLowerCase();
    return (
        v.startsWith('http://') ||
        v.startsWith('https://') ||
        v.startsWith('www.') ||
        v.includes('/') ||
        v.includes('\\')
    );
}

export function normalizeOpportunitySlugOrId(slugOrId: string): string {
    const value = String(slugOrId || '').trim();
    if (!value) return '';
    if (isUnsafeSlug(value)) {
        return value.split('/').filter(Boolean).pop() || value;
    }
    return value;
}

export function getOpportunityPath(type: OpportunityType, slugOrId: string): string {
    const safeSegment = encodeURIComponent(normalizeOpportunitySlugOrId(slugOrId));
    if (type === 'GOVERNMENT') {
        return `/govt/${safeSegment}`;
    }
    if (type === 'WALKIN') {
        // A walk-in drive is a recruitment event, not a job posting. Its detail
        // URL lives under the Drives family so the URL matches the intent of the
        // person opening it. The /drives/walk-in/[segment] route resolves both
        // city pages and drive detail pages without a parallel-route collision.
        return `/drives/walk-in/${safeSegment}`;
    }
    return `/jobs/${safeSegment}`;
}

type PathItem = {
    type?: string;
    sector?: string;
    governmentJobDetails?: unknown;
    recruitmentMethod?: string | null;
    driveDetails?: unknown;
    walkInDetails?: unknown;
    walkin?: unknown;
    slug?: string | null;
    id: string;
};

export function getOpportunityPathFromItem(item: PathItem): string {
    const safeSlug = item.slug ? normalizeOpportunitySlugOrId(item.slug) : '';
    // The taxonomy has no single `type` field. Read the independent dimensions
    // instead: sector for government, recruitment method / drive data for a
    // walk-in event, everything else stays a job or internship detail.
    const isGovt =
        item.type === 'GOVERNMENT' ||
        item.sector === 'GOVERNMENT' ||
        Boolean(item.governmentJobDetails);
    const isWalkIn =
        item.recruitmentMethod === 'WALK_IN' ||
        Boolean(item.driveDetails || item.walkInDetails || item.walkin);
    return getOpportunityPath(
        isGovt ? 'GOVERNMENT' : isWalkIn ? 'WALKIN' : undefined,
        safeSlug || item.id,
    );
}

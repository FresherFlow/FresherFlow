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
    return `/jobs/${safeSegment}`;
}

export function getOpportunityPathFromItem(item: { type?: string; sector?: string; governmentJobDetails?: unknown; slug?: string | null; id: string }): string {
    const safeSlug = item.slug ? normalizeOpportunitySlugOrId(item.slug) : '';
    // New taxonomy has no `type` field: government-ness comes from the sector
    // dimension (or the legacy `type` value when present on old payloads).
    const isGovt =
        item.type === 'GOVERNMENT' ||
        item.sector === 'GOVERNMENT' ||
        Boolean(item.governmentJobDetails);
    return getOpportunityPath(isGovt ? 'GOVERNMENT' : undefined, safeSlug || item.id);
}

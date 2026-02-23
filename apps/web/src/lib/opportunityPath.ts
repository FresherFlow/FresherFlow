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
    if (type === 'JOB') return `/jobs/${safeSegment}`;
    if (type === 'INTERNSHIP') return `/internships/${safeSegment}`;
    if (type === 'WALKIN') return `/walk-ins/details/${safeSegment}`;
    return `/opportunities/${safeSegment}`;
}

export function getOpportunityPathFromItem(item: { type?: string; slug?: string | null; id: string }): string {
    const safeSlug = item.slug ? normalizeOpportunitySlugOrId(item.slug) : '';
    return getOpportunityPath(item.type, safeSlug || item.id);
}

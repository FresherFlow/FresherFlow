import { buildShareUrl } from './display.js';

export function buildLoginFromDetailHref(detailPath: string, sourceParam: string | null, refParam: string | null) {
    const fromShare = refParam === 'share' || sourceParam === 'opportunity_share';
    const loginSource = fromShare ? 'opportunity_share' : 'opportunity_detail';
    return `/login?redirect=${encodeURIComponent(detailPath)}&source=${encodeURIComponent(loginSource)}&intent=signup`;
}

export function getDetailShareUrl(currentUrl: string) {
    return buildShareUrl(currentUrl, {
        platform: 'other',
        source: 'opportunity_share',
        medium: 'share',
        campaign: 'opportunity_share',
        ref: 'share',
    });
}

export function getOpportunityPathFromItem(item: { id: string; slug?: string; type?: string }) {
    const prefix = getTypePrefix(item.type);
    return `${prefix}/${item.slug || item.id}`;
}

function getTypePrefix(type?: string): string {
    if (!type) return '/opportunities';
    const t = type.toUpperCase();
    if (t === 'JOB') return '/jobs';
    if (t === 'INTERNSHIP') return '/internships';
    if (t === 'WALKIN') return '/walk-ins';
    return '/opportunities';
}

export function getOpportunityPath(type: string, slugOrId: string) {
    return `${getTypePrefix(type)}/${slugOrId}`;
}

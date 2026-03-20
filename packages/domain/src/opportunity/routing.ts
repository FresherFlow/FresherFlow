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

export function getOpportunityPathFromItem(item: { id: string; slug?: string }) {
    return `/opportunities/${item.slug || item.id}`;
}

export function getOpportunityPath(type: string, slugOrId: string) {
    return `/opportunities/${slugOrId}`;
}

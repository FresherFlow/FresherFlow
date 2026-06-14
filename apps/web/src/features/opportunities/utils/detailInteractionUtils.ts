import { ActionType, type Opportunity } from '@fresherflow/types';
import { buildShareUrl } from '@/lib/utils/share';

export function getCurrentActionType(opportunity: Opportunity | null): ActionType | null {
    if (!opportunity?.actions?.length) return null;
    const current = opportunity.actions[0].actionType as ActionType;
    if (current === ActionType.PLANNING) return ActionType.PLANNED;
    if (current === ActionType.ATTENDED) return ActionType.INTERVIEWED;
    return current;
}

export function getTrackerOptions(isWalkinFlow: boolean): Array<{ key: ActionType; label: string }> {
    return [
        ...(isWalkinFlow ? [] : [{ key: ActionType.APPLIED, label: 'Applied' }]),
        { key: ActionType.PLANNED, label: 'Planned' },
        { key: ActionType.INTERVIEWED, label: isWalkinFlow ? 'Attended' : 'Interviewed' },
        { key: ActionType.SELECTED, label: 'Selected' },
    ];
}

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

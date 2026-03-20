import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const opportunityClicksApi = {
    trackApplyClick: (opportunityId: string, source = 'opportunity_detail', targetUrl?: string | null) =>
        apiClient(`/api/public/opportunities/${opportunityId}/click`, {
            method: 'POST',
            body: JSON.stringify({
                source,
                sessionId: getOpportunityClickSessionId(),
                targetUrl: targetUrl || null,
            })
        }),
};

function getOpportunityClickSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
        const existing = window.localStorage.getItem('ff_click_session_id');
        if (existing) return existing;
        const next = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem('ff_click_session_id', next);
        return next;
    } catch { return 'browser-session-unavailable'; }
}

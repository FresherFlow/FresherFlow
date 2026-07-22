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
        
        let randStr = '';
        if (typeof window !== 'undefined' && window.crypto) {
            const array = new Uint32Array(2);
            window.crypto.getRandomValues(array);
            randStr = Array.from(array).map(n => n.toString(36)).join('');
        } else {
            randStr = Date.now().toString(36);
        }
        
        const next = `sess_${Date.now()}_${randStr.slice(0, 8)}`;
        window.localStorage.setItem('ff_click_session_id', next);
        return next;
    } catch { return 'browser-session-unavailable'; }
}

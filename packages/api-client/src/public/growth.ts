import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const growthApi = {
    trackEvent: (
        event:
            | 'DETAIL_VIEW'
            | 'LOGIN_VIEW'
            | 'SAVE_JOB'
            | 'APPLY_CLICK'
            | 'SHARE_JOB'
            | 'SIGNUP_VIEW'
            | 'INSTALL_PROMPT_SHOWN'
            | 'INSTALL_ACCEPTED'
            | 'OPENED_STANDALONE',
        source = 'unknown',
        options?: {
            opportunityId?: string;
        }
    ) =>
        apiClient('/api/public/growth/event', {
            method: 'POST',
            body: JSON.stringify({
                event,
                source,
                route: typeof window !== 'undefined' ? window.location.pathname : undefined,
                sessionId: getGrowthSessionId(),
                opportunityId: options?.opportunityId,
            })
        })
};

function getGrowthSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
        const existing = window.sessionStorage.getItem('ff_growth_session_v1');
        if (existing) return existing;
        const next = `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.sessionStorage.setItem('ff_growth_session_v1', next);
        return next;
    } catch { return 'session-unavailable'; }
}

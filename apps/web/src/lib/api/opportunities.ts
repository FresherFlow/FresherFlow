import { apiClient } from './_core';

const OPPORTUNITY_CLICK_SESSION_KEY = 'ff_click_session_id';

function getOpportunityClickSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
        const existing = window.localStorage.getItem(OPPORTUNITY_CLICK_SESSION_KEY);
        if (existing && existing.length > 0) return existing;
        const next = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(OPPORTUNITY_CLICK_SESSION_KEY, next);
        return next;
    } catch {
        return 'browser-session-unavailable';
    }
}

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

// Opportunities API calls
export const opportunitiesApi = {
    list: (params?: { type?: string; city?: string; company?: string; closingSoon?: boolean; minSalary?: number; maxSalary?: number; page?: number; limit?: number; sort?: string }) => {
        const query = new URLSearchParams();
        if (params?.type) query.append('type', params.type);
        if (params?.city) query.append('city', params.city);
        if (params?.company) query.append('company', params.company);
        if (params?.closingSoon) query.append('closingSoon', 'true');
        if (params?.minSalary) query.append('minSalary', String(params.minSalary));
        if (params?.maxSalary) query.append('maxSalary', String(params.maxSalary));
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.sort) query.append('sort', params.sort);

        const queryString = query.toString();
        return apiClient(`/api/opportunities${queryString ? `?${queryString}` : ''}`);
    },
    search: (params: { q: string; type?: string; city?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        query.append('q', params.q);
        if (params.type) query.append('type', params.type);
        if (params.city) query.append('city', params.city);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));

        return apiClient(`/api/opportunities/search?${query.toString()}`);
    },

    getById: (id: string) => {
        const query = new URLSearchParams();

        const queryString = query.toString();
        return apiClient(`/api/opportunities/${id}${queryString ? `?${queryString}` : ''}`);
    }
};

// Companies API calls
export const companiesApi = {
    search: (query: string) => apiClient(`/api/public/companies/search?q=${encodeURIComponent(query)}`),
    getByName: (name: string) => apiClient(`/api/public/companies/${encodeURIComponent(name)}`)
};

export const governmentJobsApi = {
    list: () => apiClient<any[]>('/api/public/government-jobs'),
    get: (jobId: string) => apiClient<any>(`/api/public/government-jobs/${jobId}`),
};

export const joblinksApi = {
    submit: (url: string, source: string) =>
        apiClient('/api/public/submit-job-link', {
            method: 'POST',
            body: JSON.stringify({ url, source })
        }),
};

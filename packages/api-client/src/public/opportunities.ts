import { ParsedJob, OpportunityStatus } from '@fresherflow/types';
import { apiClient } from './apiClient';

export interface SyncUpdate {
    id: string;
    status: OpportunityStatus;
    expiresAt: string | null;
    expiredAt: string | null;
    deletedAt: string | null;
    updatedAt: string;
}

// Optional types fallback placeholder
export const opportunitiesApi = {
    list: (params?: { type?: string; city?: string; tag?: string; feedType?: string; company?: string; closingSoon?: boolean; minSalary?: number; maxSalary?: number; page?: number; sort?: string }) => {
        const query = new URLSearchParams();
        if (params?.type) query.append('type', params.type);
        if (params?.city) query.append('city', params.city);
        if (params?.tag) query.append('tag', params.tag);
        if (params?.feedType) query.append('feedType', params.feedType);
        if (params?.company) query.append('company', params.company);
        if (params?.closingSoon) query.append('closingSoon', 'true');
        if (params?.minSalary) query.append('minSalary', String(params.minSalary));
        if (params?.maxSalary) query.append('maxSalary', String(params.maxSalary));
        if (params?.page) query.append('page', String(params.page));
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

    getById: (id: string) => apiClient(`/api/opportunities/${id}`),
    getSimilar: (id: string) => apiClient(`/api/opportunities/${id}/similar`),
    getComments: (id: string) => apiClient(`/api/opportunities/${id}/comments`),
    postComment: (id: string, text: string) => apiClient(`/api/opportunities/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
        headers: { 'Content-Type': 'application/json' }
    }),
    deleteComment: (id: string, commentId: string) => apiClient(`/api/opportunities/${id}/comments/${commentId}`, {
        method: 'DELETE'
    }),
    ingest: (url: string) => apiClient<{ success: boolean; data: Partial<ParsedJob> & { isDuplicate?: boolean; existingId?: string | null }; message?: string }>(`/api/opportunities/ingest`, {
        method: 'POST',
        body: JSON.stringify({ url }),
        headers: { 'Content-Type': 'application/json' }
    }),
    submit: (data: Partial<ParsedJob>) => apiClient<{
        success: boolean;
        id: string;
        existing?: boolean;
        pending?: boolean;
        message?: string;
    }>(`/api/opportunities/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    }),

    shareLink: (url: string, title?: string, company?: string) => apiClient<{
        success: boolean;
        id: string;
        existing?: boolean;
        pending?: boolean;
        message?: string;
    }>(`/api/opportunities/share`, {
        method: 'POST',
        body: JSON.stringify({ url, title, company }),
        headers: { 'Content-Type': 'application/json' }
    }),

    // Backward-compatible alias for pre-migration callers
    get: (id: string) => apiClient(`/api/opportunities/${id}`),

    /**
     * Performs a lightweight sync of opportunity statuses.
     * @param since ISO timestamp of last sync
     */
    sync: (since?: string): Promise<{ timestamp: string; updates: SyncUpdate[] }> => {
        return apiClient(`/api/opportunities/sync${since ? `?since=${since}` : ''}`);
    },
};

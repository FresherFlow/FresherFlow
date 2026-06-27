import { apiClient } from './apiClient';
import { Opportunity, OpportunityListResponse, RawOpportunity } from '@fresherflow/types';

export interface OpportunityListParams {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    sector?: string;
    q?: string;
    sort?: string;
}

export const adminOpportunitiesApi = {
    list: (params: OpportunityListParams = {}) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                query.append(key, String(value));
            }
        });
        const queryString = query.toString();
        return apiClient<OpportunityListResponse>(`/api/admin/opportunities${queryString ? `?${queryString}` : ''}`);
    },

    get: (id: string) =>
        apiClient<{ opportunity: Opportunity }>(`/api/admin/opportunities/${id}`),

    create: (payload: unknown) =>
        apiClient<{ opportunity: Opportunity }>('/api/admin/opportunities', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    update: (id: string, payload: unknown) =>
        apiClient<{ opportunity: Opportunity }>(`/api/admin/opportunities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    expire: (id: string, reason?: string) =>
        apiClient<{ message: string }>(`/api/admin/opportunities/${id}/expire`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    restore: (id: string) =>
        apiClient<{ message: string }>(`/api/admin/opportunities/${id}/restore`, { method: 'POST' }),

    delete: (id: string, reason?: string) =>
        apiClient<{ message: string }>(`/api/admin/opportunities/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    hardDelete: (id: string, reason?: string) =>
        apiClient<{ message: string }>(`/api/admin/opportunities/${id}/hard`, {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        }),

    parse: (url: string) =>
        apiClient<{ draft: unknown }>('/api/admin/opportunities/parse', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),

    parseText: (text: string) =>
        apiClient<{ parsed: unknown }>('/api/admin/opportunities/parse', {
            method: 'POST',
            body: JSON.stringify({ text }),
        }),

    ingestDraft: (payload: unknown) =>
        apiClient<{ opportunity: Opportunity }>('/api/admin/opportunities/ingest-draft', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    events: (id: string) =>
        apiClient<{ events: { id: string; type: string; note?: string; createdAt: string }[] }>(
            `/api/admin/opportunities/${id}/events`,
        ),

    addEvent: (id: string, payload: unknown) =>
        apiClient<{ event: unknown }>(`/api/admin/opportunities/${id}/events`, {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    updateEvent: (oppId: string, eventId: string, payload: unknown) =>
        apiClient<{ event: unknown }>(`/api/admin/opportunities/${oppId}/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    deleteEvent: (oppId: string, eventId: string) =>
        apiClient<{ message: string }>(`/api/admin/opportunities/${oppId}/events/${eventId}`, {
            method: 'DELETE',
        }),

    exportCSV: (params: { status?: string }) =>
        apiClient<{ message: string }>('/api/admin/opportunities/export', {
            method: 'POST',
            body: JSON.stringify(params),
        }),

    getSubmissions: () =>
        apiClient<{ submissions: RawOpportunity[] }>('/api/admin/opportunities/submissions'),

    rejectSubmission: (id: string) =>
        apiClient<{ success: boolean }>(`/api/admin/opportunities/submissions/${id}/reject`, {
            method: 'POST',
        }),

    bulkSubmissions: (payload: { ids: string[]; action: 'PUBLISH' | 'ARCHIVE' }) =>
        apiClient<{ success: boolean; updatedCount: number }>('/api/admin/opportunities/submissions/bulk', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    summary: () =>
        apiClient<{ summary: Record<string, unknown> }>('/api/admin/opportunities/summary'),
};

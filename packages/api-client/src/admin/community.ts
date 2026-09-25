import { apiClient } from './apiClient';

/**
 * Admin community moderation (V1 checklist F): remove/spam for posts,
 * comments, interviews, and hiring updates. Mirrors the opportunity
 * lifecycle helpers in adminOpportunitiesApi.
 */
export const adminCommunityApi = {
    moderationQueue: (params: { kind?: 'interview' | 'update' | 'hiring-post'; status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED'; page?: number; limit?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.kind) query.append('kind', params.kind);
        if (params.status) query.append('status', params.status);
        if (params.page !== undefined) query.append('page', String(params.page));
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        const queryString = query.toString();
        return apiClient<{ success: boolean; items: unknown[]; total: number; page: number; limit: number }>(
            `/api/admin/community/moderation-queue${queryString ? `?${queryString}` : ''}`,
        );
    },

    deletePost: (id: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/posts/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Removed by moderator' }),
        }),

    spamPost: (id: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/posts/${id}/spam`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || 'Flagged as spam' }),
        }),

    restorePost: (id: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/posts/${id}/restore`, {
            method: 'POST',
        }),

    deletePostComment: (commentId: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/posts/comments/${commentId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Removed by moderator' }),
        }),

    deleteJobComment: (commentId: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/comments/${commentId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Removed by moderator' }),
        }),

    deleteInterview: (id: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/interviews/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Removed by moderator' }),
        }),

    spamInterview: (id: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/interviews/${id}/spam`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || 'Flagged as spam' }),
        }),

    restoreInterview: (id: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/interviews/${id}/restore`, {
            method: 'POST',
        }),

    deleteUpdate: (id: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/community/updates/${id}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: reason || 'Removed by moderator' }),
        }),
};

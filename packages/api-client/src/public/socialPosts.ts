import { apiClient } from './apiClient';
import { SocialPost } from '@fresherflow/types';

export interface SocialPostSummary {
    pending: number;
    published: number;
    failed: number;
    disabled: number;
    dryRun: number;
}

export const socialPostsApi = {
    list: (params?: { page?: number; status?: string; platform?: string }) => {
        const query = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    query.append(key, String(value));
                }
            });
        }
        const queryString = query.toString();
        return apiClient<{ posts: SocialPost[]; total: number; summary: SocialPostSummary }>(`/api/admin/social-posts${queryString ? `?${queryString}` : ''}`);
    },

    retry: (id: string) =>
        apiClient<{ message: string }>(`/api/admin/social-posts/${id}/retry`, {
            method: 'POST',
        }),
};

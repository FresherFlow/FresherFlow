import { apiClient } from './apiClient';
import { AppFeedback, ListingFeedback } from '@fresherflow/types';

export type ListingFeedbackSummary = {
    opportunity: {
        id: string;
        title: string;
        company: string;
        type: string;
    } | null;
    feedbackCount: number;
    negativeCount: number;
    feedback: Array<{
        id: string;
        reason: string;
        createdAt: string;
        user?: {
            fullName?: string | null;
            email?: string;
        } | null;
    }>;
};

export interface FeedbackAlerts {
    listingCount: number;
    appCount: number;
    total: number;
}

export type AppFeedbackItem = {
    id: string;
    type: string;
    message: string;
    rating?: number | null;
    category?: string | null;
    createdAt: string;
    user?: {
        fullName?: string;
        email?: string;
    } | null;
};

export const adminFeedbackApi = {
    list: (params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) query.append(key, String(value));
            });
        }
        const qs = query.toString();
        return apiClient<{ feedbackSummary: ListingFeedbackSummary[] }>(`/api/admin/feedback${qs ? `?${qs}` : ''}`);
    },

    appFeedback: (params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) query.append(key, String(value));
            });
        }
        const qs = query.toString();
        return apiClient<{ feedback: AppFeedbackItem[]; total: number }>(`/api/admin/app-feedback${qs ? `?${qs}` : ''}`);
    },

    alerts: (since?: string) => {
        const qs = since ? `?since=${encodeURIComponent(since)}` : '';
        return apiClient<FeedbackAlerts>(`/api/admin/feedback/alerts${qs}`);
    },

    opportunityFeedback: (oppId: string) =>
        apiClient<{ feedback: ListingFeedback[] }>(`/api/admin/feedback/opportunities/${oppId}`)
};

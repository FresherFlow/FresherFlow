import { apiClient } from './apiClient';

export interface AnalyticsOverview {
    windowDays: number;
    urgent: { closingSoon48h: number; brokenLinks: number };
    [key: string]: unknown;
}

export interface RecentActivity {
    items: {
        id: string;
        action: string;
        entity: string;
        createdAt: string;
        adminEmail?: string;
    }[];
}

export const adminAnalyticsApi = {
    overview: (days = 30) =>
        apiClient<AnalyticsOverview>(`/api/admin/analytics/overview?days=${days}`),

    recentActivity: (limit = 10) =>
        apiClient<RecentActivity>(`/api/admin/analytics/recent-activity?limit=${limit}`),
};

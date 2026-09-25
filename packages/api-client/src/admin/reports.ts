import { apiClient } from './apiClient';

export type AdminReportStatus = 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface AdminReport {
    id: string;
    reason: string;
    message: string | null;
    status: AdminReportStatus;
    createdAt: string;
    resolvedAt: string | null;
    opportunityId: string | null;
    commentId: string | null;
    reporter: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
    resolvedBy: { id: string; fullName: string | null; username: string | null } | null;
    opportunity: { id: string; slug: string; title: string; company: string } | null;
    comment: { id: string; text: string; opportunityId: string } | null;
}

export const adminReportsApi = {
    list: (params: { status?: AdminReportStatus; page?: number; limit?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.status) query.append('status', params.status);
        if (params.page !== undefined) query.append('page', String(params.page));
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        const queryString = query.toString();
        return apiClient<{ reports: AdminReport[]; openCount: number; status: string; pagination: { total: number; page: number; limit: number; pages: number } }>(
            `/api/admin/reports${queryString ? `?${queryString}` : ''}`,
        );
    },

    resolve: (id: string, note?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/reports/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),

    dismiss: (id: string, note?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/reports/${id}/dismiss`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        }),
};

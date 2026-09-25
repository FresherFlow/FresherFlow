import { apiClient } from './apiClient';

export interface AuditEntry {
    id: string;
    action: string;
    targetId: string;
    reason: string | null;
    createdAt: string;
    user: { id: string; fullName: string | null; username: string | null; email: string | null } | null;
}

export const adminAuditApi = {
    list: (params: { actorId?: string; action?: string; targetId?: string; page?: number; limit?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.actorId) query.append('actorId', params.actorId);
        if (params.action) query.append('action', params.action);
        if (params.targetId) query.append('targetId', params.targetId);
        if (params.page !== undefined) query.append('page', String(params.page));
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        const queryString = query.toString();
        return apiClient<{
            entries: AuditEntry[];
            pagination: { total: number; page: number; limit: number; pages: number };
        }>(`/api/admin/audit${queryString ? `?${queryString}` : ''}`);
    },
};

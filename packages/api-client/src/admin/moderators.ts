import { apiClient } from './apiClient';

export interface ModeratorEntry {
    id: string;
    fullName: string | null;
    username: string | null;
    email: string | null;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
    trustLevel: string;
    createdAt: string;
    assignedAt: string;
    assignedBy: string | null;
}

export const adminModeratorsApi = {
    list: () =>
        apiClient<{ moderators: ModeratorEntry[] }>('/api/admin/moderators'),

    grant: (userId: string, reason?: string) =>
        apiClient<{ success: boolean }>(`/api/admin/moderators/${encodeURIComponent(userId)}`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    revoke: (userId: string) =>
        apiClient<{ success: boolean }>(`/api/admin/moderators/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
        }),
};

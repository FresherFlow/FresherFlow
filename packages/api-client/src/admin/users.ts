import { apiClient } from './apiClient';
import { User } from '@fresherflow/types';

export interface ClaimedHandle {
    id: string;
    username: string;
    fullName: string;
    email: string;
    source: 'Google' | 'GitHub' | 'OTP Auth';
    status: 'Vetted' | 'Active' | 'Pending';
    claimedAt: string;
}

export interface ReferrerStats {
    id: string;
    fullName: string;
    code: string;
    clicks: number;
    signups: number;
    conversionRate: number;
}

export const adminUsersApi = {
    getUsers: () =>
        apiClient<{ users: User[] }>('/api/admin/users'),

    getClaimedHandles: () =>
        apiClient<{ handles: ClaimedHandle[] }>('/api/admin/users/handles'),

    vetUserHandle: (userId: string) =>
        apiClient<{ success: boolean; user: User }>(`/api/admin/users/${userId}/vet`, { method: 'POST' }),

    getReferrers: () =>
        apiClient<{ referrers: ReferrerStats[] }>('/api/admin/users/referrers'),
};

import { Profile, RawOpportunity } from '@fresherflow/types';
import { apiClient } from './apiClient';

export const profileApi = {
    get: () => apiClient('/api/profile'),

    updateProfile: (data: Partial<Profile> & { fullName?: string }) =>
        apiClient('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updateEducation: (data: {
        fullName?: string;
        educationLevel: string;
        tenthYear: number;
        twelfthYear: number;
        gradCourse: string;
        gradSpecialization: string;
        gradYear: number;
        // Optional PG fields
        pgCourse?: string;
        pgSpecialization?: string;
        pgYear?: number;
    }) =>
        apiClient('/api/profile/education', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updatePreferences: (data: {
        interestedIn: string[];
        preferredCities: string[];
        workModes: string[];
    }) =>
        apiClient('/api/profile/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updateReadiness: (data: { availability: string; skills: string[] }) =>
        apiClient('/api/profile/readiness', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    getCompletion: () => apiClient('/api/profile/completion'),

    registerPushToken: (token: string, platform: string) =>
        apiClient('/api/profile/push-token', {
            method: 'POST',
            body: JSON.stringify({ token, platform })
        }),

    getShares: (page = 1) =>
        apiClient<{
            shares: Array<{
                id: string;
                sourceLink: string;
                mappedOpportunityId?: string | null;
                createdAt: string;
                mappedOpportunity?: {
                    id: string;
                    title: string;
                    company: string;
                    status: string;
                    publishedAt: string;
                    expiredAt: string;
                    clicksCount: number;
                    savesCount: number;
                } | null;
            }>;
            stats: {
                totalShared: number;
                totalPublished: number;
                approvalRate: number;
            };
            page: number;
            total: number;
            hasMore: boolean;
        }>(`/api/profile/shares?page=${page}`),

    submitShare: (data: { url?: string; referral?: { title?: string; contact: string; description: string; company: string; companyUrl?: string; eligibleBatches?: string } }) =>
        apiClient<{ success: boolean; message: string; share: RawOpportunity }>('/api/profile/shares', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // Backward-compatible aliases
    getContributions: (page = 1) => profileApi.getShares(page),
    submitContribution: (data: { url?: string; referral?: { title?: string; contact: string; description: string; company: string; companyUrl?: string; eligibleBatches?: string } }) => profileApi.submitShare(data),
};

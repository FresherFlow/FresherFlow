import { SavedCandidate, CandidateInterest } from '@fresherflow/types';
import { apiClient } from './apiClient';

export const recruiterApi = {
    searchCandidates: (params?: { skill?: string; batch?: string; degree?: string; search?: string; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.skill) searchParams.set('skill', params.skill);
        if (params?.batch) searchParams.set('batch', params.batch);
        if (params?.degree) searchParams.set('degree', params.degree);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const query = searchParams.toString();
        return apiClient<{ success: boolean; data: unknown[]; pagination: { total: number; page: number; pages: number } }>(
            `/api/recruiter/candidates${query ? `?${query}` : ''}`
        );
    },

    getCandidateProfile: (candidateId: string) =>
        apiClient<{ success: boolean; data: unknown }>(`/api/recruiter/candidates/${candidateId}`),

    saveCandidate: (candidateId: string, collectionName?: string) =>
        apiClient<{ success: boolean; data: SavedCandidate }>('/api/recruiter/saved-candidates', {
            method: 'POST',
            body: JSON.stringify({ candidateId, collectionName })
        }),

    removeSavedCandidate: (candidateId: string) =>
        apiClient<{ success: boolean; message: string }>(`/api/recruiter/saved-candidates/${candidateId}`, {
            method: 'DELETE'
        }),

    getSavedCandidates: () =>
        apiClient<{ success: boolean; data: SavedCandidate[] }>('/api/recruiter/saved-candidates'),

    sendInterest: (data: { organizationId: string; candidateId: string; opportunityId?: string; message?: string }) =>
        apiClient<{ success: boolean; data: CandidateInterest }>('/api/interests/recruiter/interests', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    getSentInterests: (organizationId?: string) =>
        apiClient<{ success: boolean; data: CandidateInterest[] }>(
            `/api/interests/recruiter/interests${organizationId ? `?organizationId=${organizationId}` : ''}`
        )
};

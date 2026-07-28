import { apiClient } from './_core';

export type CandidateSearchQuery = {
    skill?: string;
    batch?: string;
    degree?: string;
    search?: string;
    page?: number;
    limit?: number;
};

export type CandidateProfileItem = {
    id: string;
    userId: string;
    headline: string | null;
    about: string | null;
    skills: string[];
    gradCourse: string | null;
    gradSpecialization: string | null;
    gradYear: number | null;
    educationLevel: string | null;
    availability: string | null;
    preferredCities: string[];
    workModes: string[];
    openToRecruiters: boolean;
    user: {
        id: string;
        fullName: string | null;
        username: string;
        email?: string;
        projects?: Array<{
            id: string;
            title: string;
            description: string | null;
            githubUrl: string | null;
            liveUrl: string | null;
            skills: string[];
        }>;
    };
};

export type CandidateSearchResponse = {
    success: boolean;
    data: CandidateProfileItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
};

export type SavedCandidateItem = {
    id: string;
    candidateId: string;
    recruiterId: string;
    savedAt: string;
    candidate: CandidateProfileItem['user'] & {
        profile?: CandidateProfileItem | null;
    };
};

export async function fetchRecruiterCandidates(params: CandidateSearchQuery = {}): Promise<CandidateSearchResponse> {
    const query = new URLSearchParams();
    if (params.skill) query.set('skill', params.skill);
    if (params.batch && params.batch !== 'ALL') query.set('batch', params.batch);
    if (params.degree && params.degree !== 'ALL') query.set('degree', params.degree);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/api/recruiter/candidates${qs ? `?${qs}` : ''}`;
    return apiClient<CandidateSearchResponse>(endpoint);
}

export async function fetchSavedCandidates(): Promise<{ success: boolean; data: SavedCandidateItem[] }> {
    return apiClient<{ success: boolean; data: SavedCandidateItem[] }>('/api/recruiter/saved-candidates');
}

export async function saveCandidateToPool(candidateId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('/api/recruiter/saved-candidates', {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
    });
}

export async function removeSavedCandidateFromPool(candidateId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/recruiter/saved-candidates/${candidateId}`, {
        method: 'DELETE',
    });
}

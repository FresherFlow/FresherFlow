import { Profile } from '@fresherflow/types';
import { apiClient } from './_core';

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
        collegeId?: string | null;
        collegeName?: string | null;
        collegeState?: string | null;
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

    claimUsername: (username: string) =>
        apiClient<{ success: boolean; username: string; message?: string }>('/api/profile/username/claim', {
            method: 'POST',
            body: JSON.stringify({ username })
        }),

    updateVisibility: (visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE') =>
        apiClient('/api/profile/visibility', {
            method: 'PATCH',
            body: JSON.stringify({ visibility })
        }),

    publishProfile: () =>
        apiClient<{ publishedAt: string }>('/api/profile/publish', {
            method: 'POST'
        }),

    getCompletion: () => apiClient('/api/profile/completion')
};


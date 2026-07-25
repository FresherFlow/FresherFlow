import { Project, CandidateInterest, CandidateInterestStatus } from '@fresherflow/types';
import { apiClient } from './apiClient';

export const candidateApi = {
    getProjects: () =>
        apiClient<{ success: boolean; data: Project[] }>('/api/candidate/projects'),

    createProject: (data: { title: string; description?: string; githubUrl?: string; liveUrl?: string; skills?: string[]; order?: number }) =>
        apiClient<{ success: boolean; data: Project }>('/api/candidate/projects', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    updateProject: (id: string, data: Partial<{ title: string; description?: string; githubUrl?: string; liveUrl?: string; skills?: string[]; order?: number }>) =>
        apiClient<{ success: boolean; message: string }>(`/api/candidate/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    deleteProject: (id: string) =>
        apiClient<{ success: boolean; message: string }>(`/api/candidate/projects/${id}`, {
            method: 'DELETE'
        }),

    getReceivedInterests: () =>
        apiClient<{ success: boolean; data: CandidateInterest[] }>('/api/interests/candidate/interests'),

    updateInterestStatus: (id: string, status: CandidateInterestStatus) =>
        apiClient<{ success: boolean; message: string }>(`/api/interests/candidate/interests/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        })
};

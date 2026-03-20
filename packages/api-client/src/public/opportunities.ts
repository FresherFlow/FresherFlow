import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const opportunitiesApi = {
    list: (params?: { type?: string; city?: string; company?: string; closingSoon?: boolean; minSalary?: number; maxSalary?: number; page?: number; sort?: string }) => {
        const query = new URLSearchParams();
        if (params?.type) query.append('type', params.type);
        if (params?.city) query.append('city', params.city);
        if (params?.company) query.append('company', params.company);
        if (params?.closingSoon) query.append('closingSoon', 'true');
        if (params?.minSalary) query.append('minSalary', String(params.minSalary));
        if (params?.maxSalary) query.append('maxSalary', String(params.maxSalary));
        if (params?.page) query.append('page', String(params.page));
        if (params?.sort) query.append('sort', params.sort);

        const queryString = query.toString();
        return apiClient(`/api/opportunities${queryString ? `?${queryString}` : ''}`);
    },
    search: (params: { q: string; type?: string; city?: string; page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        query.append('q', params.q);
        if (params.type) query.append('type', params.type);
        if (params.city) query.append('city', params.city);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        return apiClient(`/api/opportunities/search?${query.toString()}`);
    },

    getById: (id: string) => apiClient(`/api/opportunities/${id}`),

    // Backward-compatible alias for pre-migration callers
    get: (id: string) => apiClient(`/api/opportunities/${id}`)
};

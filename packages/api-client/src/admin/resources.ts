import { apiClient } from './apiClient';
import { AdminGetResourcesResponse, AdminUpdateResourceRequest, SharedResource, ResourceItemStatus } from '@fresherflow/types';

export const adminResourcesApi = {
    getResources: async (
        params?: { page?: number; limit?: number; status?: ResourceItemStatus; search?: string }
    ): Promise<AdminGetResourcesResponse> => {
        return apiClient<AdminGetResourcesResponse>('/api/admin/resources', { params });
    },

    updateResource: async (id: string, data: AdminUpdateResourceRequest): Promise<{ resource: SharedResource }> => {
        return apiClient<{ resource: SharedResource }>(`/api/admin/resources/${id}`, { method: 'PATCH', body: data });
    },

    deleteResource: async (id: string): Promise<void> => {
        return apiClient<void>(`/api/admin/resources/${id}`, { method: 'DELETE' });
    }
};

import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const savedApi = {
    list: () => apiClient('/api/saved'),
    toggle: (opportunityId: string) =>
        apiClient(`/api/saved/${opportunityId}`, {
            method: 'POST'
        })
};

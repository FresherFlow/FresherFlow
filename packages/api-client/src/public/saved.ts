import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const savedApi = {
    list: () => apiClient('/api/saved'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggle: (opportunityId: string, details?: any) =>
        apiClient(`/api/saved/${opportunityId}`, {
            method: 'POST',
            body: details ? JSON.stringify(details) : undefined
        })
};

import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const dashboardApi = {
    getHighlights: () => apiClient('/api/dashboard/highlights')
};

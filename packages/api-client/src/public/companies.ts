import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const companiesApi = {
    search: (query: string) => apiClient(`/api/public/companies/search?q=${encodeURIComponent(query)}`),
    getByName: (name: string) => apiClient(`/api/public/companies/${encodeURIComponent(name)}`)
};

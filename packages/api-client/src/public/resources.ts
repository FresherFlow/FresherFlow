import { apiClient } from './apiClient';

export const resourcesApi = {
    submit: (url: string) =>
        apiClient<{ resource: { id: string; url: string; title: string } }>('/api/resources', {
            method: 'POST',
            body: JSON.stringify({ url }),
        }),
};

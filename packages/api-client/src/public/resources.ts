import { apiClient } from './apiClient';
import type { MyResourcesResult } from '@fresherflow/types';

export const resourcesApi = {
    submit: (url: string, opts?: { title?: string; description?: string }) =>
        apiClient<{ resource: { id: string; url: string; title: string } }>('/api/resources', {
            method: 'POST',
            body: JSON.stringify({
                url,
                ...(opts?.title?.trim() ? { title: opts.title.trim() } : {}),
                ...(opts?.description?.trim() ? { description: opts.description.trim() } : {}),
            }),
        }),

    listMine: () => apiClient<MyResourcesResult>('/api/resources/mine'),
};

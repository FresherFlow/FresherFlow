import { Organization, OrganizationType, OrgRole } from '@fresherflow/types';
import { apiClient } from './apiClient';

export const organizationsApi = {
    create: (data: { orgName: string; type?: OrganizationType; website?: string }) =>
        apiClient<{ success: boolean; data: { organization: Organization; autoJoined: boolean } }>('/api/organizations', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    get: (idOrSlug: string) =>
        apiClient<{ success: boolean; data: Organization }>(`/api/organizations/${idOrSlug}`),

    invite: (orgId: string, data: { email: string; role?: OrgRole }) =>
        apiClient<{ success: boolean; data: unknown }>(`/api/organizations/${orgId}/invite`, {
            method: 'POST',
            body: JSON.stringify(data)
        })
};

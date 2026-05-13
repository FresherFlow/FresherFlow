import { apiClient } from '../apiClient';

export interface FollowsResponse {
  tags: string[];
  companies: string[];
  contributors: string[];
}

export const followsApi = {
  get: async () => {
    return apiClient<FollowsResponse>('/api/follows');
  },
  follow: async (data: { type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string }) => {
    return apiClient<{ id: string; type: string; value: string }>('/api/follows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  unfollow: async (data: { type: 'TAG' | 'COMPANY' | 'CONTRIBUTOR', value: string }) => {
    return apiClient<{ success: boolean }>('/api/follows', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  },
};

import { apiClient } from './apiClient';

export const usernameApi = {
    /**
     * Checks if a username is available for claiming.
     */
    check: (username: string) =>
        apiClient<{ available: boolean; reason?: string }>(`/api/profile/username/check?username=${encodeURIComponent(username)}`),

    /**
     * Claims a unique handle for the authenticated user.
     */
    claim: (username: string) =>
        apiClient<{ success: boolean; username: string; message: string }>('/api/profile/username/claim', {
            method: 'POST',
            body: JSON.stringify({ username })
        }),
};

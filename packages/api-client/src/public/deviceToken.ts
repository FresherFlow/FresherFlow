import { apiClient } from '../apiClient';

export const deviceTokenApi = {
    /**
     * Register or refresh an FCM device token for the current user.
     * Safe to call multiple times — upserts by token.
     */
    register: (token: string, platform: 'ios' | 'android') =>
        apiClient('/api/device-token', { method: 'POST', body: { token, platform } }),

    /**
     * Remove the device token on logout so pushes stop for this device.
     */
    unregister: (token: string) =>
        apiClient('/api/device-token', { method: 'DELETE', body: { token } }),
};

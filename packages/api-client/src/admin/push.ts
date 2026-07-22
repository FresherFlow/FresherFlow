import { apiClient } from '../apiClient';

export interface PushNotificationParams {
    title: string;
    message: string;
    url?: string;
}

export const adminPushApi = {
    getDevices: () => 
        apiClient<{ count: number }>('/api/admin/push/devices'),
    
    sendPush: (data: PushNotificationParams) => 
        apiClient<{ success: boolean; sent?: number; failed?: number; message?: string }>('/api/admin/push', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
};

import { apiClient } from '../apiClient';

export interface SocialPostParams {
    text: string;
    platforms: string[];
    opportunityId?: string;
}

export interface SchedulePostParams extends SocialPostParams {
    scheduleTime: string; // ISO String
}

export const adminSocialApi = {
    getWorkerHealth: () => 
        apiClient<{ online: boolean; uptime: number | null }>('/api/admin/social/worker-health'),
    
    getPlatforms: () => 
        apiClient<Record<string, boolean>>('/api/admin/social/platforms'),
    
    sendSocialPost: (data: SocialPostParams) => 
        apiClient<{ results: Record<string, { status: string; id?: string; error?: string }> }>('/api/admin/social/send', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    
    scheduleSocialPost: (data: SchedulePostParams) => 
        apiClient<{ jobId: string; status: string }>('/api/admin/social/schedule', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
};

import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const appFeedbackApi = {
    submit: (data: { type: string; rating?: number; message: string; pageUrl?: string }) =>
        apiClient('/api/feedback', {
            method: 'POST',
            body: JSON.stringify(data)
        })
};

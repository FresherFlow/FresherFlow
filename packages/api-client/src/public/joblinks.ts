import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const joblinksApi = {
    submit: (url: string, source: string) =>
        apiClient('/api/public/submit-job-link', {
            method: 'POST',
            body: JSON.stringify({ url, source })
        }),
};

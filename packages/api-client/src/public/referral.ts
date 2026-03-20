import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const referralApi = {
    getMe: () => apiClient<unknown>('/api/referrals/me'),
    validateCode: (code: string) => apiClient<{ valid: boolean; referrerId: string }>(`/api/public/referrals/${code}`),
    trackClick: (code: string) => apiClient(`/api/public/referrals/${code}/click`, { method: 'POST' }),
};

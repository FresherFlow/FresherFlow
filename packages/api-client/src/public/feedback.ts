import { apiClient } from './apiClient';
// Optional types fallback placeholder
export const feedbackApi = {
    submit: (opportunityId: string, reason: string, description?: string) =>
        apiClient(`/api/opportunities/${opportunityId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ reason, description })
        })
};

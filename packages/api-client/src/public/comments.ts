import { apiClient } from './apiClient';

export interface Comment {
    id: string;
    text: string;
    createdAt: string;
    user: {
        id: string;
        fullName: string;
    };
}

export const commentsApi = {
    list: (opportunityId: string) =>
        apiClient<Comment[]>(`/api/opportunities/${opportunityId}/comments`),

    post: (opportunityId: string, text: string) =>
        apiClient<Comment>(`/api/opportunities/${opportunityId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        }),

    delete: (opportunityId: string, commentId: string) =>
        apiClient(`/api/opportunities/${opportunityId}/comments/${commentId}`, {
            method: 'DELETE',
        }),
};

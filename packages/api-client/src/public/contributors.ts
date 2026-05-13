import { apiClient } from './apiClient';
import { Opportunity } from '@fresherflow/types';

export interface Contributor {
    id: string;
    fullName: string;
    trustLevel: string;
    createdAt: string;
    stats: {
        totalContributed: number;
        totalPublished: number;
        approvalRate: number;
    };
}

export const contributorsApi = {
    list: (userId: string, page = 1) =>
        apiClient<{
            user: Contributor;
            opportunities: Opportunity[];
            page: number;
            total: number;
            hasMore: boolean;
        }>(`/api/public/contributors/${userId}/opportunities?page=${page}`),
};

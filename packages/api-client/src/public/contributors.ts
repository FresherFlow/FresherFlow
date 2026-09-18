import { apiClient } from './apiClient';
import { Opportunity } from '@fresherflow/types';

export interface Contributor {
    id: string;
    fullName: string;
    trustLevel: string;
    createdAt: string;
    username?: string;
    usernameUpdatedAt?: string;
    stats: {
        totalContributed: number;
        totalPublished: number;
        approvalRate: number;
    };
}

export interface LeaderboardEntry {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    trustLevel: string;
    stats: {
        submissions: number;
        comments: number;
        signals: number;
        score: number;
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

    leaderboard: (limit = 20) =>
        apiClient<{
            leaderboard: LeaderboardEntry[];
            total: number;
        }>(`/api/contributors/leaderboard?limit=${limit}`),
};

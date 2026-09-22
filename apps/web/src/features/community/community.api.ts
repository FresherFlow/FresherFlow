import { communityApi } from '@fresherflow/api-client';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { CommunityPostCategory, ReferralRequestStatus } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';

export async function safeCommunityRequest<T>(fn: () => Promise<T>, user: { id: string } | null): Promise<{ data: T | null; error: string | null }> {
    if (!user) {
        return { data: null, error: 'Please sign in to continue.' };
    }
    try {
        const data = await fn();
        return { data, error: null };
    } catch (e) {
        const msg = e instanceof Error && e.message ? e.message : 'Something went wrong.';
        if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('Session expired')) {
            return { data: null, error: 'Please sign in to continue.' };
        }
        return { data: null, error: msg };
    }
}

export const communityBoard = {
    listPosts: (opts: { page?: number; limit?: number; category?: CommunityPostCategory; tag?: string; tags?: string[]; search?: string; sourceOpportunityId?: string }) =>
        communityApi.listCommunityPosts(opts),
    createPost: (data: { title: string; body: string; category?: CommunityPostCategory; tags?: string[]; sourceOpportunityId?: string }) =>
        communityApi.createCommunityPost(data),
    votePost: (postId: string) => communityApi.voteCommunityPost(postId),
    addComment: (postId: string, body: string, parentId?: string) =>
        communityApi.addCommunityPostComment(postId, { body, parentId }),
    deleteComment: (postId: string, commentId: string) =>
        communityApi.deleteCommunityPostComment(postId, commentId),
    voteComment: (postId: string, commentId: string) =>
        communityApi.voteCommunityPostComment(postId, commentId),
    getPost: (postId: string) => communityApi.getCommunityPost(postId),
    listTrendingTags: (limit: number) => communityApi.listTrendingTags(limit),
    listRooms: (opts: { page?: number; limit?: number; type?: string; search?: string; sort?: 'popular' | 'newest' }) =>
        communityApi.listRooms(opts),
    getRoom: (slug: string) => communityApi.getRoom(slug),
    joinRoom: (slug: string) => communityApi.joinRoom(slug),
    leaveRoom: (slug: string) => communityApi.leaveRoom(slug),
    listRoomPosts: (slug: string, opts: { page?: number; limit?: number }) =>
        communityApi.listRoomPosts(slug, opts),
};

export const fresherNeedsBoard = {
    listSalaryReports: (opts: { limit?: number }) => fresherNeedsApi.listSalaryReports(opts),
    createSalaryReport: (data: { company: string; role: string; ctcTotal?: number; inHandMonthly?: number; bondMonths?: number; notes?: string }) =>
        fresherNeedsApi.createSalaryReport(data),
    markSalaryReportHelpful: (id: string) => fresherNeedsApi.markSalaryReportHelpful(id),
    listReferralRequests: (opts: { limit?: number }) => fresherNeedsApi.listReferralRequests(opts),
    createReferralRequest: (data: { company: string; role?: string; note?: string }) =>
        fresherNeedsApi.createReferralRequest(data),
    respondToReferralRequest: (id: string, data: { message?: string; contactHandle?: string }) =>
        fresherNeedsApi.respondToReferralRequest(id, data),
    updateReferralRequestStatus: (id: string, status: ReferralRequestStatus) => fresherNeedsApi.updateReferralRequestStatus(id, status),
    listSavedSearches: () => fresherNeedsApi.listSavedSearches(),
    createSavedSearch: (data: { name: string; filters: Record<string, unknown>; alertEnabled: boolean }) =>
        fresherNeedsApi.createSavedSearch(data),
    updateSavedSearch: (id: string, data: Record<string, unknown>) => fresherNeedsApi.updateSavedSearch(id, data),
    deleteSavedSearch: (id: string) => fresherNeedsApi.deleteSavedSearch(id),
    companyHub: (companyName: string) => fresherNeedsApi.companyHub(companyName),
};

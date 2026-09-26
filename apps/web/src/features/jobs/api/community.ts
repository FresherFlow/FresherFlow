import { apiClient } from '@/lib/api/client';
import type {
    CommentListResult,
    CommentCountMap,
    CommunityComment,
    CommentVoteResult,
    SignalState,
    ReportResult,
    CommentType,
    CommentVoteValue,
    JobSignalType,
    ReportReason,
    InterviewExperience,
    InterviewExperienceListResult,
    ApplicationUpdate,
    ApplicationUpdateListResult,
} from '@fresherflow/types';

/**
 * Authed web twin of the discussion surface in `@fresherflow/api-client`
 * (`packages/api-client/src/public/community.ts`).
 *
 * The package client is axios without storage configured in web (zero
 * `configureClient` calls in `apps/web`), so its writes carry no token and
 * the API 401s at `requireAuth`. Every method here hits the identical
 * endpoint string through `@/lib/api/core`'s fetch client instead, which
 * injects the Bearer token and refreshes it (`isUserProtectedEndpoint`
 * covers `/api/jobs`, `/api/interviews`, `/api/updates`) over the
 * same-origin dev rewrite with `credentials: include`.
 *
 * Same export name as the package on purpose: discussion call sites swap one
 * import line and keep every call unchanged. The package itself stays pure
 * (mobile/other consumers untouched). Non-discussion surfaces (rooms,
 * community feed, contribute, submit) keep using the package client.
 */
export const communityApi = {
    listComments: (id: string) =>
        apiClient<CommentListResult>(`/api/jobs/${encodeURIComponent(id)}/comments`),

    /** Batched comment counts for feed cards (max 200 ids per call). */
    getCommentCounts: (ids: string[]) =>
        apiClient<{ counts: CommentCountMap }>(
            `/api/jobs/comment-counts?ids=${encodeURIComponent(ids.join(','))}`
        ),

    postComment: (
        id: string,
        data: { text: string; commentType?: CommentType; parentCommentId?: string }
    ) =>
        apiClient<CommunityComment>(`/api/jobs/${encodeURIComponent(id)}/comments`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    voteComment: (id: string, commentId: string, value: CommentVoteValue) =>
        apiClient<CommentVoteResult>(
            `/api/jobs/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/vote`,
            { method: 'POST', body: JSON.stringify({ value }) }
        ),

    deleteComment: (id: string, commentId: string) =>
        apiClient<void>(
            `/api/jobs/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
            { method: 'DELETE' }
        ),

    getSignals: (id: string) =>
        apiClient<SignalState>(`/api/jobs/${encodeURIComponent(id)}/signals`),

    toggleSignal: (id: string, signalType: JobSignalType) =>
        apiClient<SignalState>(`/api/jobs/${encodeURIComponent(id)}/signals`, {
            method: 'POST',
            body: JSON.stringify({ signalType }),
        }),

    createReport: (id: string, data: { reason: ReportReason; message?: string }) =>
        apiClient<ReportResult>(`/api/jobs/${encodeURIComponent(id)}/reports`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    createCommentReport: (
        id: string,
        commentId: string,
        data: { reason: ReportReason; message?: string }
    ) =>
        apiClient<ReportResult>(
            `/api/jobs/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/reports`,
            { method: 'POST', body: JSON.stringify(data) }
        ),

    // Interview Experiences
    listInterviewExperiences: (opportunityId: string, params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString();
        return apiClient<InterviewExperienceListResult>(
            `/api/interviews/opportunity/${encodeURIComponent(opportunityId)}${suffix ? `?${suffix}` : ''}`
        );
    },

    createInterviewExperience: (data: {
        opportunityId: string;
        role: string;
        batch?: number;
        rounds: Array<{ name: string; questions: string[]; notes?: string }>;
        difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
        result?: 'SELECTED' | 'REJECTED' | 'WAITING' | 'WITHDRAWN';
        interviewDate?: string;
        overallNotes?: string;
    }) =>
        apiClient<InterviewExperience>('/api/interviews', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    voteInterviewExperience: (id: string, value: number) =>
        apiClient<{ upvotes: number; downvotes: number; myVote: number | null }>(
            `/api/interviews/${encodeURIComponent(id)}/vote`,
            { method: 'POST', body: JSON.stringify({ value }) }
        ),

    // Application Updates
    listApplicationUpdates: (opportunityId: string, params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString();
        return apiClient<ApplicationUpdateListResult>(
            `/api/updates/opportunity/${encodeURIComponent(opportunityId)}${suffix ? `?${suffix}` : ''}`
        );
    },

    createApplicationUpdate: (data: {
        opportunityId: string;
        status: 'APPLIED' | 'ASSESSMENT_RECEIVED' | 'ASSESSMENT_COMPLETED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'SELECTED' | 'REJECTED' | 'WAITING' | 'NO_RESPONSE';
        description?: string;
        evidenceUrl?: string;
    }) =>
        apiClient<ApplicationUpdate>('/api/updates', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

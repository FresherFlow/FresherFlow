import { apiClient } from './apiClient';
import type {
    CommentListResult,
    CommunityComment,
    CommentVoteResult,
    SignalState,
    SubmitJobResult,
    ReportResult,
    NotificationListResult,
    UserActivityResult,
    ApplicationDetails,
    CommentType,
    CommentVoteValue,
    JobSignalType,
    OpportunityType,
    ReportReason,
    SalaryPeriod,
    WorkMode,
    CommunityPost,
    CommunityPostComment,
    CommunityFeedResult,
    CommunityPostResult,
    CommunityPostCategory,
    InterviewExperience,
    InterviewExperienceListResult,
    ApplicationUpdate,
    ApplicationUpdateListResult,
    Area,
    AreaListResult,
    AreaDetailResult,
} from '@fresherflow/types';

export const communityApi = {
    listComments: (id: string) =>
        apiClient<CommentListResult>(`/api/jobs/${encodeURIComponent(id)}/comments`),

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

    submitJob: (data: {
        sourceUrl: string;
        applyUrl?: string;
        title: string;
        company?: string;
        description?: string;
        companyWebsite?: string;
        companyLogoUrl?: string | null;
        type?: OpportunityType;
        locations?: string[];
        workMode?: WorkMode | null;
        salaryRange?: string | null;
        salaryMin?: number | null;
        salaryMax?: number | null;
        salaryPeriod?: SalaryPeriod;
        stipend?: string | null;
        employmentType?: string | null;
        experienceMin?: number | null;
        experienceMax?: number | null;
        requiredSkills?: string[];
        tags?: string[];
        allowedDegrees?: string[];
        allowedCourses?: string[];
        allowedSpecializations?: string[];
        allowedPassoutYears?: number[];
        jobFunction?: string | null;
        incentives?: string | null;
        selectionProcess?: string | null;
        notesHighlights?: string | null;
        expiresAt?: string | null;
        applicationDetails?: ApplicationDetails | null;
        dates?: string[];
        dateRange?: string | null;
        timeRange?: string | null;
        venueAddress?: string | null;
        venueLink?: string | null;
        reportingTime?: string | null;
        contact?: string | null;
        submitterName?: string | null;
        website?: string;
    }) =>
        apiClient<SubmitJobResult>('/api/jobs/submit', {
            method: 'POST',
            body: JSON.stringify(data),
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

    listNotifications: (params?: { unread?: boolean; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.unread) query.set('unread', 'true');
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString();
        return apiClient<NotificationListResult>(`/api/notifications${suffix ? `?${suffix}` : ''}`);
    },

    markNotificationsRead: (ids?: string[]) =>
        apiClient<{ updated: number }>('/api/notifications/read', {
            method: 'POST',
            body: JSON.stringify(ids ? { ids } : {}),
        }),

    getUserActivity: (username: string) =>
        apiClient<UserActivityResult>(`/api/users/${encodeURIComponent(username)}/activity`),

    // Community Posts
    listCommunityPosts: (params?: {
        page?: number;
        limit?: number;
        category?: CommunityPostCategory;
        tag?: string;
        tags?: string[];
        search?: string;
    }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.category) query.set('category', params.category);
        if (params?.tag) query.set('tag', params.tag);
        if (params?.tags && params.tags.length > 0) query.set('tags', params.tags.join(','));
        if (params?.search && params.search.trim()) query.set('search', params.search.trim());
        const suffix = query.toString();
        return apiClient<CommunityFeedResult>(`/api/community/feed${suffix ? `?${suffix}` : ''}`);
    },

    listTrendingTags: (limit = 20) =>
        apiClient<{ tags: Array<{ tag: string; count: number }>; total: number }>(
            `/api/community/tags/trending?limit=${limit}`
        ),

    getCommunityPost: (id: string) =>
        apiClient<CommunityPostResult>(`/api/community/${encodeURIComponent(id)}`),

    createCommunityPost: (data: { title: string; body: string; category?: CommunityPostCategory; tags?: string[]; sourceOpportunityId?: string }) =>
        apiClient<CommunityPost>('/api/community', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    voteCommunityPost: (id: string, value: number) =>
        apiClient<{ upvotes: number; downvotes: number; myVote: number | null }>(
            `/api/community/${encodeURIComponent(id)}/vote`,
            { method: 'POST', body: JSON.stringify({ value }) }
        ),

    addCommunityPostComment: (id: string, data: { body: string; parentId?: string }) =>
        apiClient<CommunityPostComment>(
            `/api/community/${encodeURIComponent(id)}/comments`,
            { method: 'POST', body: JSON.stringify(data) }
        ),

    voteCommunityPostComment: (id: string, commentId: string, value: number) =>
        apiClient<{ upvotes: number; downvotes: number; myVote: number | null }>(
            `/api/community/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/vote`,
            { method: 'POST', body: JSON.stringify({ value }) }
        ),

    deleteCommunityPostComment: (id: string, commentId: string) =>
        apiClient<void>(
            `/api/community/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
            { method: 'DELETE' }
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

    getInterviewSummary: (opportunityId: string) =>
        apiClient<{ total: number; selected: number; rejected: number; waiting: number; avgDifficulty: string | null }>(
            `/api/interviews/opportunity/${encodeURIComponent(opportunityId)}/summary`
        ),

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

    getApplicationUpdateSummary: (opportunityId: string) =>
        apiClient<{ total: number; byStatus: Record<string, number> }>(
            `/api/updates/opportunity/${encodeURIComponent(opportunityId)}/summary`
        ),

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

    // Areas
    listAreas: (params?: {
        page?: number;
        limit?: number;
        type?: string;
        search?: string;
        sort?: 'popular' | 'newest';
    }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.type) query.set('type', params.type);
        if (params?.search && params.search.trim()) query.set('search', params.search.trim());
        if (params?.sort) query.set('sort', params.sort);
        const suffix = query.toString();
        return apiClient<AreaListResult>(`/api/areas${suffix ? `?${suffix}` : ''}`);
    },

    getArea: (slug: string) =>
        apiClient<AreaDetailResult>(`/api/areas/${encodeURIComponent(slug)}`),

    createArea: (data: { name: string; description?: string; icon?: string; type?: string }) =>
        apiClient<Area>('/api/areas', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    joinArea: (slug: string) =>
        apiClient<{ joined: boolean; message?: string }>(`/api/areas/${encodeURIComponent(slug)}/join`, {
            method: 'POST',
        }),

    leaveArea: (slug: string) =>
        apiClient<{ left: boolean; message?: string }>(`/api/areas/${encodeURIComponent(slug)}/leave`, {
            method: 'POST',
        }),

    listAreaPosts: (slug: string, params?: { page?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', String(params.page));
        if (params?.limit) query.set('limit', String(params.limit));
        const suffix = query.toString();
        return apiClient<CommunityFeedResult>(`/api/areas/${encodeURIComponent(slug)}/posts${suffix ? `?${suffix}` : ''}`);
    },
};

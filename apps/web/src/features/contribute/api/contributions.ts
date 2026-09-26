import { apiClient } from '@/lib/api/client';
import type { communityApi as packageCommunityApi, resourcesApi as packageResourcesApi } from '@fresherflow/api-client';
import type {
    CommunityPost,
    InterviewExperience,
    MyContributionsResult,
    MyResourcesResult,
    MySubmissionsResult,
} from '@fresherflow/types';

/**
 * Authed web twin of the contribute surface in `@fresherflow/api-client`
 * (`public/community.ts` + `public/resources.ts`).
 *
 * Same defect class as the job discussion fix: the package axios client is
 * never `configureClient`-ed with web storage, so every authed call here
 * (history + all four submit kinds) went out with no token and 401'd at
 * `requireAuth`. All methods hit the identical endpoint string through
 * `@/lib/api/core`'s fetch client, which injects Bearer, refreshes it on 401
 * and sends `credentials: include` for writes.
 *
 * Payloads are derived from the package signatures (`import type`, so no
 * runtime import and the package stays pure) instead of being re-typed — the
 * contract cannot drift. Export names match the package on purpose: call sites
 * swap one import line and every call stays unchanged.
 */
export const communityApi = {
    listMySubmissions: () => apiClient<MySubmissionsResult>('/api/jobs/submissions/mine'),

    listMyContributions: () => apiClient<MyContributionsResult>('/api/community/mine'),

    createCommunityPost: (data: Parameters<typeof packageCommunityApi.createCommunityPost>[0]) =>
        apiClient<CommunityPost>('/api/community', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    createInterviewExperience: (data: Parameters<typeof packageCommunityApi.createInterviewExperience>[0]) =>
        apiClient<InterviewExperience>('/api/interviews', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitJob: (data: Parameters<typeof packageCommunityApi.submitJob>[0]) =>
        apiClient<{ existing: boolean; slug: string }>('/api/jobs/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

export const resourcesApi = {
    listMine: () => apiClient<MyResourcesResult>('/api/resources/mine'),

    submit: (url: string, opts?: Parameters<typeof packageResourcesApi.submit>[1]) =>
        apiClient<{ resource: { id: string; url: string; title: string } }>('/api/resources', {
            method: 'POST',
            body: JSON.stringify({
                url,
                ...(opts?.title?.trim() ? { title: opts.title.trim() } : {}),
                ...(opts?.description?.trim() ? { description: opts.description.trim() } : {}),
            }),
        }),
};

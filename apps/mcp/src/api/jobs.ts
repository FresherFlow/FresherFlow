import { apiFetch } from '../http/client.js';

/**
 * Live FresherFlow listings (`GET /api/internal/mcp/jobs`).
 *
 * Read-only public data behind an authenticated caller. Membership is decided
 * by the API's `liveOpportunityWhere` rule, so this never returns a listing a
 * visitor cannot open.
 */

/** One live listing, in the compact shape the browse tool returns. */
export type JobSummary = {
    id: string;
    slug: string | null;
    title: string;
    company: string;
    locations: string[];
    employmentTypes: string[];
    workMode: string | null;
    category: string;
    recruitmentMethod: string;
    salaryRange: string | null;
    salaryPeriod: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    postedAt: string | null;
    expiresAt: string | null;
    /** Canonical FresherFlow page for the listing. */
    url: string | null;
};

export type JobsQuery = {
    q?: string;
    city?: string;
    company?: string;
    type?: string;
    page?: number;
    limit?: number;
};

export type JobsResponse = {
    jobs: JobSummary[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
};

/** Browse live FresherFlow listings. */
export async function getJobs(query: JobsQuery = {}): Promise<JobsResponse> {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.city) params.set('city', query.city);
    if (query.company) params.set('company', query.company);
    if (query.type) params.set('type', query.type);
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    return apiFetch<JobsResponse>(`/api/internal/mcp/jobs${suffix}`);
}

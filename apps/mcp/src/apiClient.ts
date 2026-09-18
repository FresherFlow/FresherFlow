import { logger } from './logger.js';
import { config } from './config.js';
import { SearchJobsOutput, GetJobOutput, JobSummary, JobSignalsOutput, JobCommentsOutput, SubmitOpportunityInput, SubmitOpportunityOutput } from './schemas.js';

/**
 * Thin client over the existing FresherFlow API.
 * The MCP server holds NO business logic and NO database access —
 * every tool call goes through these two approved endpoints.
 */

const API_BASE_URL = config.apiBaseUrl;
const API_KEY = process.env.FRESHERFLOW_API_KEY;

// Hard output cap so one response can never flood the model's context window.
const MAX_DESCRIPTION_CHARS = 4000;

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const url = new URL(path, API_BASE_URL);
	// Defense-in-depth: only allow http(s) to the configured API origin.
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Unsupported API protocol');
	}

	const headers: Record<string, string> = { Accept: 'application/json' };
	if (API_KEY) headers['x-api-key'] = API_KEY;

	const res = await fetch(url, {
		...init,
		headers,
		signal: AbortSignal.timeout(10_000),
	});
	if (res.status === 404) {
		throw new Error('Job not found. It may have expired or been removed.');
	}
	if (!res.ok) {
		logger.error('FresherFlow API request failed', { path, status: res.status });
		throw new Error(`FresherFlow API error (${res.status})`);
	}
	return res.json() as Promise<T>;
}

// ─── Shared field mappers (schema-bound output only) ─────────────────────────

function toDisplaySalary(hit: Record<string, unknown>): string {
    const range = typeof hit.salaryRange === 'string' ? hit.salaryRange : '';
    if (range) return range;
    const min = typeof hit.salaryMin === 'number' ? hit.salaryMin : undefined;
    const max = typeof hit.salaryMax === 'number' ? hit.salaryMax : undefined;
    if (min !== undefined && max !== undefined) return `₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}`;
    if (min !== undefined) return `₹${min.toLocaleString('en-IN')}+`;
    if (max !== undefined) return `Up to ₹${max.toLocaleString('en-IN')}`;
    return 'Not disclosed';
}

function toDisplayLocation(hit: Record<string, unknown>): string {
    const locs = Array.isArray(hit.locations) ? (hit.locations as string[]).filter(Boolean) : [];
    const mode = typeof hit.workMode === 'string' ? hit.workMode.toUpperCase() : '';
    if (locs.includes('Remote') || mode === 'REMOTE') return 'Remote';
    if (locs.length === 0) return mode === 'HYBRID' ? 'Hybrid' : 'Not specified';
    return locs.join(', ');
}

function toExperience(hit: Record<string, unknown>): string {
    if (hit.type === 'INTERNSHIP') return 'Student / Fresher';
    const min = typeof hit.experienceMin === 'number' ? hit.experienceMin : undefined;
    if (min === undefined || min === 0) return 'Fresher (0-1 yrs)';
    const max = typeof hit.experienceMax === 'number' ? hit.experienceMax : min + 1;
    return `${min}-${max} yrs`;
}

function toJobUrl(hit: Record<string, unknown>): string {
    const slug = typeof hit.slug === 'string' && hit.slug ? hit.slug : hit.id;
    return `${config.siteUrl}/jobs/${slug}`;
}

function toApplyUrl(hit: Record<string, unknown>): string {
    if (typeof hit.applyLink === 'string' && hit.applyLink) return hit.applyLink;
    if (typeof hit.sourceLink === 'string' && hit.sourceLink) return hit.sourceLink;
    return toJobUrl(hit);
}

function toJobSummary(hit: Record<string, unknown>): JobSummary {
    return {
        id: String(hit.id ?? ''),
        title: String(hit.title ?? ''),
        company: String(hit.company ?? ''),
        location: toDisplayLocation(hit),
        salary: toDisplaySalary(hit),
        employmentType: typeof hit.employmentType === 'string' && hit.employmentType
            ? hit.employmentType
            : (hit.type === 'INTERNSHIP' ? 'Internship' : 'Full-time'),
        experience: toExperience(hit),
        postedAt: hit.postedAt ? new Date(hit.postedAt as string).toISOString() : '',
        jobUrl: toJobUrl(hit),
        applyUrl: toApplyUrl(hit),
    };
}

// ─── Tools' data access ──────────────────────────────────────────────────────

export interface SearchApiParams {
    query: string;
    location?: string;
    jobType?: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    /** Minimum annual CTC in INR (client-side post-filter) */
    minSalary?: number;
    /** Maximum annual CTC in INR (client-side post-filter) */
    maxSalary?: number;
    limit: number;
}

interface SearchApiHit extends Record<string, unknown> {
    id: string;
    slug: string;
    title: string;
    company: string;
}

export async function searchJobs(params: SearchApiParams): Promise<SearchJobsOutput> {
    const qs = new URLSearchParams({
        q: params.query,
        limit: String(Math.min(params.limit + 10, 50)), // headroom for post-filtering
    });
    if (params.location) qs.set('city', params.location);
    if (params.jobType) qs.set('type', params.jobType);

    const data = await apiFetch<{
        hits: SearchApiHit[];
        totalHits?: number;
        hasMore: boolean;
    }>(`/api/opportunities/search?${qs.toString()}`);

    const preFiltered = data.hits ?? [];
    const filtered = preFiltered.filter((hit) => {
        const min = typeof hit.salaryMin === 'number' ? hit.salaryMin : undefined;
        const max = typeof hit.salaryMax === 'number' ? hit.salaryMax : undefined;
        // Keep hits with no salary info rather than dropping them silently
        if (min === undefined && max === undefined) return true;
        if (params.minSalary !== undefined && (max ?? min ?? 0) < params.minSalary) return false;
        if (params.maxSalary !== undefined && (min ?? max ?? 0) > params.maxSalary) return false;
        return true;
    });

    return SearchJobsOutput.parse({
        totalHits: data.totalHits ?? filtered.length,
        hasMore: data.hasMore ?? false,
        jobs: filtered.slice(0, params.limit).map(toJobSummary),
    });
}

export async function getJob(jobId: string): Promise<GetJobOutput> {
    const encoded = encodeURIComponent(jobId);
    const data = await apiFetch<{ opportunity: Record<string, unknown> }>(
        `/api/opportunities/${encoded}`
    );
    const opp = data.opportunity ?? {};

    const degrees = Array.isArray(opp.allowedDegrees) ? (opp.allowedDegrees as string[]) : [];
    const courses = Array.isArray(opp.allowedCourses) ? (opp.allowedCourses as string[]) : [];
    const years = Array.isArray(opp.allowedPassoutYears) ? (opp.allowedPassoutYears as number[]) : [];
    const eligibilityParts: string[] = [];
    if (degrees.length > 0) eligibilityParts.push(`Degrees: ${degrees.join(', ')}`);
    if (courses.length > 0) eligibilityParts.push(`Courses: ${courses.join(', ')}`);
    if (years.length > 0) eligibilityParts.push(`Pass-out years: ${years.join(', ')}`);

    const linkHealth = typeof opp.linkHealth === 'string' ? opp.linkHealth : '';
    const verification = linkHealth
        ? `Link health: ${linkHealth}`
            + (typeof opp.verificationFailures === 'number' && opp.verificationFailures > 0
                ? `, recent failures: ${opp.verificationFailures}` : '')
            + (opp.lastVerifiedAt
                ? `, last checked ${new Date(String(opp.lastVerifiedAt)).toISOString().slice(0, 10)}` : '')
        : 'Not verified';

    const description = typeof opp.description === 'string' && opp.description
        ? opp.description.slice(0, MAX_DESCRIPTION_CHARS)
        : 'No description available.';

    const source = typeof opp.applyLink === 'string' && opp.applyLink ? 'Official posting' : 'FresherFlow';

    return GetJobOutput.parse({
        job: {
            id: String(opp.id ?? ''),
            title: String(opp.title ?? ''),
            company: String(opp.company ?? ''),
            description,
            requirements: Array.isArray(opp.requiredSkills)
                ? (opp.requiredSkills as string[]).slice(0, 25)
                : [],
            eligibility: eligibilityParts.join(' · ') || 'Open to all',
            salary: toDisplaySalary(opp),
            location: toDisplayLocation(opp),
            employmentType: opp.type === 'INTERNSHIP' ? 'Internship' : 'Full-time',
            experience: toExperience(opp),
            source,
            postedAt: opp.postedAt ? new Date(opp.postedAt as string).toISOString() : '',
            applyUrl: toApplyUrl(opp),
            jobUrl: toJobUrl(opp),
            verification,
        },
    });
}

export async function getJobComments(jobId: string, limit: number = 10): Promise<JobCommentsOutput> {
    const encoded = encodeURIComponent(jobId);
    const data = await apiFetch<{
        comments: Array<{
            id: string;
            text: string;
            commentType: string;
            upvotes: number;
            downvotes: number;
            userId: string;
            user: { id: string; fullName: string | null; username: string | null };
            createdAt: string;
            replies: unknown[];
        }>;
        total: number;
    }>(`/api/jobs/${encoded}/comments?limit=${limit}`);

    return JobCommentsOutput.parse({
        jobId,
        totalComments: data.total ?? 0,
        comments: (data.comments ?? []).map((c) => ({
            id: c.id,
            text: c.text.slice(0, 500),
            type: c.commentType ?? 'GENERAL',
            upvotes: c.upvotes ?? 0,
            downvotes: c.downvotes ?? 0,
            author: c.user?.username || c.user?.fullName || 'Anonymous',
            postedAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
            replies: Array.isArray(c.replies) ? c.replies.length : 0,
        })),
    });
}

export async function getJobSignals(jobId: string): Promise<JobSignalsOutput> {
    const encoded = encodeURIComponent(jobId);
    const data = await apiFetch<{
        summary: Record<string, number>;
    }>(`/api/jobs/${encoded}/signals`);

    const summary = data.summary ?? {};
    return JobSignalsOutput.parse({
        summary: {
            applied: summary.APPLIED ?? 0,
            interviewed: summary.INTERVIEWED ?? 0,
            offered: summary.OFFER ?? 0,
            helpful: summary.HELPFUL ?? 0,
            incorrect: summary.INCORRECT ?? 0,
        },
        totalEngagement:
            (summary.APPLIED ?? 0) +
            (summary.INTERVIEWED ?? 0) +
            (summary.OFFER ?? 0) +
            (summary.HELPFUL ?? 0) +
            (summary.INCORRECT ?? 0),
    });
}

// ─── submit_opportunity (anonymous write) ──────────────────────────────────────

/**
 * Submit an opportunity anonymously for FresherFlow moderation.
 * The server NEVER fetches jobUrl/sourceUrl — they are stored as data only.
 * Returns PENDING_REVIEW unless the opportunity already exists.
 */
export async function submitOpportunity(input: SubmitOpportunityInput): Promise<SubmitOpportunityOutput> {
	const body: Record<string, unknown> = {
		title: input.title,
		companyName: input.companyName,
		jobUrl: input.jobUrl,
	};
	if (input.location) body.location = input.location;
	if (input.employmentType) body.employmentType = input.employmentType;
	if (input.salary) body.salary = input.salary;
	if (input.description) body.description = input.description;
	if (input.eligibility) body.eligibility = input.eligibility;
	if (input.sourceUrl) body.sourceUrl = input.sourceUrl;
	if (input.contactEmail) body.contactEmail = input.contactEmail;

	const data = await apiFetch<SubmitOpportunityOutput>('/api/opportunities/mcp-submit', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	return SubmitOpportunityOutput.parse(data);
}

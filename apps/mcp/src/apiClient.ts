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

// Server-side clients cannot rely on browsers' ambient authority, so the API's
// CSRF gate requires an explicit first-party identity header on state-changing
// requests. This is the same value the web/mobile api-client sends; it does not
// weaken CSRF (browsers still cannot set this header cross-origin).
const FIRST_PARTY_CLIENT_HEADER = 'fresherflow-client';

/**
 * Strip filesystem paths and V8 stack frames from an upstream message so
 * server internals can never leak to MCP clients. URLs are left intact.
 */
function scrubErrorText(value: string): string {
	return value
		.replace(/[A-Za-z]:\\[^\s"'<>]*/g, '[path]')
		.replace(/\/[^\s"'<>]*node_modules\/[^\s"'<>]*/g, '[path]')
		.replace(/\n\s*at\s+[^\n]*/g, '')
		.trim();
}

/**
 * Build a safe, useful error message from a non-2xx upstream response.
 * Forwards the upstream message (minus paths/stacks); HTML bodies and
 * unparseable payloads collapse to a generic status message.
 */
async function toSafeApiError(res: Response): Promise<string> {
	const fallback = `FresherFlow API error (${res.status})`;
	try {
		const contentType = res.headers.get('content-type') ?? '';
		const text = await res.text();
		if (!text || contentType.includes('text/html') || /^\s*</.test(text)) return fallback;
		const body = JSON.parse(text) as { error?: { message?: unknown }; message?: unknown };
		const raw = body?.error?.message ?? body?.message;
		if (typeof raw !== 'string' || !raw.trim()) return fallback;
		return scrubErrorText(raw).slice(0, 300) || fallback;
	} catch {
		return fallback;
	}
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const url = new URL(path, API_BASE_URL);
	// Defense-in-depth: only allow http(s) to the configured API origin.
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Unsupported API protocol');
	}

	const headers: Record<string, string> = {
		Accept: 'application/json',
		'X-Requested-From': FIRST_PARTY_CLIENT_HEADER,
	};
	if (API_KEY) headers['x-api-key'] = API_KEY;
	if (init.headers) {
		for (const [key, value] of Object.entries(init.headers as Record<string, string>)) {
			headers[key] = value;
		}
	}

	let res: Response;
	try {
		res = await fetch(url, {
			...init,
			headers,
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		logger.error('FresherFlow API unreachable', { path });
		throw new Error('Cannot reach the FresherFlow API. Please try again shortly.');
	}
	if (res.status === 404) {
		throw new Error('Job not found. It may have expired or been removed.');
	}
	if (!res.ok) {
		logger.error('FresherFlow API request failed', { path, status: res.status });
		throw new Error(await toSafeApiError(res));
	}
	try {
		return (await res.json()) as T;
	} catch {
		logger.error('FresherFlow API returned a non-JSON response', { path });
		throw new Error('Unexpected response from the FresherFlow API. Please try again shortly.');
	}
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
	if (input.category) body.category = input.category;
	if (input.dates) body.dates = input.dates;
	if (input.dateRange) body.dateRange = input.dateRange;
	if (input.timeRange) body.timeRange = input.timeRange;
	if (input.venueAddress) body.venueAddress = input.venueAddress;
	if (input.salary) body.salary = input.salary;
	if (input.description) body.description = input.description;
	if (input.eligibility) body.eligibility = input.eligibility;
	if (input.sourceUrl) body.sourceUrl = input.sourceUrl;
	if (input.contactEmail) body.contactEmail = input.contactEmail;

	// Bulk tiering rides the x-api-key header, never the body: per-call key
	// first (the operator pasting it into chat), server env key second, none
	// third (anonymous 10/hour tier). The key is never logged anywhere here.
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (input.submitKey) headers['x-api-key'] = input.submitKey;

	const data = await apiFetch<SubmitOpportunityOutput>('/api/opportunities/mcp-submit', {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});

	return SubmitOpportunityOutput.parse(data);
}

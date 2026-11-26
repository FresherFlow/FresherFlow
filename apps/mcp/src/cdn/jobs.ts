/**
 * Live listing reads from the public CDN catalog.
 *
 * `feed-index.json` is the searchable snapshot; `jobs/{id}.json` is one listing.
 * Both are public and free, so these functions back the anonymous tools and
 * never touch the authenticated API.
 */

import { fetchCatalogJson, resolveCatalogBase } from './client.js';

export type JobSummary = {
    id: string; slug: string | null; title: string; company: string;
    locations: string[]; employmentTypes: string[]; workMode: string | null;
    category: string; recruitmentMethod: string; salaryRange: string | null;
    salaryPeriod: string | null; experienceMin: number | null; experienceMax: number | null;
    postedAt: string | null; expiresAt: string | null; applyLink: string | null;
    companyLogoUrl: string | null;
    requiredSkills: string[]; allowedDegrees: string[]; url: string | null;
};

/** `newest` matches every other catalog tool; `closing-soon` answers "what should I apply to first?". */
export type JobsSort = 'newest' | 'closing-soon';

export type JobsQuery = {
    q?: string; city?: string; company?: string; type?: string;
    degree?: string; skill?: string; workMode?: string;
    postedWithinDays?: number; closesWithinDays?: number;
    sort?: JobsSort; page?: number; limit?: number;
};
export type JobsResponse = { jobs: JobSummary[]; total: number; page: number; limit: number; hasMore: boolean; nextPage: number | null };

export type FeedOpportunity = Record<string, unknown>;
type FeedSnapshot = { opportunities: FeedOpportunity[] };

const INDEX_TTL_MS = 30_000;
const MAX_JOB_BYTES = 1024 * 1024;

let cache: { key: string; expiresAt: number; snapshot: FeedSnapshot } | undefined;
let pendingIndex: { key: string; promise: Promise<FeedSnapshot> } | undefined;

async function loadIndex(baseUrl: string | undefined): Promise<FeedSnapshot> {
    const base = resolveCatalogBase(baseUrl);
    const key = base.origin;
    if (cache?.key === key && cache.expiresAt > Date.now()) return cache.snapshot;
    if (pendingIndex?.key === key) return pendingIndex.promise;

    const promise = fetchIndex(base);
    pendingIndex = { key, promise };
    try {
        return await promise;
    } finally {
        if (pendingIndex?.promise === promise) pendingIndex = undefined;
    }
}

async function fetchIndex(base: URL): Promise<FeedSnapshot> {
    const data = await fetchCatalogJson('/feeds/feed-index.json', base) as { opportunities?: unknown };
    if (!data || !Array.isArray(data.opportunities)) throw new Error('Public catalog has an invalid format.');
    const snapshot = { opportunities: data.opportunities as FeedOpportunity[] };
    cache = { key: base.origin, expiresAt: Date.now() + INDEX_TTL_MS, snapshot };
    return snapshot;
}

function asText(value: unknown): string { return typeof value === 'string' ? value : ''; }
function asNullableText(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
function asTextList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function asNumber(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

/** Newest first, undated last. Every catalog tool orders alike. */
export function newestFirst(a: FeedOpportunity, b: FeedOpportunity): number {
    const time = (item: FeedOpportunity): number => {
        const parsed = Date.parse(asText(item.postedAt));
        return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
    };
    return time(b) - time(a);
}

/** One catalog row as the listing tools return it. */
export function toJobSummary(item: FeedOpportunity, siteUrl: string): JobSummary {
    const slug = asNullableText(item.slug);
    const kind = asText(item.type).toLowerCase();
    return {
        id: asText(item.id), slug, title: asText(item.title), company: asText(item.company),
        locations: asTextList(item.locations), employmentTypes: asTextList(item.employmentTypes),
        workMode: asNullableText(item.workMode), category: asText(item.category) || asText(item.type),
        recruitmentMethod: asText(item.recruitmentMethod) || (kind.includes('walk') ? 'WALK_IN' : 'REGULAR'),
        salaryRange: asNullableText(item.salaryRange),
        salaryPeriod: asNullableText(item.salaryPeriod), experienceMin: asNumber(item.experienceMin),
        experienceMax: asNumber(item.experienceMax),        postedAt: asNullableText(item.postedAt),
        expiresAt: asNullableText(item.expiresAt),
        // The apply link is the point of a job search. Returning it in the list
        // means "find me jobs and where to apply" is one call, not one per job.
        applyLink: asNullableText(item.applyLink),
        companyLogoUrl: asNullableText(item.companyLogoUrl),
        requiredSkills: asTextList(item.requiredSkills),
        allowedDegrees: asTextList(item.allowedDegrees),
        url: slug ? `${siteUrl}/jobs/${encodeURIComponent(slug)}` : null,
    };
}

export function isLiveOpportunity(item: FeedOpportunity, now: number): boolean {
    if (item.status !== 'PUBLISHED') return false;
    for (const field of ['expiresAt', 'registrationDeadline', 'applicationDeadline', 'endsAt']) {
        const value = asText(item[field]);
        if (!value) continue;
        const deadline = Date.parse(value);
        if (!Number.isFinite(deadline) || deadline <= now) return false;
    }
    return true;
}

export async function getJobs(query: JobsQuery = {}, baseUrl?: string, siteUrl = ''): Promise<JobsResponse> {
    const now = Date.now();
    const all = (await loadIndex(baseUrl)).opportunities.filter((item) => isLiveOpportunity(item, now));
    const q = query.q?.toLowerCase();
    const city = query.city?.toLowerCase();
    const company = query.company?.toLowerCase();
    const degree = query.degree?.toUpperCase();
    const skill = query.skill?.toLowerCase();
    const workMode = query.workMode?.toUpperCase();
    const postedAfter = query.postedWithinDays ? now - query.postedWithinDays * 86_400_000 : null;
    const closesBefore = query.closesWithinDays ? now + query.closesWithinDays * 86_400_000 : null;

    // `get_jobs` promises newest first. The catalog carries no ordering
    // guarantee, so sorting here is what makes the pagination contract true:
    // page 2 must be older than page 1.
    const filtered = all.filter((item) => {
        const title = asText(item.title); const employer = asText(item.company);
        const locations = asTextList(item.locations);
        const types = asTextList(item.employmentTypes);
        const method = asText(item.recruitmentMethod).toLowerCase();
        const kind = asText(item.type).toLowerCase();
        // Government is a sector, not a category: a government submission is
        // stored as EMPLOYMENT with sector GOVERNMENT (and usually a
        // governmentJobDetails block). Matching the category string meant this
        // filter could never return a single listing.
        const isGovernment = asText(item.sector).toUpperCase() === 'GOVERNMENT'
            || (item.governmentJobDetails !== null && item.governmentJobDetails !== undefined);
        const degrees = asTextList(item.allowedDegrees).map((value) => value.toUpperCase());
        const skills = asTextList(item.requiredSkills);
        const posted = Date.parse(asText(item.postedAt));
        const closes = Date.parse(asText(item.expiresAt));
        return (!q || `${title} ${employer}`.toLowerCase().includes(q))
            && (!city || locations.some((value) => value.toLowerCase().includes(city)))
            // Substring, as this tool documents: "Infosys" should find
            // "Infosys Limited", and "infosys bpo" should find "Infosys".
            && (!company || employer.toLowerCase().includes(company))
            && (!query.type || (query.type === 'internship' ? kind.includes('intern') || types.some((value) => value.toLowerCase().includes('intern'))
                : query.type === 'walk-in' ? method.includes('walk') || kind.includes('walk') : isGovernment))
            // A listing with no degree buckets is open to every level; one that
            // names buckets must name the requested one.
            && (!degree || degrees.length === 0 || degrees.includes(degree))
            && (!skill || skills.some((value) => value.toLowerCase().includes(skill)))
            && (!workMode || asText(item.workMode).toUpperCase() === workMode)
            && (postedAfter === null || (Number.isFinite(posted) && posted >= postedAfter))
            && (closesBefore === null || (Number.isFinite(closes) && closes > now && closes <= closesBefore));
    }).sort(query.sort === 'closing-soon'
        // Undated closers last: a listing without an expiry cannot be "soonest".
        ? (a, b) => {
            const deadline = (item: FeedOpportunity): number => {
                const parsed = Date.parse(asText(item.expiresAt));
                return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
            };
            return deadline(a) - deadline(b);
        }
        : newestFirst);

    const page = query.page ?? 1; const limit = query.limit ?? 20;
    const jobs = filtered.slice((page - 1) * limit, page * limit).map((item) => toJobSummary(item, siteUrl));
    const hasMore = page * limit < filtered.length;
    return { jobs, total: filtered.length, page, limit, hasMore, nextPage: hasMore ? page + 1 : null };
}

export type PublicJobDetail = {
    id: string; slug: string | null; title: string; company: string; companyWebsite: string | null;
    companyLogoUrl: string | null;
    description: string; descriptionTruncated: boolean; category: string; sector: string | null;
    employmentTypes: string[]; recruitmentMethod: string | null;
    driveDetails: Record<string, unknown> | null; governmentJobDetails: Record<string, unknown> | null;
    locations: string[]; workMode: string | null;
    experienceMin: number | null; experienceMax: number | null; salaryRange: string | null;
    salaryPeriod: string | null; salaryMin: number | null; salaryMax: number | null; stipend: string | null;
    allowedDegrees: string[]; allowedCourses: string[]; allowedSpecializations: string[];
    allowedPassoutYears: number[]; requiredSkills: string[]; applicationDeadline: string | null;
    registrationDeadline: string | null; postedAt: string | null; expiresAt: string | null;
    applyLink: string | null; url: string | null;
};

/** Look up a live listing by its public id or slug, then read its detail file. */
export async function getJob(identifier: string, baseUrl?: string, siteUrl = ''): Promise<PublicJobDetail | null> {
    const base = resolveCatalogBase(baseUrl);
    const snapshot = await loadIndex(baseUrl);
    const now = Date.now();
    const match = snapshot.opportunities.find((item) => isLiveOpportunity(item, now)
        && (item.id === identifier || item.slug === identifier));
    if (!match) return null;
    const id = asText(match.id);
    if (!id || id.length > 128) throw new Error('The public catalog contains an invalid listing id.');

    const detail = await fetchCatalogJson(`/jobs/${encodeURIComponent(id)}.json`, base, {
        maxBytes: MAX_JOB_BYTES,
        timeoutMs: 6_000,
        optional: true,
    }) as FeedOpportunity | null;
    if (!detail || typeof detail !== 'object' || detail.id !== id || !isLiveOpportunity(detail, Date.now())) return null;

    const description = asText(detail.description);
    const descriptionLimit = 20_000;
    const slug = asNullableText(detail.slug) ?? asNullableText(match.slug);
    return {
        id, slug, title: asText(detail.title), company: asText(detail.company),
        companyWebsite: asNullableText(detail.companyWebsite),
        companyLogoUrl: asNullableText(detail.companyLogoUrl),
        description: description.slice(0, descriptionLimit), descriptionTruncated: description.length > descriptionLimit,
        category: asText(detail.category) || asText(detail.type), sector: asNullableText(detail.sector),
        employmentTypes: asTextList(detail.employmentTypes),
        recruitmentMethod: asNullableText(detail.recruitmentMethod),
        // Walk-in venue/dates and government vacancy details are the whole
        // reason someone opens these listings; the catalog carries them, so
        // the tool must return them instead of a title and a link.
        driveDetails: asRecord(detail.driveDetails),
        governmentJobDetails: asRecord(detail.governmentJobDetails),
        locations: asTextList(detail.locations),
        workMode: asNullableText(detail.workMode), experienceMin: asNumber(detail.experienceMin),
        experienceMax: asNumber(detail.experienceMax), salaryRange: asNullableText(detail.salaryRange),
        salaryPeriod: asNullableText(detail.salaryPeriod), salaryMin: asNumber(detail.salaryMin),
        salaryMax: asNumber(detail.salaryMax), stipend: asNullableText(detail.stipend),
        allowedDegrees: asTextList(detail.allowedDegrees), allowedCourses: asTextList(detail.allowedCourses),
        allowedSpecializations: asTextList(detail.allowedSpecializations),
        allowedPassoutYears: Array.isArray(detail.allowedPassoutYears)
            ? detail.allowedPassoutYears.filter((year): year is number => typeof year === 'number' && Number.isInteger(year)) : [],
        requiredSkills: asTextList(detail.requiredSkills), applicationDeadline: asNullableText(detail.applicationDeadline),
        registrationDeadline: asNullableText(detail.registrationDeadline), postedAt: asNullableText(detail.postedAt),
        expiresAt: asNullableText(detail.expiresAt), applyLink: asNullableText(detail.applyLink),
        url: slug ? `${siteUrl}/jobs/${encodeURIComponent(slug)}` : null,
    };
}

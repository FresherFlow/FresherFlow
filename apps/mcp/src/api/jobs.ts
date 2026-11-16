/** Public job discovery reads the same versioned feed used by the website. */
export type JobSummary = {
    id: string; slug: string | null; title: string; company: string;
    locations: string[]; employmentTypes: string[]; workMode: string | null;
    category: string; recruitmentMethod: string; salaryRange: string | null;
    salaryPeriod: string | null; experienceMin: number | null; experienceMax: number | null;
    postedAt: string | null; expiresAt: string | null; url: string | null;
};
export type JobsQuery = { q?: string; city?: string; company?: string; type?: string; page?: number; limit?: number };
export type JobsResponse = { jobs: JobSummary[]; total: number; page: number; limit: number; hasMore: boolean; nextPage: number | null };

type FeedOpportunity = Record<string, unknown>;
type FeedSnapshot = { version: string; opportunities: FeedOpportunity[] };
const MAX_FEED_BYTES = 12 * 1024 * 1024;
const MAX_JOB_BYTES = 1024 * 1024;
let cache: { key: string; expiresAt: number; snapshot: FeedSnapshot } | undefined;
let pendingFeed: { key: string; promise: Promise<FeedSnapshot> } | undefined;

async function readJson(response: Response, maxBytes = MAX_FEED_BYTES): Promise<unknown> {
    if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
        await response.body?.cancel();
        throw new Error('Public feed returned an unexpected content type.');
    }
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes) {
        await response.body?.cancel();
        throw new Error('Public feed is too large');
    }
    if (!response.body) throw new Error('Public feed is empty');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let bytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > maxBytes) { await reader.cancel(); throw new Error('Public feed response is too large'); }
            chunks.push(decoder.decode(value, { stream: true }));
        }
    } finally { reader.releaseLock(); }
    chunks.push(decoder.decode());
    return JSON.parse(chunks.join('')) as unknown;
}

async function signedUrl(base: string, path: string, version: string, secret?: string): Promise<string> {
    const url = new URL(path, `${base}/`);
    url.searchParams.set('v', version);
    if (secret) {
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${url.pathname}:${version}`));
        url.searchParams.set('sig', [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join(''));
    }
    return url.toString();
}

async function loadFeed(baseUrl: string, secret?: string): Promise<FeedSnapshot> {
    let base: URL;
    try { base = new URL(baseUrl); } catch { throw new Error('Public feed is not configured for this MCP server.'); }
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
        throw new Error('Public feed configuration is invalid.');
    }
    if (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Public feed must use HTTPS.');
    const key = `${base.origin}|${secret ? 'signed' : 'unsigned'}`;
    if (cache?.key === key && cache.expiresAt > Date.now()) return cache.snapshot;
    if (pendingFeed?.key === key) return pendingFeed.promise;
    const promise = fetchFeed(base.origin, secret, key);
    pendingFeed = { key, promise };
    try { return await promise; } finally { if (pendingFeed?.promise === promise) pendingFeed = undefined; }
}

async function fetchFeed(baseUrl: string, secret: string | undefined, key: string): Promise<FeedSnapshot> {
    const base = new URL(baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
        const versionResponse = await fetch(new URL('/meta/feed-version.json', base), { signal: controller.signal, redirect: 'manual' });
        if (!versionResponse.ok) {
            await versionResponse.body?.cancel();
            throw new Error('Public feed version is unavailable.');
        }
        const versionData = await readJson(versionResponse) as { version?: unknown };
        const version = typeof versionData?.version === 'string' ? versionData.version : 'fallback';
        const feedResponse = await fetch(await signedUrl(base.origin, '/feeds/feed-index.json', version, secret), { signal: controller.signal, redirect: 'manual' });
        if (!feedResponse.ok) {
            await feedResponse.body?.cancel();
            throw new Error(`Public feed request failed (${feedResponse.status}).`);
        }
        const data = await readJson(feedResponse) as { opportunities?: unknown };
        if (!data || !Array.isArray(data.opportunities)) throw new Error('Public feed has an invalid format.');
        const snapshot = { version, opportunities: data.opportunities as FeedOpportunity[] };
        cache = { key, expiresAt: Date.now() + 30_000, snapshot };
        return snapshot;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new Error('Public feed request timed out.');
        throw error;
    } finally { clearTimeout(timeout); }
}

function asText(value: unknown): string { return typeof value === 'string' ? value : ''; }
function asNullableText(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
function asTextList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function asNumber(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

export async function getJobs(query: JobsQuery = {}, baseUrl: string, secret?: string, siteUrl = ''): Promise<JobsResponse> {
    const now = Date.now();
    const all = (await loadFeed(baseUrl, secret)).opportunities.filter((item) => isLive(item, now));
    const q = query.q?.toLowerCase();
    const city = query.city?.toLowerCase();
    const company = query.company?.toLowerCase();
    const filtered = all.filter((item) => {
        const title = asText(item.title); const employer = asText(item.company);
        const locations = asTextList(item.locations);
        const types = asTextList(item.employmentTypes);
        const method = asText(item.recruitmentMethod).toLowerCase();
        const category = asText(item.category).toLowerCase();
        const kind = asText(item.type).toLowerCase();
        return (!q || `${title} ${employer}`.toLowerCase().includes(q))
            && (!city || locations.some((value) => value.toLowerCase().includes(city)))
            && (!company || employer.toLowerCase() === company)
            && (!query.type || (query.type === 'internship' ? kind.includes('intern') || types.some((value) => value.toLowerCase().includes('intern'))
                : query.type === 'walk-in' ? method.includes('walk') || kind.includes('walk') : category.includes('government') || kind.includes('government')));
    });
    const page = query.page ?? 1; const limit = query.limit ?? 20;
    const jobs = filtered.slice((page - 1) * limit, page * limit).map((item): JobSummary => {
        const slug = asNullableText(item.slug);
        const kind = asText(item.type).toLowerCase();
        return {
            id: asText(item.id), slug, title: asText(item.title), company: asText(item.company),
            locations: asTextList(item.locations), employmentTypes: asTextList(item.employmentTypes),
            workMode: asNullableText(item.workMode), category: asText(item.category) || asText(item.type),
            recruitmentMethod: asText(item.recruitmentMethod) || (kind.includes('walk') ? 'WALK_IN' : 'REGULAR'), salaryRange: asNullableText(item.salaryRange),
            salaryPeriod: asNullableText(item.salaryPeriod), experienceMin: asNumber(item.experienceMin),
            experienceMax: asNumber(item.experienceMax), postedAt: asNullableText(item.postedAt),
            expiresAt: asNullableText(item.expiresAt), url: slug ? `${siteUrl}/jobs/${encodeURIComponent(slug)}` : null,
        };
    });
    const hasMore = page * limit < filtered.length;
    return { jobs, total: filtered.length, page, limit, hasMore, nextPage: hasMore ? page + 1 : null };
}

export type PublicJobDetail = {
    id: string; slug: string | null; title: string; company: string; companyWebsite: string | null;
    description: string; descriptionTruncated: boolean; category: string; employmentTypes: string[];
    recruitmentMethod: string | null; locations: string[]; workMode: string | null;
    experienceMin: number | null; experienceMax: number | null; salaryRange: string | null;
    salaryPeriod: string | null; salaryMin: number | null; salaryMax: number | null; stipend: string | null;
    allowedDegrees: string[]; allowedCourses: string[]; allowedSpecializations: string[];
    allowedPassoutYears: number[]; requiredSkills: string[]; applicationDeadline: string | null;
    registrationDeadline: string | null; postedAt: string | null; expiresAt: string | null;
    applyLink: string | null; url: string | null;
};

function isLive(item: FeedOpportunity, now: number): boolean {
    if (item.status !== 'PUBLISHED') return false;
    for (const field of ['expiresAt', 'registrationDeadline', 'applicationDeadline', 'endsAt']) {
        const value = asText(item[field]);
        if (!value) continue;
        const deadline = Date.parse(value);
        if (!Number.isFinite(deadline) || deadline <= now) return false;
    }
    return true;
}

/** Look up a live listing by its public id or slug, then read its versioned CDN shard. */
export async function getJob(identifier: string, baseUrl: string, secret?: string, siteUrl = ''): Promise<PublicJobDetail | null> {
    let base: URL;
    try { base = new URL(baseUrl); } catch { throw new Error('Public feed is not configured for this MCP server.'); }
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash
        || (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) {
        throw new Error('Public feed configuration is invalid.');
    }
    const snapshot = await loadFeed(base.origin, secret);
    const now = Date.now();
    const match = snapshot.opportunities.find((item) => isLive(item, now)
        && (item.id === identifier || item.slug === identifier));
    if (!match) return null;
    const id = asText(match.id);
    if (!id || id.length > 128) throw new Error('The public feed contains an invalid listing id.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    try {
        const url = await signedUrl(base.origin, `/jobs/${encodeURIComponent(id)}.json`, snapshot.version, secret);
        const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });
        if (response.status === 404) { await response.body?.cancel(); return null; }
        if (!response.ok) { await response.body?.cancel(); throw new Error(`Job detail request failed (${response.status}).`); }
        const detail = await readJson(response, MAX_JOB_BYTES) as FeedOpportunity;
        if (!detail || typeof detail !== 'object' || detail.id !== id || !isLive(detail, Date.now())) return null;

        const description = asText(detail.description);
        const descriptionLimit = 20_000;
        const slug = asNullableText(detail.slug) ?? asNullableText(match.slug);
        return {
            id, slug, title: asText(detail.title), company: asText(detail.company),
            companyWebsite: asNullableText(detail.companyWebsite),
            description: description.slice(0, descriptionLimit), descriptionTruncated: description.length > descriptionLimit,
            category: asText(detail.category) || asText(detail.type), employmentTypes: asTextList(detail.employmentTypes),
            recruitmentMethod: asNullableText(detail.recruitmentMethod), locations: asTextList(detail.locations),
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
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new Error('Job detail request timed out.');
        throw error;
    } finally { clearTimeout(timeout); }
}

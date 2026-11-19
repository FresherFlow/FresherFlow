/**
 * Resolve the company's careers-board URL from scraped feed fields.
 *
 * `companyWebsite` in the feed is frequently just the ATS apply link of one
 * job, so using it directly on a company page sends visitors to a single
 * posting. Prefer a genuine company-owned domain; otherwise strip the job id
 * from a known ATS deep link to reach the board root. If neither yields a real
 * destination, return null and let the caller hide the button.
 *
 * Pure helper: parse with `new URL()`, compare hostnames by exact match or
 * label suffix, never `includes()` on the whole URL. The caller still runs the
 * result through `toSafeOutboundUrl()` before it reaches an href.
 */

import { detectAtsProvider } from '@/features/jobs/utils/atsProvider';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';

const MAX_URL_LENGTH = 2000;

function parseUrl(raw?: string | null): URL | null {
    if (typeof raw !== 'string' || raw.length > MAX_URL_LENGTH) return null;
    const safe = toSafeOutboundUrl(raw);
    if (!safe) return null;
    try {
        return new URL(safe);
    } catch {
        return null;
    }
}

function isHost(url: URL, host: string): boolean {
    const hostname = url.hostname.toLowerCase();
    return hostname === host || hostname.endsWith(`.${host}`);
}

function pathParts(url: URL): string[] {
    return url.pathname.split('/').filter(Boolean);
}

/** Job aggregators are not company-owned sites, even though they are http(s). */
const AGGREGATOR_HOSTS = [
    'linkedin.com',
    'indeed.com',
    'naukri.com',
    'glassdoor.com',
    'monster.com',
    'monsterindia.com',
    'shine.com',
    'timesjobs.com',
    'foundit.in',
    'wellfound.com',
    'angel.co',
];

function isGenuineCompanySite(url: URL): boolean {
    if (detectAtsProvider(url.toString())) return false;
    const hostname = url.hostname.toLowerCase();
    return !AGGREGATOR_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

/**
 * Drop the single-job portion of a known ATS deep link. Returns null for hosts
 * or path shapes we cannot reduce to a stable board root — the caller then
 * omits the Careers button rather than inventing a URL.
 */
function boardRoot(url: URL): string | null {
    const parts = pathParts(url);

    // Lever, Ashby and Workable: /<company>/<job-id-or-slug>
    if (isHost(url, 'jobs.lever.co') || isHost(url, 'jobs.ashbyhq.com') || isHost(url, 'apply.workable.com')) {
        return parts[0] ? `${url.origin}/${parts[0]}` : null;
    }

    // Greenhouse: /<company>/jobs/<id>. The /embed/ surface is not a board root.
    if (isHost(url, 'boards.greenhouse.io') || isHost(url, 'job-boards.greenhouse.io')) {
        if (!parts[0] || parts[0].toLowerCase() === 'embed') return null;
        return `${url.origin}/${parts[0]}`;
    }

    // Workday: the tenant host is the stable root. Deep links carry
    // /<locale>/<site>/job/<id>; drop that tail, keep the site path.
    if (isHost(url, 'myworkdayjobs.com') || isHost(url, 'myworkdaysite.com')) {
        const jobIndex = parts.findIndex((part) => part.toLowerCase() === 'job');
        const kept = jobIndex > 0 ? parts.slice(0, jobIndex) : [];
        return kept.length > 0 ? `${url.origin}/${kept.join('/')}` : url.origin;
    }

    return null;
}

/**
 * A company-owned careers URL can also be a deep link
 * (careers.example.com/global-en/jobs/<id>/<slug>). Strip from the jobs segment
 * so the button reaches the board, not the one posting.
 */
function companySiteRoot(url: URL): string {
    const parts = pathParts(url);
    const jobIndex = parts.findIndex(
        (part) => part.toLowerCase() === 'jobs' || part.toLowerCase() === 'job',
    );
    if (jobIndex === 0) return url.origin;
    if (jobIndex > 0) return `${url.origin}/${parts.slice(0, jobIndex).join('/')}`;
    return url.toString();
}

/**
 * @returns a sanitised careers URL, or null when no honest destination exists.
 */
export function resolveCompanyCareersUrl(
    companyWebsite?: string | null,
    applyLink?: string | null,
): string | null {
    const website = parseUrl(companyWebsite);
    const apply = parseUrl(applyLink);

    // A genuine company domain wins. Reduce a job deep link to its board root;
    // a plain company/board URL is already the destination.
    if (website && isGenuineCompanySite(website)) {
        return toSafeOutboundUrl(companySiteRoot(website));
    }
    if (apply && isGenuineCompanySite(apply)) {
        return toSafeOutboundUrl(companySiteRoot(apply));
    }

    // Otherwise fall back to a known ATS host and strip the job id from its
    // deep link. Never invent a URL when the shape is unknown.
    for (const parsed of [apply, website]) {
        if (!parsed || !detectAtsProvider(parsed.toString())) continue;
        const root = boardRoot(parsed);
        if (root) return toSafeOutboundUrl(root);
    }

    return null;
}

/**
 * The one home for "which hosts may go live without a human reading them".
 *
 * WHY ONE HOME: the rule used to live inline in the queue's ingestion
 * processor, so every new writer (the promote step, an MCP tool, a script)
 * re-implemented it — and re-implemented it slightly differently, which is how
 * a scraper host ended up on the live board next to a real ATS listing.
 *
 * WHAT: an ATS host is the source of truth for a listing. If the apply link
 * points at the employer's own ATS, the posting is a first-party artefact and
 * publishing it is a factual copy, not a judgement call.
 *
 * The check is a hostname check, never a substring check: `new URL()` then a
 * dot-anchored suffix match, so `evil.com/?x=lever.co` and `lever.co.evil.com`
 * cannot pass.
 */

/**
 * Host suffixes whose postings are first-party ATS artefacts.
 *
 * A listing whose apply link is on one of these hosts may be published
 * automatically. Everything else needs a human.
 */
export const TRUSTED_LISTING_HOST_SUFFIXES: readonly string[] = [
    'lever.co',
    'greenhouse.io',
    'myworkdayjobs.com',
    'jobvite.com',
    'smartrecruiters.com',
    'ashbyhq.com',
];

/**
 * True when the URL is an http(s) URL on a trusted ATS host.
 *
 * @param rawUrl The apply link (or source link) to judge.
 */
export function isTrustedListingUrl(rawUrl: string | null | undefined): boolean {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    if (rawUrl.length > 2000) return false;

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    return TRUSTED_LISTING_HOST_SUFFIXES.some(
        (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
}

/**
 * The hostname of a listing URL, for logs and reports. Returns `null` for
 * anything that is not a parseable http(s) URL.
 */
export function getListingHostname(rawUrl: string | null | undefined): string | null {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.length > 2000) return null;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.hostname.toLowerCase();
    } catch {
        return null;
    }
}

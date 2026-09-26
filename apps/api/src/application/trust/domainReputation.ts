/**
 * Phase 14 - domain reputation.
 *
 * Two jobs: (a) extract a registrable-ish host from a listing URL without
 * trusting substring checks, and (b) score that host into a reputation tier
 * the trust pipeline can use.
 *
 * Hostname checks use `new URL().hostname`, never `includes()` on the full
 * URL: `https://evil.com/?x=greenhouse.io` and `greenhouse.io.evil.com`
 * defeat substring and suffix-without-dot checks respectively.
 */

export type DomainTier = 'official_ats' | 'known_board' | 'unknown' | 'suspicious';

/** Applicant-tracking systems whose hosts are strong official-source signals. */
const OFFICIAL_ATS_SUFFIXES = [
    'greenhouse.io',
    'lever.co',
    'myworkdayjobs.com',
    'ashbyhq.com',
    'smartrecruiters.com',
    'jobvite.com',
    'workable.com',
    'icims.com',
    'taleo.net',
    'successfactors.com',
];

/** Well-known job boards: real listings, but reposted — weaker than ATS. */
const KNOWN_BOARD_SUFFIXES = [
    'linkedin.com',
    'indeed.com',
    'naukri.com',
    'foundit.in',
    'internshala.com',
    'cutshort.io',
    'wellfound.com',
];

/** Hosts that must never raise trust, regardless of path. */
const SUSPICIOUS_SUFFIXES = ['.tk', '.ml', '.ga', '.cf', '.gq'];

const SUSPICIOUS_HOST_EXACT = new Set(['bit.ly', 'tinyurl.com', 'short.link']);

/** Shorteners hide the destination, so the listing cannot be attributed. */
const SHORTENER_SUFFIXES = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'short.link', 'ow.ly'];

function hostnameOf(link: string | null | undefined): string | null {
    if (!link || link.length > 2000) return null;
    try {
        const url = new URL(link.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.hostname.toLowerCase();
    } catch {
        return null;
    }
}

function matchesSuffix(host: string, suffixes: string[]): boolean {
    return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function domainTierForLink(link: string | null | undefined): DomainTier {
    const host = hostnameOf(link);
    if (!host) return 'suspicious';
    if (SUSPICIOUS_HOST_EXACT.has(host)) return 'suspicious';
    if (matchesSuffix(host, SHORTENER_SUFFIXES)) return 'suspicious';
    if (SUSPICIOUS_SUFFIXES.some((suffix) => host.endsWith(suffix))) return 'suspicious';
    if (matchesSuffix(host, OFFICIAL_ATS_SUFFIXES)) return 'official_ats';
    if (matchesSuffix(host, KNOWN_BOARD_SUFFIXES)) return 'known_board';
    return 'unknown';
}

export function hostnameForLog(link: string | null | undefined): string {
    return hostnameOf(link) ?? 'unparseable';
}

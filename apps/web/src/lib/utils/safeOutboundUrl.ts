/**
 * Trust boundary for every third-party URL the feed hands us (applyLink,
 * companyWebsite, sourceLink, ...).
 *
 * Those fields are scraped, so they can carry `javascript:`, `data:` or
 * `vbscript:` schemes. A hostname substring check proves nothing about any of
 * that, so the only real gate is parsing the string with `new URL()` and
 * requiring an http(s) scheme — never `url.includes('domain.com')`.
 *
 * This is the single home for the check; every outbound link goes through it.
 */

/** Matches a leading scheme (`https:`, `javascript:`, `data:` ...). */
const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function toSafeOutboundUrl(raw: string | null | undefined): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Feeds frequently store a scheme-less host ("example.com/careers"). Give
    // it https rather than resolving it against our own origin.
    const candidate = SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(candidate);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (!url.hostname) return null;
        return url.toString();
    } catch {
        return null;
    }
}

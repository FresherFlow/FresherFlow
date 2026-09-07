import { normalizeUrl } from '../utils/url.js';
import { normalizeCompany, normalizeLocation, normalizeTitle } from '@fresherflow/parser';
import { extractAtsJobId } from './detector.js';

export type JobIdentityKind = 'ats' | 'url' | 'fallback';

export interface JobIdentity {
    kind: JobIdentityKind;
    value: string;
}

// Job-level ATS ID parsing lives in detector.ts next to extractAtsBoard
// (single home for ATS URL parsing, also used by native.ts).
// Re-exported here so queue call sites keep one import.
export { extractAtsJobId };

/**
 * Pure helper: per-queue-item job identity for LOGGING ONLY (never for dedup/discard).
 * - kind=ats when extractAtsJobId hits (value `provider:jobId`)
 * - else kind=url with canonical normalizeUrl()
 * - else kind=fallback with the SAME company|title|location identity as plugins'
 *   canonicalKey() (packages/plugins/src/common/canonical-key.ts), reusing the
 *   parser normalizers instead of a parallel implementation.
 */
export function buildJobIdentity(input: {
    applyLink: string;
    company?: string;
    title?: string;
    location?: string;
}): JobIdentity {
    const ats = extractAtsJobId(input.applyLink);
    if (ats) return { kind: 'ats', value: `${ats.provider}:${ats.jobId}` };

    try {
        const u = new URL(input.applyLink);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
            return { kind: 'url', value: normalizeUrl(input.applyLink) };
        }
    } catch {
        // fall through to lexical fallback
    }

    const company = input.company ?? '';
    const title = input.title ?? '';
    const location = input.location ?? '';
    if (!company && !title && !location) {
        return { kind: 'fallback', value: (input.applyLink || '').slice(0, 500) };
    }
    return { kind: 'fallback', value: `${normalizeCompany(company)}|${normalizeTitle(title)}|${normalizeLocation(location)}` };
}

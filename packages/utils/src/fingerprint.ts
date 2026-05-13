import { slugify } from './slugify';

/**
 * Generates a consistent fingerprint for an opportunity to detect duplicates
 * based on semantic content rather than just URL.
 */
export function generateOpportunityFingerprint(data: {
    title: string;
    company: string;
    locations?: string[];
}): string {
    const title = slugify(data.title.toLowerCase());
    const company = slugify(data.company.toLowerCase());

    // Sort and slugify locations for consistency
    const locations = (data.locations || [])
        .map(l => slugify(l.toLowerCase()))
        .sort()
        .join('-');

    return `${company}:${title}:${locations}`;
}

/**
 * Checks if two opportunities are likely duplicates based on their content.
 */
export function isLikelyDuplicate(
    opp1: { title: string; company: string; locations?: string[] },
    opp2: { title: string; company: string; locations?: string[] }
): boolean {
    const fp1 = generateOpportunityFingerprint(opp1);
    const fp2 = generateOpportunityFingerprint(opp2);
    return fp1 === fp2;
}

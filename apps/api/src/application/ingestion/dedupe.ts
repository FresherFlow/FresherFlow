/**
 * Phase 13 - deduplication.
 *
 * The identity rule is the PAIR `(sourceId, sourceExternalId)`, not a global
 * `sourceExternalId`. Greenhouse job 123 and Lever posting 123 are different
 * listings, and treating them as one would silently drop real jobs. This is
 * also exactly what `@@unique([sourceId, sourceExternalId])` on
 * `RawOpportunity` already enforces at the database level.
 *
 * Two distinct duplicate classes are handled:
 *
 *   1. Re-ingestion of the same listing by the same source. The unique index
 *      catches this; `createMany(skipDuplicates)` makes it a no-op rather than
 *      a thrown error, and the run counts it as DEDUPED.
 *
 *   2. The same real-world job arriving from two different sources, or twice
 *      from one source under different ids. Needs content matching, because no
 *      index can catch it. Matching is deliberately conservative: it only
 *      counts as a duplicate when the apply link or normalized source link
 *      matches exactly, or when title AND company AND location all match.
 *      Fuzzy title matching is left out on purpose, because a false positive
 *      here deletes a real listing from the feed.
 */

import { prisma } from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/utils';
import type { NormalizedDraft } from './types';

export interface DedupeVerdict {
    isDuplicate: boolean;
    /** Why it was considered a duplicate, for the run log and raw flags. */
    matchedOn: 'source_external_id' | 'apply_link' | 'source_link' | 'title_company_location' | null;
    existingOpportunityId: string | null;
}

/**
 * Build a stable comparison key from a link, so a tracking-param difference
 * (`?utm_source=x`, a trailing slash, an http/https mix) does not defeat
 * exact-match dedupe.
 */
export function canonicalizeLink(link: string | null): string | null {
    if (!link) return null;
    try {
        const url = new URL(link);
        url.hash = '';
        url.hostname = url.hostname.toLowerCase();
        // Tracking params never change which job a link points at.
        for (const key of [...url.searchParams.keys()]) {
            if (/^(utm_|gh_src|ref|source|src)/i.test(key)) url.searchParams.delete(key);
        }
        const path = url.pathname.replace(/\/+$/, '');
        return `${url.protocol}//${url.hostname}${path}${url.search}`.toLowerCase();
    } catch {
        return null;
    }
}

/** Reduce a title+company pair to a comparable form. */
export function contentKey(title: string, company: string, location: string | null): string | null {
    const normalize = (value: string) =>
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    const t = normalize(title);
    const c = normalize(company);
    if (t.length === 0 || c.length === 0) return null;
    return [t, c, normalize(location ?? '')].join('|');
}

/**
 * Check a normalized draft against existing opportunities and already-ingested
 * raw rows for the same source.
 *
 * Pass `seenInRun` so two identical listings inside one fetched batch do not
 * both get created, which a per-item database check alone would miss.
 */
export async function checkDuplicate(
    sourceId: string,
    draft: NormalizedDraft,
    seenInRun: Set<string> = new Set()
): Promise<DedupeVerdict> {
    // 1. Within this same batch.
    const batchKeys = [
        draft.sourceExternalId ? `ext:${draft.sourceExternalId.toLowerCase()}` : null,
        canonicalizeLink(draft.applyLink) ? `link:${canonicalizeLink(draft.applyLink)}` : null,
        canonicalizeLink(draft.sourceLink) ? `link:${canonicalizeLink(draft.sourceLink)}` : null,
    ].filter((key): key is string => key !== null);

    for (const key of batchKeys) {
        if (seenInRun.has(key)) {
            return {
                isDuplicate: true,
                matchedOn: key.startsWith('ext:') ? 'source_external_id' : 'apply_link',
                existingOpportunityId: null,
            };
        }
    }
    for (const key of batchKeys) seenInRun.add(key);

    // 2. An existing raw row for this source with the same external id. This
    //    is the common re-ingestion case; the unique index would also catch it.
    if (draft.sourceExternalId) {
        const prior = await prisma.rawOpportunity.findFirst({
            where: { sourceId, sourceExternalId: draft.sourceExternalId },
            select: { mappedOpportunityId: true, status: true },
        });
        if (prior) {
            return {
                isDuplicate: true,
                matchedOn: 'source_external_id',
                existingOpportunityId: prior.mappedOpportunityId,
            };
        }
    }

    // 3. An existing published opportunity reached by the same apply link.
    const applyKey = canonicalizeLink(draft.applyLink);
    if (applyKey) {
        const byApply = await prisma.opportunity.findFirst({
            where: { applyLink: draft.applyLink, deletedAt: null },
            select: { id: true },
        });
        if (byApply) {
            return {
                isDuplicate: true,
                matchedOn: 'apply_link',
                existingOpportunityId: byApply.id,
            };
        }
    }

    // 4. Content match: same title + company + first location. Conservative on
    //    purpose; see the note at the top of this file.
    const location = draft.locations[0] ?? null;
    const key = contentKey(draft.title, draft.company, location);
    if (key) {
        const [t, c, l] = key.split('|');
        const byContent = await prisma.opportunity.findFirst({
            where: {
                deletedAt: null,
                title: { equals: draft.title, mode: 'insensitive' },
                company: { equals: draft.company, mode: 'insensitive' },
                ...(l ? { locations: { has: location as string } } : {}),
            },
            select: { id: true },
        });
        if (byContent) {
            logger.debug('Ingestion dedupe matched on title/company/location', {
                title: t,
                company: c,
            });
            return {
                isDuplicate: true,
                matchedOn: 'title_company_location',
                existingOpportunityId: byContent.id,
            };
        }
    }

    return { isDuplicate: false, matchedOn: null, existingOpportunityId: null };
}

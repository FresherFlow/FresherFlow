/**
 * Phase 13 - raw payload retry.
 *
 * A REJECTED or ERROR raw row carries the untouched upstream document in
 * `rawPayload`, so a mapping fix can be re-derived without re-fetching the
 * source. This is the recovery path for "the connector was fixed, now replay
 * the failures".
 *
 * No network here by design: the payload is already stored. The row is
 * re-normalized, re-deduped, and either becomes a DRAFT or is re-marked with
 * an updated verdict. Transactions stay short and per-item; no batch
 * transaction, so one bad row cannot roll back the rest.
 */

import prisma from '../../infrastructure/database/prisma';
import { normalizeRawItem } from './normalize';
import { checkDuplicate } from './dedupe';
import { mapCategoryFromText } from './categoryMap';
import { logger, generateSlug } from '@fresherflow/utils';
import { OpportunityCategory } from '@fresherflow/database';
import type { RawItem } from './types';

export type RetryOutcome = 'DRAFT_CREATED' | 'DEDUPED' | 'REJECTED' | 'NOT_RETRYABLE';

const RETRYABLE = new Set(['REJECTED', 'ERROR', 'FETCHED']);

/** Rebuild a RawItem from a stored rawPayload envelope. */
function toRawItem(payload: unknown, fallback: { title: string | null; company: string | null; sourceLink: string | null; applyLink: string | null }): RawItem {
    const record = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>;
    const str = (value: unknown): string | null =>
        typeof value === 'string' && value.trim().length > 0 ? value : null;
    const list = (value: unknown): string[] =>
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
    const numList = (value: unknown): number[] =>
        Array.isArray(value)
            ? value.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry))
            : [];

    return {
        sourceExternalId: str(record.sourceExternalId) ?? str((record.raw as Record<string, unknown> | undefined)?.id),
        title: str(record.title) ?? fallback.title ?? '',
        company: str(record.company) ?? fallback.company ?? '',
        sourceLink: str(record.sourceLink) ?? fallback.sourceLink,
        applyLink: str(record.applyLink) ?? fallback.applyLink,
        description: str(record.description),
        locations: list(record.locations),
        requiredSkills: list(record.requiredSkills),
        allowedDegrees: list(record.allowedDegrees),
        allowedCourses: list(record.allowedCourses),
        allowedSpecializations: list(record.allowedSpecializations),
        allowedPassoutYears: numList(record.allowedPassoutYears),
        raw: record,
        reasonFlags: [],
    };
}

export async function retryRawItem(rawId: string): Promise<{ outcome: RetryOutcome; mappedOpportunityId: string | null }> {
    const raw = await prisma.rawOpportunity.findUnique({
        where: { id: rawId },
        include: { source: { select: { id: true, name: true, endpoint: true, defaultCategory: true } } },
    });
    if (!raw) throw new Error('Raw item not found');
    if (!RETRYABLE.has(raw.status)) {
        return { outcome: 'NOT_RETRYABLE', mappedOpportunityId: raw.mappedOpportunityId };
    }

    const item = toRawItem(raw.rawPayload, {
        title: raw.title,
        company: raw.company,
        sourceLink: raw.sourceLink,
        applyLink: raw.applyLink,
    });

    // ATS boards omit the employer per listing; fall back to the source name
    // so a fixed connector can replay previously rejected rows.
    const fallbackCompany =
        item.company.trim().length > 0 ? undefined : raw.source?.name?.trim() || undefined;

    const normalized = normalizeRawItem(item, {
        defaultCategory: (raw.source?.defaultCategory as OpportunityCategory | undefined) ?? OpportunityCategory.EMPLOYMENT,
        fallbackSourceLink: raw.source?.endpoint ?? undefined,
        fallbackCompany,
    });

    if (!normalized.ok || !normalized.draft) {
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: { status: 'REJECTED', reasonFlags: normalized.reasonFlags, errorMessage: null },
        });
        return { outcome: 'REJECTED', mappedOpportunityId: null };
    }

    // A feed that omitted its category on first pass gets a second chance
    // from the keyword mapper before the draft is written.
    if (normalized.draft.category === OpportunityCategory.EMPLOYMENT) {
        const inferred = mapCategoryFromText(normalized.draft.title, normalized.draft.description);
        if (inferred) normalized.draft.category = inferred;
    }

    const verdict = await checkDuplicate(raw.sourceId, normalized.draft, new Set());
    if (verdict.isDuplicate) {
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: {
                status: 'DEDUPED',
                mappedOpportunityId: verdict.existingOpportunityId,
                reasonFlags: [...normalized.reasonFlags, `duplicate:${verdict.matchedOn}`],
                errorMessage: null,
            },
        });
        return { outcome: 'DEDUPED', mappedOpportunityId: verdict.existingOpportunityId };
    }

    try {
        const id = crypto.randomUUID();
        const slug = generateSlug(normalized.draft.title, normalized.draft.company, id);
        const opportunity = await prisma.opportunity.create({
            data: {
                id,
                slug,
                title: normalized.draft.title,
                company: normalized.draft.company,
                description: normalized.draft.description,
                sourceLink: normalized.draft.sourceLink,
                applyLink: normalized.draft.applyLink,
                locations: normalized.draft.locations,
                category: normalized.draft.category,
                status: 'DRAFT',
                sourceKind: 'SCRAPED',
            },
            select: { id: true },
        });
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: { status: 'DRAFT_CREATED', mappedOpportunityId: opportunity.id, reasonFlags: normalized.reasonFlags, errorMessage: null },
        });
        return { outcome: 'DRAFT_CREATED', mappedOpportunityId: opportunity.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Raw retry create failed', { rawId });
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: { status: 'ERROR', errorMessage: message.slice(0, 500) },
        });
        return { outcome: 'REJECTED', mappedOpportunityId: null };
    }
}

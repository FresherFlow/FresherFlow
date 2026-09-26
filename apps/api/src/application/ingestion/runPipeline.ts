/**
 * Phase 13 - ingestion run orchestration.
 *
 * One source, one run, isolated per item:
 *
 *   1. Open an IngestionRun (RUNNING).
 *   2. Connector fetches the whole board.
 *   3. Each item is stored as a RawOpportunity carrying the untouched payload,
 *      so a bad mapping can be re-derived later without re-fetching.
 *   4. Each item is normalized, deduped, and turned into a DRAFT Opportunity.
 *   5. Counters on the run are derived from the per-item verdicts.
 *
 * Two invariants worth stating explicitly:
 *   - Ingestion only ever creates DRAFT. Publishing stays an explicit admin
 *     action, so a connector bug cannot put unreviewed content on the public
 *     feed.
 *   - One bad listing must not fail the run. A per-item error is recorded
 *     against that item and the run finishes PARTIAL, because dropping 400 good
 *     listings because one was malformed is not an acceptable trade.
 */

import prisma from '../../infrastructure/database/prisma';
import { Prisma } from '@fresherflow/database';
import { logger, generateSlug } from '@fresherflow/utils';
import { getConnector } from './connectors';
import { normalizeRawItem } from './normalize';
import { checkDuplicate } from './dedupe';
import type { IngestionSourceType, OpportunityCategory } from '@fresherflow/database';
import type { ItemOutcome, RawItem, RunSummary } from './types';

export interface RunSource {
    id: string;
    /** Source display name; used as the company fallback for single-employer ATS boards. */
    name?: string;
    sourceType: IngestionSourceType;
    endpoint: string;
    defaultCategory: OpportunityCategory;
}

export interface RunOptions {
    /** Injected for tests; defaults to global fetch. */
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    signal?: AbortSignal;
    /** Cap per run so a hostile or broken source cannot flood the database. */
    maxItems?: number;
}

const DEFAULT_MAX_ITEMS = 2000;
const DEFAULT_TIMEOUT_MS = 20_000;
/** Store at most this much of a raw payload; it is for re-derivation, not replay. */
const MAX_RAW_PAYLOAD_CHARS = 100_000;

export async function runIngestion(
    source: RunSource,
    options: RunOptions = {}
): Promise<RunSummary> {
    const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const signal = options.signal ?? new AbortController().signal;

    const run = await prisma.ingestionRun.create({
        data: { sourceId: source.id, status: 'RUNNING' },
        select: { id: true },
    });

    const counts: Record<ItemOutcome, number> = {
        DRAFT_CREATED: 0,
        DEDUPED: 0,
        REJECTED: 0,
        ERROR: 0,
    };
    const errors: string[] = [];
    let fetched = 0;

    try {
        const connector = getConnector(source.sourceType);
        const items = await connector.fetchItems({
            sourceId: source.id,
            sourceType: source.sourceType,
            endpoint: source.endpoint,
            defaultCategory: source.defaultCategory,
            fetchImpl,
            signal,
            timeoutMs,
        });

        // Guard before any DB write, so a 500k-item response costs one array.
        const batch = items.slice(0, maxItems);
        fetched = batch.length;
        if (items.length > maxItems) {
            errors.push(`Truncated to ${maxItems} items (source returned ${items.length})`);
        }

        // Shared across the batch so two identical listings in one response
        // produce one draft and one DEDUPED, rather than racing on the index.
        const seenInRun = new Set<string>();

        for (const item of batch) {
            try {
                const outcome = await processItem(source, run.id, item, seenInRun);
                counts[outcome] += 1;
            } catch (error) {
                counts.ERROR += 1;
                const message = error instanceof Error ? error.message : String(error);
                // Log the detail, keep the run message generic and short.
                logger.error('Ingestion item failed', {
                    sourceId: source.id,
                    runId: run.id,
                    externalId: item.sourceExternalId,
                    error: message,
                });
                errors.push(message);
                await markItemError(source.id, run.id, item, message).catch(() => undefined);
            }
        }

        const status = determineStatus(counts, errors);
        const errorSummary = summarizeErrors(errors);

        const summary = await prisma.ingestionRun.update({
            where: { id: run.id },
            data: {
                status,
                endedAt: new Date(),
                fetchedCount: fetched,
                draftCreatedCount: counts.DRAFT_CREATED,
                dedupedCount: counts.DEDUPED,
                rejectedCount: counts.REJECTED,
                errorCount: counts.ERROR,
                errorSummary,
            },
            select: {
                id: true, status: true, fetchedCount: true, draftCreatedCount: true,
                dedupedCount: true, rejectedCount: true, errorCount: true, errorSummary: true,
            },
        });

        // Source health is derived from the run so the admin list does not
        // need a join to decide whether a source is stale.
        await prisma.ingestionSource.update({
            where: { id: source.id },
            data: {
                lastRunAt: new Date(),
                ...(status === 'SUCCESS' || status === 'PARTIAL'
                    ? { lastSuccessAt: new Date() }
                    : {}),
            },
        });

        return {
            runId: summary.id,
            status: summary.status,
            fetchedCount: summary.fetchedCount,
            draftCreatedCount: summary.draftCreatedCount,
            dedupedCount: summary.dedupedCount,
            rejectedCount: summary.rejectedCount,
            errorCount: summary.errorCount,
            errorSummary: summary.errorSummary,
        };
    } catch (error) {
        // Fetch itself failed: the run is FAILED with zero items, and the source
        // lastRunAt/lastSuccessAt are left alone so health stays truthful.
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Ingestion run failed', { sourceId: source.id, runId: run.id, error: message });

        await prisma.ingestionRun.update({
            where: { id: run.id },
            data: {
                status: 'FAILED',
                endedAt: new Date(),
                fetchedCount: fetched,
                errorCount: 1,
                errorSummary: truncate(message, 500),
            },
        });

        return {
            runId: run.id,
            status: 'FAILED',
            fetchedCount: fetched,
            draftCreatedCount: 0,
            dedupedCount: 0,
            rejectedCount: 0,
            errorCount: 1,
            errorSummary: truncate(message, 500),
        };
    }
}

async function processItem(
    source: RunSource,
    runId: string,
    item: RawItem,
    seenInRun: Set<string>
): Promise<ItemOutcome> {
    const raw = await storeRaw(source.id, runId, item);

    const normalized = normalizeRawItem(item, {
        defaultCategory: source.defaultCategory,
        fallbackSourceLink: source.endpoint,
        fallbackCompany: source.name,
    });

    if (!normalized.ok || !normalized.draft) {
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: { status: 'REJECTED', reasonFlags: normalized.reasonFlags },
        });
        return 'REJECTED';
    }

    const verdict = await checkDuplicate(source.id, normalized.draft, seenInRun);
    if (verdict.isDuplicate) {
        await prisma.rawOpportunity.update({
            where: { id: raw.id },
            data: {
                status: 'DEDUPED',
                mappedOpportunityId: verdict.existingOpportunityId,
                reasonFlags: [...normalized.reasonFlags, `duplicate:${verdict.matchedOn}`],
            },
        });
        return 'DEDUPED';
    }

    const opportunity = await createDraftOpportunity(normalized.draft, raw.id);
    await prisma.rawOpportunity.update({
        where: { id: raw.id },
        data: { status: 'DRAFT_CREATED', mappedOpportunityId: opportunity.id },
    });
    return 'DRAFT_CREATED';
}

/**
 * Persist the untouched payload before any interpretation.
 *
 * Written first so that a mapping bug is recoverable: the row can be
 * re-normalized from `rawPayload` without hitting the source again.
 */
async function storeRaw(sourceId: string, runId: string, item: RawItem) {
    const rawPayload = JSON.parse(truncate(JSON.stringify(item.raw ?? {}), MAX_RAW_PAYLOAD_CHARS));
    return prisma.rawOpportunity.create({
        data: {
            sourceId,
            ingestionRunId: runId,
            sourceExternalId: item.sourceExternalId,
            title: item.title?.slice(0, 200) ?? null,
            company: item.company?.slice(0, 120) ?? null,
            sourceLink: item.sourceLink,
            applyLink: item.applyLink,
            reasonFlags: item.reasonFlags ?? [],
            rawPayload: rawPayload as Prisma.InputJsonValue,
        },
        select: { id: true },
    });
}

async function markItemError(
    sourceId: string,
    runId: string,
    item: RawItem,
    message: string
) {
    await prisma.rawOpportunity.updateMany({
        where: { sourceId, ingestionRunId: runId, sourceExternalId: item.sourceExternalId },
        data: { status: 'ERROR', errorMessage: truncate(message, 500) },
    });
}

async function createDraftOpportunity(draft: NonNullable<ReturnType<typeof normalizeRawItem>['draft']>, rawId: string) {
    const id = crypto.randomUUID();
    const slug = generateSlug(draft.title, draft.company, id);

    return prisma.opportunity.create({
        data: {
            id,
            slug,
            title: draft.title,
            company: draft.company || slug,
            description: draft.description,
            sourceLink: draft.sourceLink,
            applyLink: draft.applyLink,
            locations: draft.locations,
            category: draft.category,
            employmentTypes: draft.employmentTypes as Prisma.InputJsonValue ?? [],
            workMode: draft.workMode as Prisma.InputJsonValue,
            experienceLevel: draft.experienceLevel as Prisma.InputJsonValue,
            sector: draft.sector as Prisma.InputJsonValue,
            salaryMin: draft.salaryMin,
            salaryMax: draft.salaryMax,
            salaryPeriod: draft.salaryPeriod as Prisma.InputJsonValue,
            requiredSkills: draft.requiredSkills,
            allowedDegrees: draft.allowedDegrees as Prisma.InputJsonValue,
            allowedCourses: draft.allowedCourses,
            allowedSpecializations: draft.allowedSpecializations,
            allowedPassoutYears: draft.allowedPassoutYears,
            expiresAt: draft.closesAt,
            sourceKind: 'SCRAPED',
            // DRAFT, never PUBLISHED: publication is an explicit admin action.
            status: 'DRAFT',
            // Link the source back so a moderator can trace the listing.
            rawIngestions: { connect: { id: rawId } },
        } as Prisma.OpportunityUncheckedCreateInput,
        select: { id: true, slug: true },
    });
}

/** FAILED is reserved for "the source could not be read at all". */
function determineStatus(
    counts: Record<ItemOutcome, number>,
    errors: string[]
): 'SUCCESS' | 'PARTIAL' | 'FAILED' {
    if (counts.ERROR === 0 && errors.length === 0) return 'SUCCESS';
    if (counts.DRAFT_CREATED === 0 && counts.DEDUPED === 0 && counts.REJECTED === 0) {
        return 'FAILED';
    }
    return 'PARTIAL';
}

/** De-duplicate messages and cap the stored summary length. */
function summarizeErrors(errors: string[]): string | null {
    if (errors.length === 0) return null;
    const unique = [...new Set(errors)];
    return truncate(unique.slice(0, 5).join(' | '), 500);
}

function truncate(value: string, max: number): string {
    return value.length <= max ? value : `${value.slice(0, max - 1)}\u2026`;
}


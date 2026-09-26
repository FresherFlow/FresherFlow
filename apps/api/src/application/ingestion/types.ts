/**
 * Phase 13 - shared contracts for the ingestion pipeline.
 *
 * The pipeline is deliberately split so each stage is independently testable
 * and independently retryable:
 *
 *   source -> run -> raw payload -> normalize -> dedupe -> Opportunity(DRAFT)
 *
 * `RawItem` is the boundary type. A connector's only job is to turn a remote
 * document into a `RawItem`; it must not decide whether the listing is
 * publishable, because that judgement needs cross-run context (dedupe) that a
 * single HTTP response does not have.
 */

import type {
    IngestionSourceType,
    OpportunityCategory,
} from '@fresherflow/database';

/** A single listing as fetched from a source, before normalization. */
export interface RawItem {
    /**
     * Identity within the source. This is the pair component that makes
     * `@@unique([sourceId, sourceExternalId])` correct: Greenhouse job 123 and
     * Lever posting 123 are different listings.
     *
     * May be null when a source exposes no stable id; dedupe then falls back to
     * URL identity rather than treating every such item as a duplicate.
     */
    sourceExternalId: string | null;

    title: string;
    company: string;

    /** Original listing page. */
    sourceLink: string | null;
    /** Where a candidate applies, when it differs from the listing page. */
    applyLink: string | null;

    description: string | null;
    locations: string[];

    category?: OpportunityCategory;
    employmentTypes?: string[];
    workMode?: string | null;
    experienceLevel?: string | null;
    sector?: string | null;

    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryPeriod?: string | null;

    requiredSkills: string[];
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    allowedPassoutYears: number[];

    /** ISO timestamp when the upstream listing closes, if known. */
    closesAt?: string | null;
    publishedAt?: string | null;

    /** Untouched upstream document, stored on the RawOpportunity row. */
    raw: Record<string, unknown>;

    /**
     * Why this item is suspicious (e.g. `missing_title`, `dead_link`).
     * Persisted to `RawOpportunity.reasonFlags` so a moderator can triage.
     */
    reasonFlags?: string[];
}

/** Everything a connector needs, with no database access. */
export interface ConnectorContext {
    sourceId: string;
    sourceType: IngestionSourceType;
    endpoint: string;
    defaultCategory: OpportunityCategory;
    /** Injected so tests never touch the network. */
    fetchImpl: typeof fetch;
    /** Aborts the run when the source takes too long. */
    signal: AbortSignal;
    timeoutMs: number;
}

export interface Connector {
    sourceType: IngestionSourceType;
    /**
     * Fetch and parse one source. Must throw a readable `Error` on failure so
     * the run can record an actionable `errorSummary`; returning `[]` means
     * "fetched successfully, nothing to do".
     */
    fetchItems(ctx: ConnectorContext): Promise<RawItem[]>;
}

/** Outcome of normalizing one raw item, including why it was rejected. */
export interface NormalizationResult {
    ok: boolean;
    reasonFlags: string[];
    draft: NormalizedDraft | null;
}

/** A normalized listing, ready to be deduped and turned into a draft. */
export interface NormalizedDraft {
    sourceExternalId: string | null;
    title: string;
    company: string;
    description: string;
    sourceLink: string | null;
    applyLink: string | null;
    locations: string[];
    category: OpportunityCategory;
    employmentTypes: string[];
    workMode: string | null;
    experienceLevel: string | null;
    sector: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryPeriod: string | null;
    requiredSkills: string[];
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    allowedPassoutYears: number[];
    closesAt: Date | null;
    reasonFlags: string[];
}

/** Per-item verdict, so counters in `IngestionRun` are derived, not guessed. */
export type ItemOutcome = 'DRAFT_CREATED' | 'DEDUPED' | 'REJECTED' | 'ERROR';

export interface RunSummary {
    runId: string;
    /** Full enum, because the value comes back from the DB read-back. */
    status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
    fetchedCount: number;
    draftCreatedCount: number;
    dedupedCount: number;
    rejectedCount: number;
    errorCount: number;
    errorSummary: string | null;
}


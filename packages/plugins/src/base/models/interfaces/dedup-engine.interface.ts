import { JobPostDto } from '../dtos/job-post.dto';
import { CanonicalJob } from './canonical-job.interface';

/**
 * Dedup-engine plugin contract (Spec 003 / FR-1).
 *
 * Implementations are registered as NestJS providers under
 * {@link DEDUP_ENGINE_TOKEN}. A consumer calls `dedup(rawJobs)` and receives
 * one `CanonicalJob` per logical posting plus a per-input mapping so callers
 * can answer "which canonical record did this raw job land in?" without a
 * second pass.
 */
export interface IDedupEngine {
  /**
   * Collapse N raw jobs into M canonical records (M ≤ N).
   *
   * Implementations MUST:
   *   - be deterministic for the same input list
   *   - never throw on a single bad input — log and skip with `errors[]`
   *   - finish within the budgets defined by NFR-1 / NFR-2
   */
  dedup(jobs: ReadonlyArray<JobPostDto>): Promise<DedupResult>;
}

/**
 * Result envelope returned by `IDedupEngine.dedup`.
 */
export interface DedupResult {
  /** Canonical records, one per logical job. Order is implementation-defined. */
  readonly canonical: ReadonlyArray<CanonicalJob>;
  /**
   * Map of input index → canonicalJobId. Length === input.length.
   * `null` means the entry was rejected (see `errors`).
   */
  readonly assignments: ReadonlyArray<string | null>;
  /** Per-input rejections, keyed by input index. */
  readonly errors: ReadonlyArray<DedupInputError>;
  /** Lightweight metrics for observability (FR-8). */
  readonly metrics: DedupMetrics;
}

export interface DedupInputError {
  readonly inputIndex: number;
  readonly code: 'ERR_DEDUP_INVALID_INPUT' | 'ERR_DEDUP_RESOLVER_TIMEOUT';
  readonly message: string;
}

export interface DedupMetrics {
  readonly inputCount: number;
  readonly outputCount: number;
  readonly mergedPairs: number;
  readonly elapsedMs: number;
}

/** DI token used to register the active dedup-engine plugin. */
export const DEDUP_ENGINE_TOKEN = 'DEDUP_ENGINE';

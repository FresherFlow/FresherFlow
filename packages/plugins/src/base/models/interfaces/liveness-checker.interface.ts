/**
 * Liveness-checker plugin contract (Spec 721 / FR-15).
 *
 * Implementations are registered as NestJS providers under
 * {@link LIVENESS_CHECKER_TOKEN}. A consumer calls `check(url)` (or
 * `checkBatch(urls)`) and receives a {@link LivenessVerdict} per URL so the
 * pipeline can drop dead postings (`expired`), keep live ones (`active`),
 * and schedule a re-check for everything the checker could not decide
 * (`uncertain`) — without a headless-browser dependency.
 */

/** DI token used to register the active liveness-checker plugin. */
export const LIVENESS_CHECKER_TOKEN = 'LIVENESS_CHECKER';

/**
 * Tri-state outcome of a liveness probe.
 *
 * `uncertain` is deliberately distinct from `expired`: anti-bot walls,
 * transport failures and listing redirects must never cause a destructive
 * eviction (Spec 721 / NFR-5).
 */
export type LivenessResult = 'active' | 'expired' | 'uncertain';

/**
 * Machine-readable reason behind a {@link LivenessResult}. See
 * Spec 721 § 7.2 for the full code → result mapping.
 */
export type LivenessCode =
  | 'http_gone'
  | 'http_error'
  | 'access_blocked'
  | 'bot_challenge'
  | 'expired_text'
  | 'expired_url'
  | 'apply_control_visible'
  | 'insufficient_content'
  | 'listing_page'
  | 'no_apply_control'
  | 'fetch_failed';

/** Per-URL probe outcome. */
export interface LivenessVerdict {
  /** The URL as it was passed to the checker (pre-redirect). */
  url: string;
  /** Tri-state classification. */
  result: LivenessResult;
  /** Reason code backing `result`. */
  code: LivenessCode;
  /** HTTP status of the response, when one was received at all. */
  httpStatus?: number;
  /** Probe completion time, ISO-8601. */
  checkedAt: string;
}

/** Options for a single {@link ILivenessChecker.check} probe. */
export interface LivenessCheckOptions {
  /** Per-request timeout in milliseconds (default 15000). */
  timeoutMs?: number;
  /**
   * Minimum plain-text length (chars) below which a 2xx page is treated
   * as a tombstone (`expired`/`insufficient_content`). Default 300.
   */
  minContentLength?: number;
  /** Optional proxy pool, rotated by the underlying HTTP client. */
  proxies?: string[];
}

/** Options for {@link ILivenessChecker.checkBatch}. */
export interface LivenessBatchOptions extends LivenessCheckOptions {
  /** Maximum in-flight probes (default 5). */
  concurrency?: number;
  /**
   * Base politeness delay between request starts within a worker. The
   * actual delay is jittered uniformly in `[throttleMs, 2 * throttleMs]`.
   */
  throttleMs?: number;
}

/**
 * Liveness-checker plugin contract.
 *
 * Implementations MUST:
 *   - never throw — transport failures become `uncertain`/`fetch_failed`
 *   - never classify HTTP 403/503 as `expired` (anti-bot masquerade)
 *   - preserve input order in `checkBatch` results
 *   - isolate per-URL failures so one bad URL never rejects a batch
 */
export interface ILivenessChecker {
  /** Probe a single posting URL. */
  check(url: string, options?: LivenessCheckOptions): Promise<LivenessVerdict>;
  /** Probe many URLs with bounded concurrency; results align to input order. */
  checkBatch(urls: string[], options?: LivenessBatchOptions): Promise<LivenessVerdict[]>;
}

/**
 * Query envelope passed to {@link IJobStore.listByQuery} (Spec 004 / FR-7).
 *
 * Every field is optional. Backends MUST treat omitted fields as "no filter
 * on this dimension"; an empty `JobStoreQuery` therefore returns the whole
 * collection (subject to `limit` / pagination).
 *
 * Pagination is **opaque cursor**, not page-index. Backends SHOULD encode
 * just enough state in `cursor` to resume from the same logical row even if
 * the underlying offset shifts (e.g. base64-encoded primary-key tuple).
 * Malformed cursors MUST raise `ERR_STORE_INVALID_CURSOR`.
 */
export interface JobStoreQuery {
  /**
   * Case-insensitive substring match on `canonical_job.company`. Backends
   * MAY normalise to a case-folded shadow column to keep this within
   * NFR-1 budgets.
   */
  readonly company?: string;
  /** Case-insensitive substring match on `canonical_job.title`. */
  readonly title?: string;
  /** Case-insensitive substring match on `canonical_job.location`. */
  readonly location?: string;
  /**
   * Lower bound on `canonical_job.merged_at` (inclusive). Lets callers do
   * incremental re-scrape — "give me everything since my last sync".
   */
  readonly since?: Date;
  /**
   * Opaque resume token returned as `nextCursor` from a prior call. Backends
   * MUST validate the cursor's shape before parsing — never `eval` user input.
   */
  readonly cursor?: string;
  /**
   * Max items in the page. Backends MUST clamp to {@link JOB_STORE_QUERY_MAX_LIMIT}
   * and default to {@link JOB_STORE_QUERY_DEFAULT_LIMIT} when omitted, so a
   * misbehaving caller cannot exhaust memory.
   */
  readonly limit?: number;
}

/** Default `limit` applied by backends when {@link JobStoreQuery.limit} is omitted. */
export const JOB_STORE_QUERY_DEFAULT_LIMIT = 100;

/** Hard cap on `limit` regardless of caller-supplied value. */
export const JOB_STORE_QUERY_MAX_LIMIT = 1_000;

/**
 * Page envelope returned by {@link IJobStore.listByQuery}.
 *
 * `nextCursor` is `undefined` (NOT `null`) when the caller has reached the
 * end of the result set, matching standard ECMAScript "absent" semantics
 * for optional fields and keeping JSON payloads compact.
 */
export interface JobStorePage<T> {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor?: string;
}

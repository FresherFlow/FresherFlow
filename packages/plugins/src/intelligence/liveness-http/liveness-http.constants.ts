/**
 * Tunables and transport constants for the liveness-http plugin
 * (Spec 721).
 */

/** Per-request timeout, milliseconds (Spec 721 / NFR-2). */
export const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Minimum plain-text length (chars) below which a 2xx page is treated as
 * a tombstone (Spec 721 / FR-10).
 */
export const DEFAULT_MIN_CONTENT_LENGTH = 300;

/** Maximum in-flight probes per `checkBatch` (Spec 721 / FR-13). */
export const DEFAULT_BATCH_CONCURRENCY = 5;

/** Desktop Chrome User-Agent sent with every probe. */
export const LIVENESS_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Accept header — job postings are HTML documents. */
export const LIVENESS_ACCEPT_HEADER =
  'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8';

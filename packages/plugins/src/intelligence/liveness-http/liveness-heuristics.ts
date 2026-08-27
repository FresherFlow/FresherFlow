import { htmlToPlainText } from '../../base/BaseAdapter.js';
import { DEFAULT_MIN_CONTENT_LENGTH } from './liveness-http.constants.js';

export type LivenessResult = 'active' | 'expired' | 'uncertain';
export type LivenessCode = string;

/**
 * Pure classification heuristics for the liveness-http plugin
 * (Spec 721 / FR-1..FR-12, FR-16).
 *
 * Everything in this module is a pure function over its arguments; all
 * regexes are precompiled at module scope (the classifier runs once per
 * stored URL, so per-call `new RegExp` churn matters — NFR-1).
 *
 * Text-rule contract (FR-6): `classifyBody` lowercases its inputs itself;
 * the marker regexes below are therefore written in lowercase and applied
 * to lowercased strings.
 */

/** Partial verdict produced by a heuristic — result + reason code. */
export interface HeuristicOutcome {
  readonly result: LivenessResult;
  readonly code: LivenessCode;
}

const EXPIRED_TEXT: HeuristicOutcome = { result: 'expired', code: 'expired_text' };
const BOT_CHALLENGE: HeuristicOutcome = { result: 'uncertain', code: 'bot_challenge' };
const APPLY_VISIBLE: HeuristicOutcome = { result: 'active', code: 'apply_control_visible' };
const INSUFFICIENT_CONTENT: HeuristicOutcome = { result: 'expired', code: 'insufficient_content' };
const LISTING_PAGE: HeuristicOutcome = { result: 'uncertain', code: 'listing_page' };
const NO_APPLY_CONTROL: HeuristicOutcome = { result: 'uncertain', code: 'no_apply_control' };

/**
 * Hard-expired tombstone phrases (Spec 721 § 7.3) — matched against the
 * lowercased plain text. Multilingual: EN, DE, FR, ES, PL. The French
 * pattern tolerates both the straight (') and typographic (’)
 * apostrophe — entity decoding yields the latter.
 */
const EXPIRED_TEXT_PATTERNS: ReadonlyArray<RegExp> = [
  /job (?:is )?no longer available/,
  /position has been filled/,
  /this job has expired/,
  /no longer accepting applications/,
  /applications (?:are|have) closed/,
  /this posting has been closed/,
  /nicht mehr verfügbar/, // DE: "nicht mehr verfügbar"
  /bereits besetzt/, // DE
  /offre expirée/, // FR: "offre expirée"
  /n['’]est plus disponible/, // FR
  /ya no está disponible/, // ES: "ya no está disponible"
  /esta oferta ha expirado/, // ES
  /oferta wygasła/, // PL: "oferta wygasła"
  /oferta jest nieaktualna/, // PL
];

/**
 * Anti-bot challenge markers (Spec 721 § 7.3 / FR-8) — matched against the
 * lowercased RAW html (D-02: markers commonly live in `<title>` tags,
 * script URLs and attributes that tag-stripping would discard).
 */
const BOT_CHALLENGE_PATTERNS: ReadonlyArray<RegExp> = [
  /just a moment/,
  /verify you are a human/,
  /verify you are not a robot/,
  /verifying you are human/,
  /performing security verification/,
  /cf-ray/,
  /hcaptcha/,
];

/** Compound challenge markers — both parts must be present (FR-8). */
const BOT_CHALLENGE_COMPOUND_PATTERNS: ReadonlyArray<readonly [RegExp, RegExp]> = [
  [/attention required/, /cloudflare/],
  [/press and hold/, /human/],
];

/**
 * Apply-control markers (Spec 721 § 7.3 / FR-9) — matched against the
 * lowercased plain text. `\bapply\b` is word-bounded so e.g. "applies"
 * or "applying" alone do not count; the non-English verbs are matched as
 * prefixes/substrings (inflected button labels are common).
 */
const APPLY_CONTROL_PATTERNS: ReadonlyArray<RegExp> = [
  /\bapply\b/,
  /submit application/,
  /start application/,
  /easy apply/,
  /\bsolicitar\b/, // ES
  /\bbewerben\b/, // DE: "Jetzt bewerben"
  /\bpostuler\b/, // FR
  /\baplikuj/, // PL: "Aplikuj (teraz)"
  /wyślij cv/, // PL: "wyślij CV"
  /wyślij aplikację/, // PL: "wyślij aplikację"
];

/**
 * Multi-job listing-page heuristic (FR-11): result-count banners such as
 * "42 jobs found" / "13 open positions available".
 */
const LISTING_PAGE_PATTERN = /\d+\s+(?:jobs?|open positions|openings)\s+(?:found|available)/;

/** Final-URL expiry marker (FR-5): an `error=true` query parameter. */
const EXPIRED_URL_QUERY_PATTERN = /[?&]error=true(?:[&#]|$)/i;

/**
 * Classify a received HTTP status (FR-1..FR-3). Returns `null` for
 * statuses < 400 — body heuristics take over from there.
 *
 *   - 404 / 410 → expired / http_gone
 *   - 403 / 503 → uncertain / access_blocked (anti-bot walls masquerade
 *     as these — never `expired`, Spec 721 / NFR-5)
 *   - other ≥ 400 → uncertain / http_error
 */
export function classifyHttpStatus(status: number): HeuristicOutcome | null {
  if (status === 404 || status === 410) {
    return { result: 'expired', code: 'http_gone' };
  }
  if (status === 403 || status === 503) {
    return { result: 'uncertain', code: 'access_blocked' };
  }
  if (status >= 400) {
    return { result: 'uncertain', code: 'http_error' };
  }
  return null;
}

/**
 * True when the final (post-redirect) URL carries an `error=true` query
 * parameter (FR-5) — boards commonly redirect dead postings back to the
 * board root with that flag.
 */
export function hasExpiredUrlMarker(finalUrl: string): boolean {
  try {
    return new URL(finalUrl).searchParams.get('error') === 'true';
  } catch {
    // Not WHATWG-parseable (relative/odd) — fall back to a query-shaped scan.
    return EXPIRED_URL_QUERY_PATTERN.test(finalUrl);
  }
}

/** True when the lowercased plain text carries a tombstone phrase (FR-7). */
export function matchesExpiredText(plainTextLower: string): boolean {
  return EXPIRED_TEXT_PATTERNS.some((re) => re.test(plainTextLower));
}

/** True when the lowercased raw HTML carries a challenge marker (FR-8). */
export function matchesBotChallenge(htmlLower: string): boolean {
  if (BOT_CHALLENGE_PATTERNS.some((re) => re.test(htmlLower))) {
    return true;
  }
  return BOT_CHALLENGE_COMPOUND_PATTERNS.some(
    ([a, b]) => a.test(htmlLower) && b.test(htmlLower),
  );
}

/** True when the lowercased plain text carries an apply control (FR-9). */
export function matchesApplyControl(plainTextLower: string): boolean {
  return APPLY_CONTROL_PATTERNS.some((re) => re.test(plainTextLower));
}

/** True when the lowercased plain text looks like a listing page (FR-11). */
export function matchesListingPage(plainTextLower: string): boolean {
  return LISTING_PAGE_PATTERN.test(plainTextLower);
}

/**
 * Classify a 2xx/3xx response body (FR-6..FR-12). Priority order — first
 * match wins:
 *
 *   1. hard-expired tombstone text       → expired   / expired_text
 *   2. bot-challenge marker              → uncertain / bot_challenge
 *      (BEFORE the short-content rule — challenge interstitials are
 *      short and would otherwise read as dead pages, D-03)
 *   3. apply control visible             → active    / apply_control_visible
 *   4. plain text < `minContentLength`   → expired   / insufficient_content
 *   5. listing-page banner               → uncertain / listing_page
 *   6. otherwise                         → uncertain / no_apply_control
 */
export function classifyBody(
  html: string,
  minContentLength: number = DEFAULT_MIN_CONTENT_LENGTH,
): HeuristicOutcome {
  const htmlLower = (html ?? '').toLowerCase();
  const plainLower = htmlToPlainText(html ?? '').toLowerCase();

  if (matchesExpiredText(plainLower)) {
    return EXPIRED_TEXT;
  }
  if (matchesBotChallenge(htmlLower)) {
    return BOT_CHALLENGE;
  }
  if (matchesApplyControl(plainLower)) {
    return APPLY_VISIBLE;
  }
  if (plainLower.length < minContentLength) {
    return INSUFFICIENT_CONTENT;
  }
  if (matchesListingPage(plainLower)) {
    return LISTING_PAGE;
  }
  return NO_APPLY_CONTROL;
}

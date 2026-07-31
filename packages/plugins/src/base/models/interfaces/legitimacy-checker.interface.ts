/**
 * Legitimacy / ghost-job checker contract (Spec 740).
 *
 * A deterministic, explainable corpus-level signal: given the facts already known about a posting
 * (compensation presence, how many distinct sources observed it, whether it came from an ATS,
 * company-metadata richness, description depth, off-platform redirect), classify how likely the
 * posting is genuine. Implementations are registered as NestJS providers under
 * {@link LEGITIMACY_CHECKER_TOKEN}. Pure + in-memory — never throws, no network, no persistence.
 *
 * Orthogonal to fit and to liveness: a posting can be live AND look like a ghost job.
 */

/** DI token used to register the active legitimacy checker plugin. */
export const LEGITIMACY_CHECKER_TOKEN = 'LEGITIMACY_CHECKER';

/** Tri-state legitimacy classification. `uncertain` is the safe default. */
export type LegitimacyState = 'verified' | 'likely' | 'uncertain';

/** Per-posting legitimacy outcome. */
export interface LegitimacyVerdict {
  /** Tri-state classification. */
  state: LegitimacyState;
  /** Human-readable, explainable reasons backing `state`. */
  reasons: string[];
  /** Assessment time, ISO-8601. */
  checkedAt: string;
}

/** The facts the scorer reasons over (all derivable from the aggregated job + dedup output). */
export interface LegitimacyInput {
  /** Whether the posting discloses compensation. */
  hasCompensation: boolean;
  /** Number of distinct sources that observed this (canonical) job. */
  sourceCount: number;
  /** Whether at least one observing source is an ATS (higher trust). */
  isFromAts: boolean;
  /** Whether the posting carries a company logo (a richness signal). */
  hasCompanyLogo: boolean;
  /** Length of the job description in characters. */
  descriptionLength: number;
  /** Whether the apply URL redirects off-platform (from liveness `expired_url`), if known. */
  redirectsOffPlatform?: boolean;
}

/**
 * Legitimacy checker contract.
 *
 * Implementations MUST be pure (deterministic, no I/O), never throw, and preserve input order in
 * {@link ILegitimacyChecker.assessBatch}.
 */
export interface ILegitimacyChecker {
  /** Classify a single posting. */
  assess(input: LegitimacyInput): LegitimacyVerdict;
  /** Classify many postings; results align to input order. */
  assessBatch(inputs: LegitimacyInput[]): LegitimacyVerdict[];
}

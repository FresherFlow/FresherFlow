import { Site } from '../enums/site.enum';

/**
 * A single per-source sighting of a logical job posting.
 *
 * The dedup engine (Spec 003) collapses many `SourceObservation`s — typically
 * one per plugin that surfaced the role — into one `CanonicalJob`. The list of
 * observations stays attached so the UI can show "also seen on N other sites"
 * and so the merge resolver can re-run with different policies later.
 */
export interface SourceObservation {
  /** Site enum identifying the plugin that produced this observation. */
  readonly site: Site;
  /** Source-local id. Globally unique only when paired with `site`. */
  readonly sourceJobId: string;
  /** Canonical URL the plugin used; the UI can deep-link back. */
  readonly url: string;
  /** ISO-8601 timestamp when the plugin observed the job. */
  readonly observedAt: string;
  /**
   * Optional cosmetic title as the source presented it. Useful for debugging
   * dedup decisions ("did we really merge 'Senior SWE' with 'Sr. Software
   * Engineer'?"). Always present in the canonical record's `fields.title.value`
   * after normalisation.
   */
  readonly rawTitle?: string;
}

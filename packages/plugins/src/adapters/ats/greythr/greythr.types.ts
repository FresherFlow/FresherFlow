/**
 * TypeScript interfaces for the greytHR (greytHR Recruit) public careers surface.
 *
 * greytHR tenant careers boards (`{tenant}.greythr.com/hire/jobs/`) are client-rendered
 * single-page apps whose open roles are NOT in the landing HTML; the SPA fetches the full
 * published-role set from the public, anonymous JSON endpoint
 * `POST {origin}/hire/api/career/published_jobs/` (body `{}`), which returns
 * `{ data: [ … ] }`. The adapter calls that endpoint and reads `data`. The interfaces
 * below describe the subset of that wire shape the adapter reads plus the normalised
 * internal role assembled from it. Everything the adapter reads is optional and
 * defensively narrowed at parse time, so cross-tenant or future-shape drift never breaks
 * the parser.
 */

/**
 * A single published role as returned in the `data` array of the published-roles
 * endpoint. Only the fields the adapter consumes are modelled; all are optional and
 * defensively narrowed.
 */
export interface GreytHrJobItem {
  /** UUID role id — the stable ATS id. */
  id?: string | null;
  /** Role display title. */
  title?: string | null;
  /** URL-safe role slug (final segment of the `/hire/jobs/{slug}` detail URL). */
  slug?: string | null;
  /** Human requisition id (e.g. `1328`); informational only. */
  req_id?: string | number | null;
  /** ISO creation timestamp. */
  created_at?: string | null;
  /** ISO timestamp the role was published to the public careers page. */
  published_on_career_page?: string | null;
  /** Opaque numeric location-id strings (not human-readable in the anonymous payload). */
  locations?: Array<string | number> | null;
  /** HTML role description body. */
  description?: string | null;
  /** Employment type token (e.g. `Full-time`, `Part-time`, `Contract`). */
  job_type?: string | null;
  /** Structured remote flag set by the recruiter. */
  is_remote?: boolean | null;
  /** Role-family / designation label, when set. */
  designation?: string | null;
  /** Minimum experience (in `experience_units`), when set. */
  min_exp?: number | string | null;
  /** Maximum experience (in `experience_units`), when set. */
  max_exp?: number | string | null;
  /** Unit for the experience range (e.g. `years`). */
  experience_units?: string | null;
  /**
   * Server-built, fully-qualified public detail / apply URL
   * (`https://{tenant}.greythr.com/hire/jobs/{slug}`).
   */
  apply_url?: string | null;
}

/**
 * The top-level published-roles response. The adapter narrows `data` to an array.
 */
export interface GreytHrPublishedJobsResponse {
  /** The tenant's published open roles. */
  data?: GreytHrJobItem[] | null;
}

/**
 * Normalised view of a single greytHR role, ready to map to a JobPostDto.
 */
export interface GreytHrJob {
  /** Stable ATS id (the role UUID `id`). */
  atsId: string;

  /** Absolute public detail URL (the canonical careers-site `/hire/jobs/{slug}` page). */
  url: string;

  /** Absolute public apply URL (the same detail page hosts the apply flow). */
  applyUrl: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (the de-slugified tenant slug). */
  companyName?: string | null;

  /** Role description body (HTML when present), else null. */
  descriptionHtml?: string | null;

  /** Department / designation label, when present. */
  department?: string | null;

  /** Employment type (from `job_type`), when present. */
  employmentType?: string | null;

  /** Posted date — parsed from `published_on_career_page` / `created_at`, when available. */
  datePosted?: string | null;

  /** True when the role advertises remote / home-working. */
  isRemote?: boolean | null;
}

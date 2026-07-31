/**
 * TypeScript interfaces for the PyjamaHR public careers JSON surface.
 *
 * PyjamaHR exposes a clean, unauthenticated JSON API on `api.pyjamahr.com` keyed
 * by the tenant's `company_slug`: a paginated open-roles list
 * (`/api/career/jobs/?company_slug={tenant}`) and a per-role detail object
 * (`/api/career/jobs/{id}/?company_slug={tenant}`). The interfaces below model the
 * wire shapes the adapter consumes. Field names mirror the API's snake_case wire
 * keys; everything the adapter reads is optional and defensively narrowed at parse
 * time, so minor cross-tenant or future-version drift never breaks the parser.
 */

/** A single role as it appears in the paginated list endpoint's `results[]`. */
export interface PyjamaHrJobListItem {
  /** Numeric role id — used as the ATS id and the detail-endpoint key. */
  id: number | string;
  /** URL slug for the role (e.g. `senior-lead-social-commerce`). */
  slug?: string | null;
  /** Job display title. */
  title?: string | null;
  /** Primary country (e.g. "India"). */
  country?: string | null;
  /** Primary location / city (e.g. "Pune", "Remote"). */
  location?: string | null;
  /** Additional location strings, when the role spans multiple sites. */
  other_locations?: string[] | null;
  /** Department label, when categorised. */
  department_name?: string | null;
  /** Workplace mode (`REMOTE` / `ONSITE` / `HYBRID`). */
  workplace_type?: string | null;
  /** Minimum / maximum required years of experience. */
  min_experience?: number | null;
  max_experience?: number | null;
}

/** The paginated envelope returned by the open-roles list endpoint. */
export interface PyjamaHrJobsListResponse {
  /** Total open-role count for the tenant. */
  count?: number | null;
  /** Absolute URL of the next page, or null on the last page. */
  next?: string | null;
  /** Absolute URL of the previous page, or null on the first page. */
  previous?: string | null;
  /** This page's roles. */
  results?: PyjamaHrJobListItem[] | null;
}

/**
 * The per-role detail object returned by `/api/career/jobs/{id}/`. Only the fields
 * the adapter consumes are typed; everything is optional and defensively narrowed
 * at parse time, since the payload varies by tenant.
 */
export interface PyjamaHrJobDetail {
  /** Numeric role id — used as the ATS id. */
  id?: number | string | null;
  /** Opaque per-role uuid (present on the detail object). */
  uuid?: string | null;
  /** Job display title. */
  title?: string | null;
  /** Full job-ad body as HTML. */
  description?: string | null;
  /** Employment-type token (e.g. `FULLTIME`, `PARTTIME`, `CONTRACT`, `INTERNSHIP`). */
  job_type?: string | null;
  /** Workplace mode (`REMOTE` / `ONSITE` / `HYBRID`). */
  workplace_type?: string | null;
  /** Explicit remote flag, when the API sets one. */
  remote?: boolean | null;
  /** Primary country (e.g. "India"). */
  country?: string | null;
  /** Primary location / city (e.g. "Pune", "Remote"). */
  location?: string | null;
  /** Additional location strings, when the role spans multiple sites. */
  other_locations?: string[] | null;
  /** Department label, when categorised. */
  department_name?: string | null;
  /** Seniority labels (e.g. `["mid-senior-level"]`). */
  seniority?: string[] | null;
  /** Required skills, when present. */
  skill?: string[] | null;
  /** ISO timestamp the role was created / published. */
  created_at?: string | null;
  /** ISO timestamp the posting expires. */
  valid_through?: string | null;
  /** Salary currency code (e.g. "INR"). */
  currency?: string | null;
}

/**
 * Normalised view of a single PyjamaHR role, assembled from its list item and its
 * fetched detail object.
 */
export interface PyjamaHrJob {
  /** Numeric role id — used as the ATS id. */
  jobId: string;

  /** Absolute public detail / apply URL (`https://jobs.pyjamahr.com/{tenant}?job_uuid={id}`). */
  url: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (derived from the slug — the API carries no brand name). */
  companyName?: string | null;

  /** Full job-ad body as HTML (from the detail object). */
  descriptionHtml?: string | null;

  /** Structured location parts derived from `location` / `country`. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label (from `job_type`). */
  employmentType?: string | null;

  /** Department label (from `department_name`), when present. */
  department?: string | null;

  /** Posted date — `created_at`, parsed to YYYY-MM-DD. */
  datePosted?: string | null;

  /** True when the role advertises remote / home-working. */
  isRemote?: boolean | null;
}

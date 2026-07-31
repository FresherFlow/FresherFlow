/**
 * TypeScript interfaces for the Recruit CRM public jobs feed.
 *
 * The feed (`POST /v1/external-pages/jobs-by-account/get`) returns
 * `{ status, data: { jobs: RecruitCrmJob[] } }`.  Field names mirror the real
 * wire shape, which is `snake_case`.  Fields that are occasionally missing or
 * returned as `null` are typed as optional / nullable.
 */

/** A single open position as returned by the public jobs feed. */
export interface RecruitCrmJob {
  /**
   * Unique public identifier for this job; also the URL key for the
   * job-detail page at `https://recruitcrm.io/jobs/{slug}`.
   * Used as `atsId`.
   */
  slug?: string | null;

  /** Internal serial number for the job (numeric string, e.g. `"145"`). */
  srno?: string | null;

  /** Job title. */
  name?: string | null;

  /** Client company name for whom the agency is recruiting. */
  companyname?: string | null;

  /**
   * Display flag for the company name.
   * `0` = hide company; any other value = show.
   */
  showcompany?: number | string | null;

  /** Optional job reference / requisition code assigned by the agency. */
  jobcode?: string | null;

  /** Short plain-text job summary (often empty; `jdtext` carries the full HTML). */
  description?: string | null;

  /**
   * Storage key of an optional PDF attachment for the job description.
   * Not used in mapping — we rely on `jdtext` for the description.
   */
  details?: string | null;

  /** Display name of the PDF attachment (if any). */
  detailfilename?: string | null;

  /** Free-text city label (may be empty). */
  city?: string | null;

  /** Sub-region or district within the city (may be empty). */
  locality?: string | null;

  /**
   * Full HTML job description.  This is the primary description source;
   * `description` is a plain-text fallback.
   */
  jdtext?: string | null;

  /**
   * Remote flag / label.  Non-empty string (e.g. `"Remote"`) indicates a
   * remote or hybrid role.
   */
  remote?: string | null;

  /** Postal / ZIP code for the role's location (may be empty). */
  postalcode?: string | null;

  /**
   * Raw per-job application form configuration (JSON string or object).
   * Not mapped into `JobPostDto` — included for completeness.
   */
  job_application_settings?: unknown;
}

/** The data object nested inside the Albatross jobs-by-account response. */
export interface RecruitCrmJobsData {
  /** Open positions for this account. */
  jobs?: RecruitCrmJob[] | null;
}

/** Top-level response from `POST /v1/external-pages/jobs-by-account/get`. */
export interface RecruitCrmJobsResponse {
  /** `"success"` on a valid response; `"fail"` on auth / validation errors. */
  status?: string | null;
  /** Human-readable status message (often empty on success). */
  message?: string | null;
  /** CSS class name hint for the front-end toast (e.g. `"is-success"`). */
  message_type?: string | null;
  /** Payload; contains `jobs` on success. */
  data?: RecruitCrmJobsData | null;
}

/**
 * TypeScript interfaces for the Ceipal public career-portal API.
 *
 * Wire shapes mirror the JSON returned by `https://api.ceipal.com/{apiKey}/…`.
 * All fields are optional / nullable: the API is tenant-configurable and any
 * given field may be absent, empty, or a string-or-number depending on the
 * tenant, so the service must tolerate sparse rows.
 *
 * Field names were extracted from the official reference client
 * (`https://api.ceipal.com/careers_v3/js/app.min.js`, verified 2026-06-03):
 * these are exactly the keys the portal reads off each `results[i]` row and the
 * pagination envelope.
 */

/** A single job row from `GET {apiKey}/job-postings/` inside `results[]`. */
export interface CeipalJobPosting {
  /** Primary key — numeric id; used for the detail fetch and atsId. */
  id?: number | string | null;
  /** Alternate id alias seen in some payloads. */
  job_id?: number | string | null;
  /** Short tenant job reference code (e.g. "PDT-11238"). */
  job_code?: string | null;
  /** Job title. The portal prefers `position_title`, falling back to `job_title`. */
  job_title?: string | null;
  /** Public-facing position title (preferred display title). */
  position_title?: string | null;
  /** Free-text city label. */
  city?: string | null;
  /** Free-text / lookup state label. */
  state?: string | null;
  /** Free-text / lookup country label. */
  country?: string | null;
  /** Experience requirement as a free-text string (e.g. "5-8 years"). */
  experience?: string | null;
  /** Comma-separated primary skills. */
  primary_skills?: string | null;
  /** Alternate skills alias. */
  skills?: string | null;
  /** HTML / rich job description (public-facing). */
  public_job_desc?: string | null;
  /** HTML requisition description (alternate / fuller description). */
  requistion_description?: string | null;
  /** Employer / client display name. */
  client_name?: string | null;
  /** Recruiter / contact person name. */
  contact_person?: string | null;
  /** Human-readable created date (e.g. "06/02/2026"). */
  created?: string | null;
  /** Human-readable posted date. */
  posted?: string | null;
  /** Canonical apply URL on the tenant's portal, if present. */
  apply_job?: string | null;
  /** External apply URLs (job-board syndication), if present. */
  apply_job_indeed?: string | null;
  apply_job_monster?: string | null;
  /** Required documents label (detail-oriented). */
  required_documents?: string | null;
  /** Terms-and-conditions HTML (detail-oriented). */
  terms_and_conditions?: string | null;
  /** Work-authorisation label. */
  work_authorization?: string | null;
  /** Employment-type / business-unit hints (tenant-varying). */
  job_type?: string | null;
  business_unit?: string | null;
  /** Remote indicator (tenant-varying: string flag or label). */
  remote_job?: string | number | null;
  work_type?: string | null;
}

/**
 * Detailed job record from `GET {apiKey}/job-postings/{id}/`. Structurally a
 * superset of the list row (same field names) with the full description and
 * ancillary fields populated; modelled as an alias for forward-compatibility.
 */
export type CeipalJobDetail = CeipalJobPosting;

/**
 * Top-level Django-REST paginated envelope from `GET {apiKey}/job-postings/`.
 * `status`/`success` are `1` on success; an unmatched key yields `status: 400,
 * success: 0` with a `message`.
 */
export interface CeipalJobListResponse {
  status?: number | null;
  success?: number | null;
  message?: string | null;
  /** Total count of matching rows across all pages. */
  count?: number | null;
  /** Total number of listing pages. */
  num_pages?: number | null;
  /** 1-based current page number echoed back. */
  page_number?: number | null;
  /** Absolute URL of the next page, or null on the last page. */
  next?: string | null;
  /** Absolute URL of the previous page, or null on the first page. */
  previous?: string | null;
  /** The job rows for this page. */
  results?: CeipalJobPosting[] | null;
}

/**
 * Top-level envelope from `GET {apiKey}/job-postings/{id}/`. The detail body may
 * be returned flat (fields at top level) or wrapped under `data` depending on
 * tenant configuration; both are tolerated by the service.
 */
export interface CeipalJobDetailResponse {
  status?: number | null;
  success?: number | null;
  message?: string | null;
  data?: CeipalJobDetail | null;
  results?: CeipalJobDetail | null;
  /** Flat-shape fields (when the detail body is not wrapped). */
  id?: number | string | null;
  public_job_desc?: string | null;
  requistion_description?: string | null;
  position_title?: string | null;
  job_title?: string | null;
}

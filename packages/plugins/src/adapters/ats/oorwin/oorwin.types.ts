/**
 * TypeScript interfaces for the Oorwin public career portal API.
 *
 * All wire shapes are `snake_case` as returned by the Oorwin REST API at
 * `https://api.oorwin.ai/api/v2/`. Field names mirror the real wire shape;
 * optional fields use `?` to handle sparse or tenant-varying responses.
 *
 * Two endpoints contribute to the full job record:
 *   - `POST careers/getJobList` → `OorwinJobListItem` (summary only, no description)
 *   - `POST careers/job_view`   → `OorwinJobDetail` (includes `job_description` HTML)
 */

/** Summary row as returned by `POST careers/getJobList` inside `data.list_details.data[]`. */
export interface OorwinJobListItem {
  /** Numeric database id — used in the public job-detail page URL. */
  id?: number | null;
  /** SHA-1 hash id used by the `job_view` detail endpoint. */
  computed_sha1_job_id?: string | null;

  /** Job title. */
  title?: string | null;
  /** Employment type label (e.g. "Full Time", "Contractual", "C2H"). */
  job_type?: string | null;
  /** Experience range as a free-text string (e.g. "10-12", "5-8"). */
  experience_range?: string | null;
  /** Short job reference code (e.g. "PDT - 11238"). */
  code?: string | null;
  /** ISO-8601-ish publish timestamp (e.g. "2026-06-02 20:01:19.000"). */
  cp_published_on?: string | null;
  /** Remote status label: "Remote", "OnSite", or "Hybrid". */
  remote_status?: string | null;
  /** Free-text city / location label (e.g. "Plano, TX"). */
  city?: string | null;
  /** Country lookup id (1 = USA). */
  country?: number | null;
  /** State lookup id (numeric string). */
  state?: string | null;
  /** Full state name (e.g. "Texas"). */
  state_format_name?: string | null;
  /** Full country name (e.g. "USA"). */
  country_format_name?: string | null;
  /** Numeric id alias used for dedup (same as `id`). */
  encid?: number | null;
}

/** Detailed job record as returned by `POST careers/job_view` inside `data.job_details`. */
export interface OorwinJobDetail {
  id?: number | null;
  computed_sha1_job_id?: string | null;
  title?: string | null;
  job_type?: string | null;
  experience_range?: string | null;
  code?: string | null;
  /** Human-readable published date (e.g. "06/02/2026"). Not parsed; use listing date instead. */
  cp_published_on?: string | null;
  /** Full HTML job description — the primary description source. */
  job_description?: string | null;
  /** Free-text location label (e.g. "Plano, TX"). */
  city?: string | null;
  primary_skills?: string | null;
  remote_status?: string | null;
}

/** The `data.list_details` wrapper in the `getJobList` response. */
export interface OorwinListDetails {
  /** Total published job count for the tenant. */
  total?: number | null;
  current_page?: number | null;
  last_page?: number | null;
  data?: OorwinJobListItem[] | null;
  other_info?: {
    company_details?: OorwinCompanyDetails | null;
  } | null;
}

/** Company details embedded in the portal init and job list responses. */
export interface OorwinCompanyDetails {
  id?: number | null;
  name?: string | null;
  display_name?: string | null;
  region?: string | null;
  instance?: string | null;
}

/** Top-level response from `POST careers/getJobList`. */
export interface OorwinJobListResponse {
  status?: number | null;
  success?: number | null;
  message?: string | null;
  data?: {
    list_details?: OorwinListDetails | null;
    referral_settings?: unknown;
    header_columns?: Record<string, string> | null;
    job_type?: Array<{ id: string; name: string; order?: number }> | null;
    current_date?: string | null;
    default_currency?: string | null;
  } | null;
}

/** Top-level response from `POST careers/job_view`. */
export interface OorwinJobViewResponse {
  status?: number | null;
  success?: number | null;
  message?: string | null;
  data?: {
    job_details?: OorwinJobDetail | null;
    arrCompanyDetails?: OorwinCompanyDetails | null;
    companyName?: string | null;
    jobUrl?: string | null;
    strLocation?: string | null;
    is_already_applied?: boolean | null;
    loginstatus?: number | null;
  } | null;
}

/** Top-level response from `POST careers` (portal init). */
export interface OorwinPortalInitResponse {
  status?: number | null;
  success?: number | null;
  message?: string | null;
  data?: {
    company_id?: number | null;
    company_description?: string | null;
    logo_src?: string | null;
    company_details?: OorwinCompanyDetails | null;
    career_portal_settings?: {
      show_signin?: number | null;
    } | null;
  } | null;
}

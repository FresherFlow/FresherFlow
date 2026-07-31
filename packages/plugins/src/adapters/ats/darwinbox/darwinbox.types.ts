/**
 * TypeScript interfaces for the Darwinbox public candidate API.
 *
 * The candidate backend (`/ms/candidateapi/...`) answers with a consistent JSON
 * envelope `{ "status": "success" | "error", "data": { ... } }`. The open-roles
 * payload lives under `data`, either as a bare array or wrapped in a `jobs` /
 * `jobList` / `data` array. Field names mirror the platform's snake_case wire
 * shape; camelCase aliases are modelled defensively so minor cross-tenant or
 * future-version drift never breaks the parser (see the live-verification note
 * in `darwinbox.constants.ts` — the exact field names could not be observed
 * end-to-end past the Cloudflare bot gate, so this shape is intentionally lax).
 */

/** A single open position as returned by the candidate API. */
export interface DarwinboxJob {
  /** Stable job identifier — used as the ATS id. */
  id?: string | number | null;
  job_id?: string | number | null;
  jobId?: string | number | null;
  /** Opaque encrypted/public job key sometimes used in apply URLs. */
  job_key?: string | null;
  jobKey?: string | null;
  vacancy_id?: string | number | null;

  /** Job display title. */
  job_title?: string | null;
  jobTitle?: string | null;
  title?: string | null;
  name?: string | null;
  designation?: string | null;

  /** Absolute or relative public apply / job-detail URL. */
  apply_url?: string | null;
  applyUrl?: string | null;
  job_url?: string | null;
  jobUrl?: string | null;
  url?: string | null;
  link?: string | null;

  /** Full job-ad body — HTML and/or pre-stripped plain text. */
  job_description?: string | null;
  jobDescription?: string | null;
  description?: string | null;
  description_html?: string | null;
  descriptionHtml?: string | null;
  description_text?: string | null;
  descriptionText?: string | null;

  /** Publish / update timestamps (ISO-8601 or `YYYY-MM-DD`). */
  posted_on?: string | null;
  postedOn?: string | null;
  job_posted_on?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;

  /** Free-text full location string. */
  location?: string | null;
  job_location?: string | null;
  jobLocation?: string | null;
  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  region?: string | null;
  country?: string | null;

  /** Owning department / function. */
  department?: string | null;
  department_name?: string | null;
  departmentName?: string | null;
  function?: string | null;

  /** Employment-type label (free text, e.g. "Full Time", "Contract"). */
  employment_type?: string | null;
  employmentType?: string | null;
  job_type?: string | null;
  jobType?: string | null;

  /** Remote / work-mode hint (free text, e.g. "Remote", "Hybrid", "On-site"). */
  work_mode?: string | null;
  workMode?: string | null;
  is_remote?: boolean | string | null;
  isRemote?: boolean | string | null;
}

/** The `data` payload of a job-list response (shape varies across tenants). */
export interface DarwinboxJobListData {
  jobs?: DarwinboxJob[] | null;
  jobList?: DarwinboxJob[] | null;
  job_list?: DarwinboxJob[] | null;
  data?: DarwinboxJob[] | null;
  results?: DarwinboxJob[] | null;
  total?: number | null;
  total_jobs?: number | null;
  company_name?: string | null;
  companyName?: string | null;
}

/** Top-level candidate-API JSON envelope. */
export interface DarwinboxApiResponse<T = DarwinboxJobListData> {
  status?: string | null;
  message?: string | null;
  /** Payload may itself be the data object or a bare jobs array. */
  data?: T | DarwinboxJob[] | null;
}

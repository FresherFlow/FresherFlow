/**
 * TypeScript interfaces for the Eightfold AI positions API.
 *
 * Field names mirror the real wire shape, which mixes camelCase and
 * snake_case across tenants/endpoints; both spellings are modelled so the
 * service can read either without guessing.
 */

/** A single position as returned by `/api/apply/v2/jobs` or `/api/pcsx/search`. */
export interface EightfoldPosition {
  /** Numeric position id (matches the trailing segment of the canonical URL). */
  id?: string | number | null;
  /** Tenant-facing display/requisition id. */
  displayJobId?: string | number | null;
  display_job_id?: string | number | null;
  /** Underlying ATS requisition id (Eightfold often wraps Workday/Greenhouse/etc.). */
  atsJobId?: string | number | null;
  ats_job_id?: string | number | null;

  /** Primary title field; `posting_name`/`title` are tenant fallbacks. */
  name?: string | null;
  posting_name?: string | null;
  title?: string | null;

  /** Canonical job URL — may be absolute or root-relative ("/careers/job/123"). */
  canonicalPositionUrl?: string | null;
  canonical_position_url?: string | null;
  positionUrl?: string | null;
  position_url?: string | null;

  /** Department / team / business unit. */
  department?: string | null;
  team?: string | null;
  businessUnit?: string | null;
  business_unit?: string | null;
  category?: string | null;

  /** Location display strings (newer tenants) — first entry is primary. */
  locations?: Array<string | EightfoldLocationObject> | null;
  standardizedLocations?: Array<string | EightfoldLocationObject> | null;
  /** Structured primary location (older tenants). */
  primaryLocation?: string | EightfoldLocationObject | null;
  primary_location?: string | EightfoldLocationObject | null;

  /** Remote/hybrid encoding. */
  workLocationOption?: string | null;
  work_location_option?: string | null;
  locationFlexibility?: string | null;
  location_flexibility?: string | null;

  /** Employment type (Full-Time, Contract, …). */
  employmentType?: string | null;
  employment_type?: string | null;

  /** HTML job description (present on some search responses). */
  job_description?: string | null;
  jobDescription?: string | null;

  /** Posted/created timestamps — epoch seconds, epoch ms, or ISO string. */
  postedTs?: number | string | null;
  creationTs?: number | string | null;
  t_create?: number | string | null;
  t_update?: number | string | null;

  /** Company name, when the tenant emits it per-position. */
  companyName?: string | null;
}

/** Structured location object used by older Eightfold tenants. */
export interface EightfoldLocationObject {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  name?: string | null;
}

/** SmartApply (`/api/apply/v2/jobs`) response envelope. */
export interface EightfoldJobsResponse {
  positions?: EightfoldPosition[] | null;
  count?: number | null;
}

/** PCSX (`/api/pcsx/search`) response envelope — payload sits under `data`. */
export interface EightfoldPcsxResponse {
  data?: {
    positions?: EightfoldPosition[] | null;
    count?: number | null;
  } | null;
}

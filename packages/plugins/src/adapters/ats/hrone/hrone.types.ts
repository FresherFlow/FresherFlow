/**
 * TypeScript interfaces for the HROne (hrone.cloud) public career-portal surface.
 *
 * HROne tenant career portals (`{tenant}.hrone.cloud/career-portal`) are backed by an
 * anonymous, app-id-scoped job-opening feed at
 * `POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1` with a
 * `{ positionId, pagination }` body and `apiKey` / `domainCode` / `AccessMode` headers. The
 * adapter POSTs this feed, drains pages, and reads the returned postings. The interfaces below
 * describe the subset of that wire shape the adapter reads plus the normalised internal role
 * assembled from it.
 *
 * Surface confidence: verified=false (defensive). The endpoint path, request body, and header
 * mechanism are confirmed from the portal's own Angular bundle + a real career-portal link;
 * the exact response wrapper + per-role field names below are derived from the bundle's data
 * bindings but could not be confirmed via a clean anonymous fetch (the live POST is gated by a
 * per-session signed request token → HTTP 403). Everything the adapter reads is therefore
 * optional and defensively narrowed at parse time, with multiple candidate envelope/field keys
 * tried, so cross-tenant or future-shape drift never breaks the parser.
 */

/** The request body the portal POSTs to the job-opening feed. */
export interface HrOneJobsRequest {
  /** `0` to list all postings (a specific id narrows to one role). */
  positionId: number;
  /** Page controls. */
  pagination: {
    /** 1-based page number. */
    pageNumber: number;
    /** Roles requested per page. */
    pageSize: number;
  };
}

/**
 * A single job opening / posting as returned in the feed. Only the fields the adapter consumes
 * are modelled; all are optional and defensively narrowed. HROne's bundle exposes both
 * `PascalCase` and `camelCase` accessors across views, so the adapter tolerates either casing
 * at parse time (the camelCase keys below are the primary, with PascalCase fallbacks resolved
 * in the service).
 */
export interface HrOneJobItem {
  /** Numeric position / opening id — the stable per-role ATS id source. */
  positionId?: number | string | null;
  /** Alternative posting id key seen on some views. */
  requestId?: number | string | null;
  /** Human-facing job code (e.g. `ENG-014`), used as a stable id fallback. */
  jobCode?: string | null;
  /** Role display title. */
  jobTitle?: string | null;
  /** Free-text location line, when present. */
  location?: string | null;
  /** Structured city name. */
  cityName?: string | null;
  /** Structured state / region name. */
  stateName?: string | null;
  /** Structured country name. */
  countryName?: string | null;
  /** Department / function label. */
  departmentName?: string | null;
  /** Employment-type label (e.g. `Full Time`), when present. */
  employmentType?: string | null;
  /** Alternative employment-type / job-type label key. */
  jobType?: string | null;
  /** Role description body (HTML or text). */
  description?: string | null;
  /** Alternative job-description key. */
  jobDescription?: string | null;
  /** Free-text experience requirement (e.g. `3-5 years`), when present. */
  experience?: string | null;
  /** Free-text salary line, when present. */
  salary?: string | null;
  /** Skills tag list, when present. */
  skills?: string | null;
  /** Number of open vacancies on this posting, when present. */
  noOfPosition?: number | string | null;
  /** ISO posting / created timestamp, when present. */
  postedOn?: string | null;
  /** Alternative posting-date key. */
  postingDate?: string | null;
  /** Alternative created-date key. */
  createdOn?: string | null;
}

/**
 * The job-opening feed response envelope. The exact wrapper is unconfirmed, so the adapter
 * tries several candidate shapes (a bare array, `{ data }`, `{ result }`, `{ items }`,
 * `{ jobOpenings }`, `{ postings }`) and narrows whichever yields the postings array.
 */
export interface HrOneJobsResponse {
  /** Common ASP.NET-style data wrapper. */
  data?: HrOneJobItem[] | { items?: HrOneJobItem[] | null } | null;
  /** Common result wrapper. */
  result?: HrOneJobItem[] | { items?: HrOneJobItem[] | null } | null;
  /** Direct items array. */
  items?: HrOneJobItem[] | null;
  /** Job-opening-named array. */
  jobOpenings?: HrOneJobItem[] | null;
  /** Posting-named array. */
  postings?: HrOneJobItem[] | null;
  /** Total-count hint, when present (used only as a soft pagination signal). */
  totalCount?: number | null;
}

/** Normalised view of a single HROne role, ready to map to a JobPostDto. */
export interface HrOneJob {
  /** Stable ATS id (the posting `positionId` / `requestId` / `jobCode`). */
  atsId: string;

  /** Absolute public detail URL (the tenant career-portal page for this posting). */
  url: string;

  /** Absolute public apply URL (the career portal hosts the apply flow). */
  applyUrl: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (de-slugified tenant token — the feed carries no brand). */
  companyName?: string | null;

  /** Structured location parts derived from the role's city / state / country. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Combined free-text location, used for remote detection. */
  locationText?: string | null;

  /** Role description body (HTML/text when present), else null. */
  descriptionHtml?: string | null;

  /** Department label, derived from the role's department name. */
  department?: string | null;

  /** Employment-type display label (e.g. `Full Time`). */
  employmentType?: string | null;

  /** Posted date — parsed from a posting-date field, when available. */
  datePosted?: string | null;

  /** True when the role advertises remote / work-from-home. */
  isRemote?: boolean | null;
}

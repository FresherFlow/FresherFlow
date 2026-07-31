/**
 * TypeScript interfaces for the Zimyo public careers (widget) surface.
 *
 * Zimyo tenant career boards are served by a public JSON widget API on the ATS backend
 * host (`https://ats.zimyo.work/ats/ats`). The candidate-facing SPA at
 * `zimyo.work/recruit` hydrates from `widget/joblist2` (the paginated open-roles list)
 * and `widget/jobDetails` (the rich per-role body). The interfaces below describe the
 * subset of those wire shapes the adapter reads plus the normalised internal role
 * assembled from them. Everything the adapter reads is optional and defensively narrowed
 * at parse time, so cross-tenant or future-shape drift never breaks the parser.
 */

/**
 * A single role as returned in `widget/joblist2`'s `data.result` array. Zimyo keys are
 * SCREAMING_SNAKE_CASE. Only the fields the adapter consumes are modelled; all are
 * optional and defensively narrowed.
 */
export interface ZimyoJobListItem {
  /** Numeric role id — the stable ATS id and the `jobDetails?jobId=` key. */
  JOB_ID?: number | string | null;
  /** Role display title. */
  JOB_TITLE?: string | null;
  /** Department / organisational-unit label, when present. */
  DEPARTMENT_NAME?: string | null;
  /** Free-text location line (city / office), when present. */
  LOCATION_NAME?: string | null;
  /** Street address line, when present. */
  STREET_ADDRESS?: string | null;
  /** Employment type label (e.g. `Interns`, `Full Time`), when present. */
  EMPLOYEMENT?: string | null;
  /** Workplace arrangement (`On-site` / `Hybrid` / `Remote`), when present on the list. */
  WORKPLACE_TYPE?: string | null;
  /** Tenant brand / entity name, when the list embeds it. */
  ENTITY_NAME?: string | null;
  /** Created / posted date (`DD/MM/YYYY`), when present. */
  CREATED_ON?: string | null;
}

/** Envelope of `widget/joblist2` — `data.result` is the role array. */
export interface ZimyoJobListResponse {
  error?: boolean | null;
  code?: number | null;
  data?: {
    /** The open roles for the tenant on this page. */
    result?: ZimyoJobListItem[] | null;
    /** Total open roles for the tenant across all pages. */
    totalCount?: number | null;
    /** The page index echoed back. */
    page?: number | null;
  } | null;
}

/**
 * The `ALL_DETAILS` JSON blob embedded (as a stringified JSON) in a role's detail
 * record. Carries the structured workplace type, employment type, and salary band.
 */
export interface ZimyoJobAllDetails {
  /** Workplace arrangement (`On-site` / `Hybrid` / `Remote`). */
  WORKPLACE_TYPE?: string | null;
  /** Employment type label (e.g. `Interns`, `Full Time`). */
  EMPLOYEMENT_TYPE?: string | null;
  /** Structured location entries, when present (often empty). */
  LOCATION?: unknown[] | null;
  /** Minimum salary band, when present. */
  MIN_SALARY?: string | number | null;
  /** Maximum salary band, when present. */
  MAX_SALARY?: string | number | null;
}

/**
 * A role's rich detail record as returned in `widget/jobDetails`'s `data.jobDetail`.
 * Only the fields the adapter consumes are modelled; all are optional.
 */
export interface ZimyoJobDetail {
  /** Numeric role id. */
  JOB_ID?: number | string | null;
  /** Owning tenant org id. */
  ORG_ID?: number | string | null;
  /** Role display title. */
  JOB_TITLE?: string | null;
  /** Department / organisational-unit label. */
  DEPARTMENT_NAME?: string | null;
  /** Designation label (e.g. `Intern`). */
  DESIGNATION_NAME?: string | null;
  /** Full HTML role description body. */
  JOB_DESCRIPTION?: string | null;
  /** HTML qualification block, when present. */
  QUALIFICATION?: string | null;
  /** HTML additional-information block, when present. */
  ADDITION_INFORMATION?: string | null;
  /** Free-text street address. */
  STREET_ADDRESS?: string | null;
  /** Free-text location line, when present. */
  LOCATION_NAME?: string | null;
  /** Employment type label. */
  EMPLOYEMENT?: string | null;
  /** Tenant brand / entity name (the per-role brand). */
  ENTITY_NAME?: string | null;
  /** Created / posted date (`DD/MM/YYYY`). */
  CREATED_ON?: string | null;
  /** Application-deadline date (`DD/MM/YYYY`), when present. */
  OPEN_TILL_DATE?: string | null;
  /** Stringified JSON blob carrying workplace type / employment type / salary band. */
  ALL_DETAILS?: string | null;
}

/** Envelope of `widget/jobDetails` — `data.jobDetail` is the role record. */
export interface ZimyoJobDetailResponse {
  error?: boolean | null;
  code?: number | null;
  data?: {
    jobDetail?: ZimyoJobDetail | null;
  } | null;
}

/**
 * A single tenant-org metadata record as returned in `widget/orgDetails`'s `data` array.
 */
export interface ZimyoOrgDetail {
  /** Tenant display brand name (e.g. `Zimyo`). */
  ORG_NAME?: string | null;
  /** Tenant registered address line. */
  ORG_ADDRESS?: string | null;
  /** Tenant logo filename. */
  ORG_LOGO?: string | null;
}

/** Envelope of `widget/orgDetails` — `data` is a single-element org array. */
export interface ZimyoOrgDetailResponse {
  error?: boolean | null;
  code?: number | null;
  data?: ZimyoOrgDetail[] | null;
}

/**
 * Normalised view of a single Zimyo role, ready to map to a JobPostDto.
 */
export interface ZimyoJob {
  /** Stable ATS id (the role `JOB_ID`). */
  atsId: string;

  /** Absolute public detail URL (the canonical career-site detail page). */
  url: string;

  /** Absolute public apply URL (the same detail page hosts the apply flow). */
  applyUrl: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (the org brand, else the de-slugified org id). */
  companyName?: string | null;

  /** Combined free-text location, used for the location DTO + remote detection. */
  locationText?: string | null;

  /** Role description body (HTML), when the detail endpoint exposed one. */
  descriptionHtml?: string | null;

  /** Department / organisational-unit label. */
  department?: string | null;

  /** Employment type label (e.g. `Full Time`), when present. */
  employmentType?: string | null;

  /** Posted date — parsed from `CREATED_ON`, when available. */
  datePosted?: string | null;

  /** True when the role advertises remote / work-from-home. */
  isRemote?: boolean | null;
}

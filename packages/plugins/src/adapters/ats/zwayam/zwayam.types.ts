/**
 * TypeScript interfaces for the Zwayam public career-site JSON surface.
 *
 * Zwayam tenants publish an unauthenticated, client-rendered career site backed by a
 * shared public API origin (`api.zwayam.com`, mirrored `public.zwayam.com`) keyed by
 * the tenant slug + career host: a paginated open-roles list
 * (`/company/{tenant}/jobs?host={careerHost}`) and a per-role preview / detail object
 * (`/job_preview/?jobUrl={jobSlug}&host={careerHost}`). The interfaces below model the
 * wire shapes the adapter consumes. Field names mirror the API's camelCase wire keys;
 * everything the adapter reads is optional and defensively narrowed at parse time, so
 * minor cross-tenant or future-version drift never breaks the parser.
 *
 * NOTE (verified=false): the live list endpoint's exact wire shape could not be
 * byte-confirmed against an anonymous crawler (SPA + timing-out / 403 hosts), so the
 * field set below is a defensive superset of the documented public surface. Multiple
 * plausible aliases are accepted (e.g. `jobTitle` / `title`, `jobDescription` /
 * `description`) and any missing field degrades gracefully.
 */

/** A single role as it appears in the paginated list endpoint's `content[]`. */
export interface ZwayamJobListItem {
  /** Per-role slug id (e.g. `inside-sales-executive-pune-2025012912063817`) — the ATS id + preview key. */
  jobId?: string | number | null;
  /** Alternate slug field name some tenants expose for the same identifier. */
  jobUrl?: string | null;
  /** Job display title (primary key). */
  jobTitle?: string | null;
  /** Job display title (alternate key). */
  title?: string | null;
  /** Combined location string (e.g. "Pune", "Remote"). */
  location?: string | null;
  /** City part, when split. */
  city?: string | null;
  /** State / region part, when split. */
  state?: string | null;
  /** Country part. */
  country?: string | null;
  /** Department / function label, when categorised. */
  department?: string | null;
  /** Employment-type label (e.g. "Full Time", "Contract"). */
  employmentType?: string | null;
  /** Alternate employment-type key. */
  jobType?: string | null;
  /** Explicit remote flag, when the API sets one. */
  remote?: boolean | null;
  /** Workplace mode (`REMOTE` / `ONSITE` / `HYBRID`), when present. */
  workplaceType?: string | null;
  /** Full job-ad body as HTML (the list sometimes embeds it). */
  jobDescription?: string | null;
  /** Alternate description key. */
  description?: string | null;
  /** ISO timestamp the role was posted / published. */
  postedDate?: string | null;
  /** Alternate posted-date key. */
  createdDate?: string | null;
}

/**
 * The paginated envelope returned by the open-roles list endpoint (Spring-style page
 * envelope, the common shape for Zwayam's Java backend). Both the `content[]` array
 * and a bare top-level array are tolerated by the parser.
 */
export interface ZwayamJobsListResponse {
  /** This page's roles (Spring `Page.content`). */
  content?: ZwayamJobListItem[] | null;
  /** Alternate roles array key some endpoints use. */
  jobs?: ZwayamJobListItem[] | null;
  /** Total open-role count across all pages. */
  totalElements?: number | null;
  /** Total number of pages. */
  totalPages?: number | null;
  /** Zero-based index of the current page. */
  number?: number | null;
  /** True on the last page. */
  last?: boolean | null;
}

/**
 * The per-role preview / detail object returned by `/job_preview/`. Only the fields
 * the adapter consumes are typed; everything is optional and defensively narrowed at
 * parse time, since the payload varies by tenant.
 */
export interface ZwayamJobDetail {
  /** Per-role slug id — used as the ATS id. */
  jobId?: string | number | null;
  /** Slug used in the preview / apply URL. */
  jobUrl?: string | null;
  /** Job display title (primary / alternate keys). */
  jobTitle?: string | null;
  title?: string | null;
  /** Full job-ad body as HTML (primary / alternate keys). */
  jobDescription?: string | null;
  description?: string | null;
  /** Employment-type label (e.g. "Full Time", "Contract"). */
  employmentType?: string | null;
  jobType?: string | null;
  /** Workplace mode (`REMOTE` / `ONSITE` / `HYBRID`). */
  workplaceType?: string | null;
  /** Explicit remote flag, when the API sets one. */
  remote?: boolean | null;
  /** Location parts. */
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  /** Department / function label. */
  department?: string | null;
  /** Apply URL, when the API supplies a canonical one. */
  applyUrl?: string | null;
  /** ISO timestamp the role was posted / published. */
  postedDate?: string | null;
  createdDate?: string | null;
}

/**
 * Normalised view of a single Zwayam role, assembled from its list item and (when
 * fetched) its preview / detail object.
 */
export interface ZwayamJob {
  /** Per-role slug id — used as the ATS id. */
  jobId: string;

  /** Absolute public preview / apply URL on `api.zwayam.com`. */
  url: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (derived from the slug — the API carries no brand name). */
  companyName?: string | null;

  /** Full job-ad body as HTML. */
  descriptionHtml?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label. */
  employmentType?: string | null;

  /** Department label, when present. */
  department?: string | null;

  /** Posted date — parsed to YYYY-MM-DD. */
  datePosted?: string | null;

  /** True when the role advertises remote / home-working. */
  isRemote?: boolean | null;
}

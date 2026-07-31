/**
 * TypeScript interfaces for the TurboHire public careers JSON surface.
 *
 * TurboHire's careers portal is a client-rendered SPA backed by an unauthenticated
 * JSON API on `api.turbohire.co`, keyed by the tenant's company / org slug: a
 * paginated open-roles list (`/api/careerpage/publicjobs?companySlug={tenant}`) and
 * a per-role detail object (`/api/careerpage/publicjobs/{id}?companySlug={tenant}`).
 * The interfaces below model the wire shapes the adapter consumes.
 *
 * NOTE: the exact wire shapes could not be confirmed live (the portal is a
 * client-rendered SPA with no public API docs); these are a DEFENSIVE model based on
 * the documented public URL pattern and sibling-adapter conventions. Everything the
 * adapter reads is optional and defensively narrowed at parse time, so minor
 * cross-tenant or future-version drift never breaks the parser.
 */

/** A single role as it appears in the paginated list endpoint's `data[]`. */
export interface TurboHireJobListItem {
  /** Opaque role id / public token — used as the ATS id and the detail-endpoint key. */
  id?: string | number | null;
  /** Public token alias, when the API exposes it under a separate key. */
  publicId?: string | number | null;
  /** URL slug for the role, when present. */
  slug?: string | null;
  /** Job display title. */
  title?: string | null;
  /** Department label, when categorised. */
  departmentName?: string | null;
  /** Employment-type label (e.g. "Full Time", "Contract"). */
  employmentType?: string | null;
  /** Workplace mode (`Remote` / `Onsite` / `Hybrid`). */
  workplaceType?: string | null;
  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;
  /** Free-text location string, when the API ships a single combined field. */
  location?: string | null;
  /** Explicit remote flag, when the API sets one. */
  isRemote?: boolean | null;
  /** Absolute public detail / apply URL, when the list carries it. */
  publicUrl?: string | null;
  applyUrl?: string | null;
}

/** The paginated envelope returned by the open-roles list endpoint. */
export interface TurboHireJobsListResponse {
  /** Total open-role count for the tenant. */
  totalCount?: number | null;
  /** 1-based page index. */
  page?: number | null;
  /** Page size used by the API. */
  pageSize?: number | null;
  /** This page's roles (primary key). */
  data?: TurboHireJobListItem[] | null;
  /** Alternate envelope keys some careers APIs use; tolerated defensively. */
  results?: TurboHireJobListItem[] | null;
  jobs?: TurboHireJobListItem[] | null;
}

/**
 * The per-role detail object returned by `/api/careerpage/publicjobs/{id}`. Only the
 * fields the adapter consumes are typed; everything is optional and defensively
 * narrowed at parse time, since the payload varies by tenant.
 */
export interface TurboHireJobDetail {
  /** Opaque role id / public token — used as the ATS id. */
  id?: string | number | null;
  publicId?: string | number | null;
  /** Job display title. */
  title?: string | null;
  /** Full job-ad body as HTML. */
  descriptionHtml?: string | null;
  /** Alternate body key some careers APIs use. */
  description?: string | null;
  jobDescription?: string | null;
  /** Employment-type label (e.g. "Full Time", "Contract", "Internship"). */
  employmentType?: string | null;
  /** Workplace mode (`Remote` / `Onsite` / `Hybrid`). */
  workplaceType?: string | null;
  /** Explicit remote flag, when the API sets one. */
  isRemote?: boolean | null;
  /** Department label, when categorised. */
  departmentName?: string | null;
  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;
  /** Free-text location string, when the API ships a single combined field. */
  location?: string | null;
  /** ISO timestamp the role was created / published. */
  createdOn?: string | null;
  createdAt?: string | null;
  publishedOn?: string | null;
  /** Absolute public detail / apply URL, when the detail object carries it. */
  publicUrl?: string | null;
  applyUrl?: string | null;
  /** Tenant company display name, when the detail object carries one. */
  companyName?: string | null;
}

/**
 * Normalised view of a single TurboHire role, assembled from its list item and its
 * fetched detail object.
 */
export interface TurboHireJob {
  /** Opaque role id / public token — used as the ATS id. */
  jobId: string;

  /** Absolute public detail / apply URL (`portal.turbohire.co/job/publicjobs/{token}`). */
  url: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (from the detail object, else derived from the slug). */
  companyName?: string | null;

  /** Full job-ad body as HTML (from the detail object). */
  descriptionHtml?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label (from `employmentType`). */
  employmentType?: string | null;

  /** Department label (from `departmentName`), when present. */
  department?: string | null;

  /** Posted date — `createdOn`, parsed to YYYY-MM-DD. */
  datePosted?: string | null;

  /** True when the role advertises remote / home-working. */
  isRemote?: boolean | null;
}

/**
 * TypeScript interfaces for the PeopleStrong public candidate-portal surface.
 *
 * PeopleStrong tenant portals (`{tenant}.peoplestrong.com`) are client-rendered SPAs whose
 * open-roles board is hydrated from a tenant-scoped JSON endpoint; the adapter probes the
 * documented candidate-portal board endpoints (and, defensively, an embedded HTML data
 * island / schema.org JSON-LD on a pre-rendered tenant). The interfaces below describe the
 * subset of that wire shape the adapter reads plus the normalised internal role assembled
 * from it. Everything the adapter reads is optional and defensively narrowed at parse time,
 * so cross-tenant or future-shape drift never breaks the parser.
 *
 * The exact JSON field names vary across PeopleStrong deployments, so the adapter reads a
 * UNION of the common candidate-portal field aliases (e.g. job id under `id` / `jobId` /
 * `requisitionId` / `code`; title under `title` / `jobTitle` / `designation`), rather than
 * binding to one tenant's spelling. The wire surface is DOCUMENTED-BUT-UNVERIFIED (see
 * peoplestrong.constants.ts — the JSON board answered auth/CSRF-guarded anonymously),
 * which is why the modelling is deliberately permissive.
 */

/**
 * A single role as returned by the candidate-portal board endpoint (or extracted from a
 * pre-rendered data island). Only the fields the adapter consumes are modelled; all are
 * optional, multi-aliased, and defensively narrowed.
 */
export interface PeopleStrongJobItem {
  /** Stable role id — the final segment of `/job/detail/{jobId}`. Aliased across tenants. */
  id?: number | string | null;
  jobId?: number | string | null;
  requisitionId?: number | string | null;
  code?: string | null;

  /** Role display title. Aliased across tenants. */
  title?: string | null;
  jobTitle?: string | null;
  designation?: string | null;

  /** Free-text location line. Aliased across tenants. */
  location?: string | null;
  jobLocation?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Department / business-unit label. Aliased across tenants. */
  department?: string | null;
  businessUnit?: string | null;
  function?: string | null;

  /** Role description body (HTML or plain), when the board embeds it. Aliased. */
  description?: string | null;
  jobDescription?: string | null;

  /** Employment type token (e.g. `Full Time`), when present. Aliased. */
  employmentType?: string | null;
  jobType?: string | null;

  /** Posted / created date, when present. Aliased. */
  postedDate?: string | null;
  createdDate?: string | null;
  publishedDate?: string | null;

  /** Work-mode token (e.g. `Remote` / `Hybrid` / `On-site`), when present. Aliased. */
  workMode?: string | null;
  workplaceType?: string | null;

  /** Canonical detail URL, when the board embeds it directly. */
  url?: string | null;
  applyUrl?: string | null;
}

/**
 * The candidate-portal board response envelope. The roles array is exposed under a
 * variety of keys across deployments; the adapter narrows whichever is an array. Modelled
 * defensively — any of these may be the array carrier (or the top level may itself be the
 * array, handled separately by the parser).
 */
export interface PeopleStrongBoardResponse {
  /** Common roles-array carriers across PeopleStrong candidate-portal deployments. */
  data?: PeopleStrongJobItem[] | { jobs?: PeopleStrongJobItem[] | null } | null;
  jobs?: PeopleStrongJobItem[] | null;
  openings?: PeopleStrongJobItem[] | null;
  requisitions?: PeopleStrongJobItem[] | null;
  results?: PeopleStrongJobItem[] | null;
  records?: PeopleStrongJobItem[] | null;

  /** Tenant display brand name, when the envelope carries it. */
  companyName?: string | null;
  tenantName?: string | null;
  organizationName?: string | null;
}

/**
 * Minimal schema.org `JobPosting` shape, read from a pre-rendered detail/board JSON-LD
 * block in the defensive HTML fallback path.
 */
export interface PeopleStrongJsonLd {
  '@type'?: string | string[] | null;
  title?: string | null;
  description?: string | null;
  datePosted?: string | null;
  hiringOrganization?: { name?: string | null } | null;
  jobLocation?:
    | {
        address?: {
          addressLocality?: string | null;
          addressRegion?: string | null;
          addressCountry?: string | { name?: string | null } | null;
        } | null;
      }
    | Array<{
        address?: {
          addressLocality?: string | null;
          addressRegion?: string | null;
          addressCountry?: string | { name?: string | null } | null;
        } | null;
      }>
    | null;
  employmentType?: string | string[] | null;
  identifier?: { value?: string | number | null } | string | number | null;
  url?: string | null;
}

/**
 * Normalised view of a single PeopleStrong role, ready to map to a JobPostDto.
 */
export interface PeopleStrongJob {
  /** Stable ATS id (the role id). */
  atsId: string;

  /** Absolute public detail URL (the canonical `/job/detail/{jobId}` page). */
  url: string;

  /** Absolute public apply URL (the same detail page hosts the apply flow). */
  applyUrl: string;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (the board brand, else the de-slugified slug). */
  companyName?: string | null;

  /** Structured location parts derived from the role's location fields. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Combined free-text location, used for remote detection. */
  locationText?: string | null;

  /** Role description body (when the board exposes one), else null. */
  descriptionHtml?: string | null;

  /** Department / business-unit label. */
  department?: string | null;

  /** Employment type label, when present. */
  employmentType?: string | null;

  /** Posted date — parsed from a posted/created/published field, when available. */
  datePosted?: string | null;

  /** True when the role advertises remote / work-from-home. */
  isRemote?: boolean | null;
}

/**
 * TypeScript interfaces for the Keka public careers surface.
 *
 * Keka's career site is a client-rendered SPA whose open roles are loaded over a
 * public, unauthenticated JSON feed (`/k/careers/api/mwf/careers/jobs` and alias
 * paths), and each role additionally has a server-rendered detail page
 * (`/careers/jobdetails/{jobId}`) carrying a schema.org `JobPosting` JSON-LD
 * block (pre-rendered for Google-for-Jobs). The interfaces below model the
 * normalised, parsed shape the adapter extracts from those documents. Field
 * names mirror the wire meaning; a handful of aliases are modelled defensively so
 * minor cross-tenant or future-version payload drift never breaks the parser.
 */

/**
 * A single raw job object from the published-jobs JSON feed. Every field is
 * optional and modelled with the common cross-tenant aliases, since the rendered
 * payload's exact keys vary by tenant version; values are defensively narrowed at
 * parse time.
 */
export interface KekaApiJob {
  /** Stable job id (used as the ATS id). Aliased across tenant versions. */
  id?: string | number | null;
  jobId?: string | number | null;
  identifier?: string | number | null;

  /** Job display title. */
  title?: string | null;
  jobTitle?: string | null;
  name?: string | null;

  /** Full job-ad body as HTML. */
  jobDescription?: string | null;
  description?: string | null;

  /** Structured location parts (some tenants send a single free-text blob). */
  city?: string | null;
  location?: string | null;
  state?: string | null;
  region?: string | null;
  country?: string | null;

  /** Department / function label. */
  department?: string | null;
  departmentName?: string | null;

  /** Employment-type label (e.g. "Full Time" / "FULL_TIME"). */
  employmentType?: string | null;
  jobType?: string | null;

  /**
   * Remote / work-from-home flag, when the feed advertises one. Modelled as
   * `boolean | string` because cross-tenant feeds emit the flag both as a native
   * JSON boolean and as a stringified truthy token (`"true"`, `"yes"`, `"remote"`);
   * `resolveRemoteFlag` narrows both shapes defensively.
   */
  isRemote?: boolean | string | null;
  remote?: boolean | string | null;

  /** Posted / created date. */
  postedDate?: string | null;
  createdDate?: string | null;
  publishedDate?: string | null;

  /** Absolute / relative public detail-page URL, when the feed advertises one. */
  jobDetailUrl?: string | null;
  url?: string | null;
  slug?: string | null;
}

/** Envelope shapes the published-jobs feed may wrap its job array in. */
export interface KekaJobsApiResponse {
  data?: KekaApiJob[] | null;
  jobs?: KekaApiJob[] | null;
  result?: KekaApiJob[] | null;
  records?: KekaApiJob[] | null;
}

/** schema.org `PostalAddress` carried inside a `JobPosting.jobLocation`. */
export interface KekaPostalAddress {
  /** City / town (e.g. "Noida"). */
  addressLocality?: string | null;
  /** State / region (e.g. "Uttar Pradesh"). */
  addressRegion?: string | null;
  /** Country code or name (e.g. "IN" / "India"). */
  addressCountry?: string | { name?: string | null } | null;
}

/** schema.org `Place` carried inside a `JobPosting.jobLocation`. */
export interface KekaJobLocation {
  address?: KekaPostalAddress | null;
}

/** schema.org `Organization` carried inside a `JobPosting.hiringOrganization`. */
export interface KekaHiringOrganization {
  name?: string | null;
}

/** schema.org `PropertyValue` carried inside a `JobPosting.identifier`. */
export interface KekaIdentifier {
  value?: string | number | null;
}

/**
 * The schema.org `JobPosting` JSON-LD object embedded in a detail page. Only the
 * fields the adapter consumes are typed; everything is optional and defensively
 * narrowed at parse time, since the rendered payload varies by tenant.
 */
export interface KekaJobPosting {
  '@type'?: string | string[] | null;
  title?: string | null;
  description?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  employmentType?: string | string[] | null;
  industry?: string | null;
  /** Free-text "remote OK" flag schema.org uses for home-working roles. */
  jobLocationType?: string | null;
  hiringOrganization?: KekaHiringOrganization | string | null;
  jobLocation?: KekaJobLocation | KekaJobLocation[] | null;
  identifier?: KekaIdentifier | string | number | null;
  /** Canonical / apply URL when the JSON-LD advertises one. */
  url?: string | null;
}

/**
 * Normalised view of a single Keka role, assembled from its JSON-feed object
 * and, when consulted, its detail-page JSON-LD (with `og:` meta as fallbacks).
 */
export interface KekaJob {
  /** Job id — used as the ATS id. */
  jobId: string;

  /** Absolute public detail-page / apply URL. */
  url: string;
  /** Canonical URL from JSON-LD `url` / `og:url`, when present. */
  canonicalUrl?: string | null;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name (from `hiringOrganization.name`). */
  companyName?: string | null;

  /** Full job-ad body as HTML. */
  descriptionHtml?: string | null;
  /** Plain-text body fallback (from `og:description`) when no HTML body exists. */
  description?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label. */
  employmentType?: string | null;

  /** Department / function label, when present. */
  department?: string | null;

  /** Posted date — `datePosted` / `postedDate` parsed to YYYY-MM-DD. */
  datePosted?: string | null;

  /** True when the role advertises remote / home-working. */
  isRemote?: boolean | null;
}

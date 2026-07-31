/**
 * TypeScript interfaces for the Snaphunt public career-site surface.
 *
 * Snaphunt does not expose a single tenant-agnostic JSON list feed; each customer
 * career-site (`{tenant}.snaphunt.com`) enumerates its open roles through an XML
 * sitemap (`/sitemap.xml`) of `/job/{jobId}` URLs, and the fully-rendered role
 * detail is read from the canonical apex page (`https://snaphunt.com/jobs/{jobId}`)
 * which embeds a schema.org `JobPosting` JSON-LD block for Google-for-Jobs. The
 * interfaces below model the normalised, parsed shape the adapter extracts from
 * those documents. Field names mirror the schema.org wire meaning; a handful of
 * aliases are modelled defensively so minor cross-tenant or future-version markup
 * drift never breaks the parser.
 */

/** A single sitemap entry pointing at an open role's detail page. */
export interface SnaphuntSitemapEntry {
  /** Job id parsed from `…/job/{jobId}`. Used as the ATS id. */
  jobId: string;
  /** Absolute tenant career-site detail URL (`https://{tenant}.snaphunt.com/job/…`). */
  url: string;
  /** ISO-ish `<lastmod>` value from the sitemap, when present. */
  lastmod?: string | null;
}

/** schema.org `PostalAddress` carried inside a `JobPosting.jobLocation`. */
export interface SnaphuntPostalAddress {
  /** City / town (e.g. "Sarasota"). */
  addressLocality?: string | null;
  /** State / region (e.g. "Florida"). */
  addressRegion?: string | null;
  /** Country code or name (e.g. "United States" / "US"). */
  addressCountry?: string | { name?: string | null } | null;
}

/** schema.org `Place` carried inside a `JobPosting.jobLocation`. */
export interface SnaphuntJobLocation {
  address?: SnaphuntPostalAddress | null;
}

/** schema.org `Organization` carried inside a `JobPosting.hiringOrganization`. */
export interface SnaphuntHiringOrganization {
  name?: string | null;
}

/** schema.org `PropertyValue` carried inside a `JobPosting.identifier`. */
export interface SnaphuntIdentifier {
  value?: string | number | null;
}

/**
 * schema.org `AdministrativeArea` / `Country` carried inside a
 * `JobPosting.applicantLocationRequirements` — used by remote roles to advertise
 * the eligible candidate location instead of a physical `jobLocation`.
 */
export interface SnaphuntLocationRequirement {
  name?: string | null;
}

/**
 * The schema.org `JobPosting` JSON-LD object embedded in a detail page. Only the
 * fields the adapter consumes are typed; everything is optional and defensively
 * narrowed at parse time, since the rendered payload varies by tenant.
 */
export interface SnaphuntJobPosting {
  '@type'?: string | string[] | null;
  title?: string | null;
  description?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  employmentType?: string | string[] | null;
  industry?: string | null;
  occupationalCategory?: string | null;
  /** Free-text "remote OK" flag schema.org uses for work-from-anywhere roles. */
  jobLocationType?: string | null;
  hiringOrganization?: SnaphuntHiringOrganization | string | null;
  jobLocation?: SnaphuntJobLocation | SnaphuntJobLocation[] | null;
  applicantLocationRequirements?:
    | SnaphuntLocationRequirement
    | SnaphuntLocationRequirement[]
    | null;
  identifier?: SnaphuntIdentifier | string | number | null;
  /** Canonical / apply URL when the JSON-LD advertises one. */
  url?: string | null;
}

/**
 * Normalised view of a single Snaphunt role, assembled from its sitemap entry and
 * its parsed canonical detail-page JSON-LD (with `og:` meta as fallbacks).
 */
export interface SnaphuntJob {
  /** Job id — used as the ATS id. */
  jobId: string;

  /** Absolute public tenant career-site detail / apply URL. */
  url: string;
  /** Canonical apex URL from JSON-LD `url` / `og:url`, when present. */
  canonicalUrl?: string | null;

  /** Job display title (from JSON-LD `title` / `og:title` / `<title>`). */
  title?: string | null;

  /** Per-job company display name (from `hiringOrganization.name`). */
  companyName?: string | null;

  /** Full job-ad body as HTML (from JSON-LD `description`). */
  descriptionHtml?: string | null;
  /** Plain-text body fallback (from `og:description`) when no HTML body exists. */
  description?: string | null;

  /** Structured location parts parsed from `jobLocation.address` / applicant requirement. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label (from JSON-LD `employmentType`). */
  employmentType?: string | null;

  /** Industry / category label (from JSON-LD `industry` / `occupationalCategory`). */
  department?: string | null;

  /** Posted date — `datePosted` from JSON-LD, else the sitemap `<lastmod>`. */
  datePosted?: string | null;

  /** True when the role advertises remote / work-from-anywhere. */
  isRemote?: boolean | null;
}

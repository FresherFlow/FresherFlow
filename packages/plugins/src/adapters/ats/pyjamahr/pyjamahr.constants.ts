/**
 * Constants for the PyjamaHR applicant-tracking / recruitment careers platform.
 *
 * PyjamaHR (pyjamahr.com, India / global) is a modern ATS whose candidate-facing
 * product is a hosted careers portal. Every customer tenant publishes a branded,
 * public, unauthenticated career site addressed by its company slug on the shared
 * careers host:
 *
 *   https://jobs.pyjamahr.com/{tenant}
 *
 * (the same portal is mirrored under `https://app.pyjamahr.com/careers/{tenant}`).
 * The portal is a client-rendered Next.js SPA, so the listing page carries no
 * server-side job links; the stable, crawlable public surface is a clean,
 * unauthenticated JSON API on `api.pyjamahr.com`, keyed by the tenant's
 * `company_slug`:
 *
 *  1. The paginated open-roles list:
 *
 *       GET https://api.pyjamahr.com/api/career/jobs/?company_slug={tenant}&page={n}
 *         → { "count": 11,
 *             "next": "…&page=2" | null,
 *             "previous": "…" | null,
 *             "results": [
 *               { "id": 51803, "slug": "senior-lead-social-commerce",
 *                 "title": "Senior Lead – Social Commerce",
 *                 "country": "India", "location": "Pune", "other_locations": [],
 *                 "department_name": null, "workplace_type": "REMOTE",
 *                 "min_experience": 10.0, "max_experience": 12.0 }, … ] }
 *
 *  2. The per-role detail object (full HTML body + metadata):
 *
 *       GET https://api.pyjamahr.com/api/career/jobs/{id}/?company_slug={tenant}
 *         → { "id": 51803, "uuid": "A0307EA6AA",
 *             "title": "Senior Lead – Social Commerce",
 *             "job_type": "FULLTIME",
 *             "description": "<div>…HTML body…</div>",
 *             "country": "India", "location": "Pune", "other_locations": [],
 *             "department_name": null, "remote": false,
 *             "workplace_type": "REMOTE", "seniority": ["mid-senior-level"],
 *             "created_at": "2023-08-04T21:10:39+05:30",
 *             "valid_through": "2023-10-03T21:10:39+05:30", "currency": "INR" }
 *
 * The list endpoint paginates (`count` / `next`), so we walk pages until we have
 * `resultsWanted` roles. An unknown tenant returns HTTP 200 with an empty
 * `results` array (not a 4xx), so it degrades naturally to an empty result. A
 * fetch error, an HTTP 4xx, a malformed detail object, or a single bad role
 * degrades to an empty / partial result rather than throwing, so a single bad
 * tenant never breaks a batch run.
 *
 * Surface confidence (researched + verified live 2026-06-03, no authentication):
 *  - Confirmed the platform + tenant addressing (`jobs.pyjamahr.com/{tenant}`,
 *    backed by `api.pyjamahr.com/api/career/jobs/?company_slug={tenant}`) and a
 *    real, named tenant on it: `jobscubicle` (Jobscubicle, 11 open roles).
 *  - Confirmed the live JSON wire shapes for both the list and the per-role detail
 *    endpoints (byte-level fields above), and the canonical public job URL
 *    `https://jobs.pyjamahr.com/{tenant}?job_uuid={id}` (verified=true).
 */

/** Public, unauthenticated JSON API origin backing every tenant careers portal. */
export const PYJAMAHR_API_BASE = 'https://api.pyjamahr.com';

/** Canonical public careers-portal host (candidate-facing SPA). */
export const PYJAMAHR_PORTAL_BASE = 'https://jobs.pyjamahr.com';

/** Root portal domain — used to recognise tenant hosts passed via `companyUrl`. */
export const PYJAMAHR_ROOT_DOMAIN = 'pyjamahr.com';

/** Public open-roles list endpoint (paginated; keyed by `company_slug`). */
export const PYJAMAHR_JOBS_PATH = '/api/career/jobs/';

/**
 * Default internal results cap. Mirrors the sibling ATS adapters: the public DTO
 * default is small, but when a caller omits `resultsWanted` entirely we ingest
 * up to 100 of the tenant's open roles.
 */
export const PYJAMAHR_DEFAULT_RESULTS = 100;

/**
 * Hard ceiling on list pages walked per scrape, so a pathological `next` chain (or
 * a very large tenant with a high `resultsWanted`) can never spin unbounded.
 */
export const PYJAMAHR_MAX_PAGES = 50;

/** Default request headers. The API expects a browser-like UA + JSON Accept. */
export const PYJAMAHR_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Detects remote / home-working roles across the title, location, and workplace fields. */
export const PYJAMAHR_REMOTE_REGEX =
  /\b(remote|home[\s-]?(?:based|working)|work\s*from\s*home|wfh|telecommute|fully\s*remote)\b/i;

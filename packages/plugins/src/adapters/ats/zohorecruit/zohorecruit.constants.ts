/**
 * Constants for the Zoho Recruit career-site platform.
 *
 * Zoho Recruit hosts public hiring "career sites" for staffing agencies and
 * employers. Every tenant exposes the same public careers page under one of a
 * few datacenter-specific host shapes:
 *   - `https://{slug}.zohorecruit.com`   — US datacenter (default / most tenants)
 *   - `https://{slug}.zohorecruit.eu`    — EU datacenter
 *   - `https://{slug}.zohorecruit.in`    — IN datacenter
 *
 * The public careers listing page (`/jobs/Careers`) is server-rendered: the full
 * list of open positions is embedded in the page as an HTML-entity-encoded JSON
 * array inside a hidden `<input id="jobs" value="[ ... ]">` element. Every entry
 * carries the Zoho `Job_Openings` module fields (`Posting_Title`, `id`,
 * `City`/`State`/`Country`, `Date_Opened`, `Job_Description`, `Remote_Job`,
 * `Job_Type`, …). This payload is reachable WITHOUT authentication, so we read it
 * directly rather than hitting the OAuth-gated REST API.
 */

/** Host template for the default US datacenter; `{slug}` is substituted at runtime. */
export const ZOHORECRUIT_HOST_TEMPLATE = 'https://{slug}.zohorecruit.com';

/** Public career-site listing path. The jobs array is embedded in the rendered HTML. */
export const ZOHORECRUIT_CAREERS_PATH = '/jobs/Careers';

/**
 * The hidden input element id whose `value` attribute holds the entity-encoded
 * JSON array of open positions on the rendered careers page.
 */
export const ZOHORECRUIT_JOBS_INPUT_ID = 'jobs';

/** Job-detail URL template; `{host}`, `{id}` and `{slug}` are substituted at runtime. */
export const ZOHORECRUIT_JOB_URL_TEMPLATE = '{host}/jobs/Careers/{id}/{slug}';

/** Default request headers. Zoho expects a browser-like UA to render the careers page. */
export const ZOHORECRUIT_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

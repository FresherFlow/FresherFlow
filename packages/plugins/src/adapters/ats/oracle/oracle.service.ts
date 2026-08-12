import {
  IScraper,
  JobPostDto,
  JobResponseDto,
  LocationDto,
  ScraperInputDto,
  Site,
} from '../../../base/models/index.js';
import { createHttpClient } from '../../../common/index.js';
import {
  ORACLE_DEFAULT_EXPAND,
  ORACLE_DEFAULT_FACETS,
  ORACLE_DEFAULT_RESULTS_WANTED,
  ORACLE_DEFAULT_SITE_NUMBER,
  ORACLE_DEFAULT_SORT_BY,
  ORACLE_ERR_BAD_TENANT,
  ORACLE_ERR_FINDER_REJECTED,
  ORACLE_FINDER_NAME,
  ORACLE_HEADERS,
  ORACLE_MAX_PAGES,
  ORACLE_RECORDS_PER_PAGE,
  ORACLE_REST_PATH,
} from './oracle.constants';
import {
  OracleJobsResponse,
  OracleRequisition,
  OracleTenantContext,
} from './oracle.types';

/**
 * Spec 013 / T03 — Oracle HCM Cloud REST + finder-string scraper.
 *
 * Works against any Oracle Recruiting Cloud (Oracle HCM
 * CandidateExperience) tenant. URL pattern:
 * `https://{subdomain}.fa.{region}.oraclecloud.com`.
 *
 * Tenant resolution (Spec 013 / FR-3, decision-boundary line in
 * tasks.md "Notes for the next run"):
 *   1. `input.companyUrl` (full URL override) is canonical.
 *   2. `input.companySlug` (e.g. `eeho-us2`) is composed to
 *      `https://<subdomain>.fa.<region>.oraclecloud.com` only when
 *      `companyUrl` is absent.
 *   3. If neither is supplied, the scrape returns an empty
 *      `JobResponseDto` with sentinel `ERR_ORACLE_BAD_TENANT`.
 *
 * Wire format (Spec 013 / FR-2 — matches upstream Python's exact
 * separator scheme inside
 * `OTHERS/Ats-scrapers/oracle/scripts/oracle_ats_client/api_client.py`):
 *   - Outer query string: `?onlyData=true&expand=<…>&finder=findReqs;<finder-string>`
 *   - Inner finder string: `siteNumber=CX_45001,facetsList=<facets>,limit=100,offset=N,sortBy=POSTING_DATES_DESC`
 *     (commas between params, semicolons between facets — the live
 *     Oracle API rejects the all-semicolon variant suggested by
 *     spec.md / FR-2; we follow the upstream Python's wire format
 *     which is known to work against the production endpoint.
 *     Decision logged in spec.md § 10.)
 *   - `offset=` is omitted on the first page (offset=0) to match
 *     upstream Python's conditional append.
 *
 * Pagination (FR-2):
 *   - Increment `offset` by `100` (= `ORACLE_RECORDS_PER_PAGE`)
 *     until `requisitionList[]` empty OR `resultsWanted` cap reached.
 *   - Hard ceiling at `ORACLE_MAX_PAGES` (50) prevents runaway loops.
 *
 * Error handling (FR-12 / `AGENTS.md §10`):
 *   - Any thrown HTTP error is caught; service logs at `warn` with
 *     the matching sentinel code (`ERR_ORACLE_BAD_TENANT` or
 *     `ERR_ORACLE_FINDER_REJECTED`) and returns whatever has been
 *     collected so far (empty `JobResponseDto` on the first page).
 *   - The aggregator's circuit breaker (Spec 005 / FR-1) sees the
 *     successful resolution and will not trip from a single bad
 *     tenant.
 */
export class OracleService implements IScraper {
  

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const tenant = this.resolveTenant(input);
    if (!tenant) {
      console.warn(
        `OracleService: ${ORACLE_ERR_BAD_TENANT} — both companyUrl and companySlug unset`,
      );
      return new JobResponseDto([]);
    }

    const resultsWanted =
      input.resultsWanted ?? ORACLE_DEFAULT_RESULTS_WANTED;
    const siteNumber =
      input.siteNumber?.trim() || ORACLE_DEFAULT_SITE_NUMBER;

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      requestTimeout: input.requestTimeout,
    });
    client.setHeaders(ORACLE_HEADERS);

    const collected: OracleRequisition[] = [];

    for (let page = 0; page < ORACLE_MAX_PAGES; page++) {
      if (collected.length >= resultsWanted) break;

      const offset = page * ORACLE_RECORDS_PER_PAGE;
      const url = this.buildPageUrl(tenant.baseUrl, siteNumber, offset);

      let payload: OracleJobsResponse;
      try {
        const response = await client.get<OracleJobsResponse>(url);
        payload = (response.data ?? {}) as OracleJobsResponse;
      } catch (err: any) {
        const status = err?.response?.status;
        const code =
          status && status >= 400 && status < 500
            ? ORACLE_ERR_FINDER_REJECTED
            : ORACLE_ERR_BAD_TENANT;
        console.warn(
          `OracleService: ${code} — page fetch failed (${tenant.domain} offset=${offset}, status=${status ?? 'n/a'}): ${err?.message ?? err}`,
        );
        break;
      }

      const requisitions = this.extractRequisitions(payload);
      if (requisitions.length === 0) {
        console.log(
          `OracleService: empty page at offset=${offset} for ${tenant.domain}`,
        );
        break;
      }

      for (const req of requisitions) {
        if (collected.length >= resultsWanted) break;
        collected.push(req);
      }

      if (requisitions.length < ORACLE_RECORDS_PER_PAGE) break;
    }

    const jobs: JobPostDto[] = collected.map((r) =>
      this.toJobPost(r, tenant, siteNumber),
    );
    console.log(
      `OracleService: ${jobs.length} jobs from ${tenant.domain} (resultsWanted=${resultsWanted}, siteNumber=${siteNumber})`,
    );
    return new JobResponseDto(jobs);
  }

  /** Resolve `companyUrl` / `companySlug` into an `OracleTenantContext`. */
  private resolveTenant(
    input: ScraperInputDto,
  ): OracleTenantContext | null {
    const fromUrl = input.companyUrl?.trim();
    if (fromUrl) {
      try {
        return this.tenantFromUrl(fromUrl);
      } catch (err: any) {
        console.warn(
          `OracleService: invalid companyUrl=${fromUrl} — ${err?.message}; trying companySlug fallback`,
        );
      }
    }

    const slug = input.companySlug?.trim();
    if (slug) {
      const composed = this.composeUrlFromSlug(slug);
      if (composed) {
        try {
          return this.tenantFromUrl(composed);
        } catch (err: any) {
          console.warn(
            `OracleService: composed URL ${composed} invalid — ${err?.message}`,
          );
        }
      }
    }

    return null;
  }

  /**
   * Compose a tenant URL from a `<subdomain>-<region>` slug. Returns
   * `null` if the slug doesn't carry both halves — Oracle requires
   * BOTH the careers-site subdomain AND the cloud region.
   */
  private composeUrlFromSlug(slug: string): string | null {
    const lastDash = slug.lastIndexOf('-');
    if (lastDash <= 0 || lastDash === slug.length - 1) return null;
    const subdomain = slug.slice(0, lastDash);
    const region = slug.slice(lastDash + 1);
    return `https://${subdomain}.fa.${region}.oraclecloud.com`;
  }

  /** Build a tenant context from any Oracle-shaped URL. */
  private tenantFromUrl(rawUrl: string): OracleTenantContext {
    const parsed = new URL(rawUrl);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    const domain = parsed.host;
    const companyName = this.extractCompanyName(domain);
    return { baseUrl, domain, companyName };
  }

  /**
   * `eeho.fa.us2.oraclecloud.com` → `Eeho` (first hostname segment).
   * Best-effort fallback used only when `requisition.EmployerName` is
   * absent. Real Oracle tenants nearly always populate `EmployerName`.
   */
  private extractCompanyName(domain: string): string {
    const head = domain.split('.')[0] ?? domain;
    return head
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Build the per-page URL using upstream Python's exact wire format. */
  private buildPageUrl(
    baseUrl: string,
    siteNumber: string,
    offset: number,
  ): string {
    const facetsStr = ORACLE_DEFAULT_FACETS.join(';');

    const finderParams: string[] = [
      `siteNumber=${siteNumber}`,
      `facetsList=${facetsStr}`,
      `limit=${ORACLE_RECORDS_PER_PAGE}`,
    ];
    if (offset > 0) {
      finderParams.push(`offset=${offset}`);
    }
    finderParams.push(`sortBy=${ORACLE_DEFAULT_SORT_BY}`);

    const finderString = finderParams.join(',');

    const queryString =
      `?onlyData=true` +
      `&expand=${ORACLE_DEFAULT_EXPAND}` +
      `&finder=${ORACLE_FINDER_NAME};${finderString}`;

    return `${baseUrl}${ORACLE_REST_PATH}${queryString}`;
  }

  /** Pull `requisitionList[]` out of `response.items[0]`. */
  private extractRequisitions(
    payload: OracleJobsResponse,
  ): OracleRequisition[] {
    const wrapper = payload?.items?.[0];
    return wrapper?.requisitionList ?? [];
  }

  /** Map a single requisition into the canonical `JobPostDto`. */
  private toJobPost(
    req: OracleRequisition,
    tenant: OracleTenantContext,
    siteNumber: string,
  ): JobPostDto {
    const location = req.PrimaryLocation
      ? new LocationDto({ city: req.PrimaryLocation })
      : null;
    const isRemote =
      req.PrimaryLocation?.toLowerCase().includes('remote') ?? false;

    const jobUrl = this.buildJobUrl(req, tenant.baseUrl, siteNumber);

    return new JobPostDto({
      id: `oracle-${req.Id}`,
      title: req.Title,
      companyName: req.EmployerName ?? tenant.companyName,
      jobUrl,
      location,
      isRemote,
      site: Site.ORACLE,
      atsId: req.Id,
      atsType: 'oracle',
      datePosted: req.PostedDate ?? null,
    });
  }

  /**
   * Build a job-detail URL using the Oracle CandidateExperience path:
   * `/hcmUI/CandidateExperience/en/sites/{siteNumber}/job/{id}`
   *
   * This matches the actual URLs that Oracle tenants serve to candidates
   * (e.g. jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/job/210775289).
   * Falls back to `ExternalUrl` if the tenant provides one.
   */
  private buildJobUrl(
    req: OracleRequisition,
    baseUrl: string,
    siteNumber: string,
  ): string {
    if (req.ExternalUrl) return req.ExternalUrl;
    const jobId = req.RequisitionNumber ?? req.Id;
    return `${baseUrl}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${jobId}`;
  }
}

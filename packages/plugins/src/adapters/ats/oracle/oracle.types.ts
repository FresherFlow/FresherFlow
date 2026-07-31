/**
 * Spec 013 / T03 — Oracle HCM Cloud internal types.
 *
 * Mirrors the JSON envelope returned by
 * `/hcmRestApi/resources/latest/recruitingCEJobRequisitions`. Keeping
 * the types in a dedicated file lets the unit tests (T04) import the
 * same shape when constructing fixtures without re-declaring it.
 *
 * Field set is INTENTIONALLY narrow — only the fields we map into
 * `JobPostDto` are typed. Upstream returns ~30 additional fields
 * (compensation ranges, flex fields, hiring-manager IDs) that we
 * deliberately skip for this batch; detail-page enrichment is
 * deferred to candidate Spec 016.
 */

/** Single requisition entry inside `requisitionList[]`. */
export interface OracleRequisition {
  /** Stable ID used for `JobPostDto.id` / `(site, externalId)` (FR-20). */
  Id: string;
  /** Job title. */
  Title: string;
  /** Primary location string as returned by upstream (e.g. `"Austin, TX, United States"`). */
  PrimaryLocation?: string | null;
  /** ISO-8601 date string (e.g. `"2025-12-19"`) — mapped to `JobPostDto.datePosted`. */
  PostedDate?: string | null;
  /** Custom-domain employer name (e.g. `"City of Atlanta"`). Falls back to the resolved tenant's `companyName` when unset. */
  EmployerName?: string | null;
  /** Optional canonical apply URL exposed by some tenants. */
  ExternalUrl?: string | null;
  /** Some tenants use this slug for the SEO-friendly job-detail URL. */
  ExternalUrlSeo?: string | null;
  /** Requisition number — alternate ID some Oracle tenants prefer for their UI links. */
  RequisitionNumber?: string | null;
}

/** Wrapper object — `response.items[0]`. */
export interface OracleRequisitionWrapper {
  /** Total job count across all pages (used for diagnostic logs only). */
  TotalJobsCount?: number;
  /** Page slice — empty when pagination has caught up. */
  requisitionList?: OracleRequisition[];
}

/** Top-level JSON envelope returned by the Oracle finder endpoint. */
export interface OracleJobsResponse {
  items?: OracleRequisitionWrapper[];
}

/** Resolved tenant metadata used by `OracleService` to build finder URLs. */
export interface OracleTenantContext {
  /** Base URL (no trailing slash). E.g. `https://eeho.fa.us2.oraclecloud.com`. */
  baseUrl: string;
  /** Bare hostname without scheme — used in logs. */
  domain: string;
  /** Display-cased fallback company name extracted from the hostname. */
  companyName: string;
}

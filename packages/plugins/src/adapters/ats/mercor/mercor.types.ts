/**
 * Spec 013 / T05 — Mercor internal types.
 *
 * Mirrors the JSON envelope returned by
 * `https://aws.api.mercor.com/work/listings-explore-page`. Keeping the
 * types in a dedicated file lets the unit tests (T06) import the same
 * shape when constructing fixtures without re-declaring it.
 *
 * Field set is INTENTIONALLY narrow — only the fields we map into
 * `JobPostDto` are typed. Upstream returns ~25 additional fields
 * (skill tags, screening-question schemas, contract-template
 * references, talent-marketplace ranking signals) that we deliberately
 * skip for this batch; detail-page enrichment is deferred to candidate
 * Spec 016.
 */

/** Single explore-page listing entry inside `listings[]`. */
export interface MercorListing {
  /** Stable ID used for `JobPostDto.id` / `(site, externalId)` (FR-20). */
  listingId: string;
  /** Job title. */
  title: string;
  /** Company name as displayed (e.g. `"Stripe"`). Drives FR-7 post-filter and `JobPostDto.companyName`. */
  companyName?: string | null;
  /** Free-text location string as returned by upstream (e.g. `"Remote"`, `"San Francisco, CA"`). */
  location?: string | null;
  /** ISO-8601 timestamp string — mapped to `JobPostDto.datePosted`. */
  postedAt?: string | null;
  /** Compensation lower-bound (numeric, currency = USD per upstream's marketplace baseline). */
  rateMin?: number | null;
  /** Compensation upper-bound. */
  rateMax?: number | null;
  /** Pay-rate frequency — one of `"hourly" | "monthly" | "yearly"` per upstream's enum. */
  payRateFrequency?: string | null;
  /** Listing-domain hint (e.g. `"engineering"`, `"design"`). Optional; upstream does not always populate. */
  listingDomain?: string | null;
  /** Engagement type (e.g. `"contract"`, `"full-time"`). Optional. */
  commitment?: string | null;
}

/** Top-level JSON envelope returned by the explore-page endpoint. */
export interface MercorListingsResponse {
  /** Listings array. May be omitted entirely on backend errors — handled via the `ERR_MERCOR_ENVELOPE` sentinel. */
  listings?: MercorListing[];
}

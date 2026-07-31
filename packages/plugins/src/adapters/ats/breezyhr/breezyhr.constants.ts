/** Build the BreezyHR public company job-list endpoint (sparse, no body). */
export function breezyListUrl(companySlug: string): string {
  return `https://${companySlug}.breezy.hr/json`;
}

/**
 * Build the BreezyHR public per-job detail page URL. The page is HTML, but it
 * embeds a schema.org `JobPosting` ld+json block that carries the posting body
 * (the list endpoint does not). There is no plain per-job JSON endpoint — the
 * `/json/{id}` variants 302-redirect to the company root.
 */
export function breezyDetailUrl(companySlug: string, friendlyId: string): string {
  return `https://${companySlug}.breezy.hr/p/${friendlyId}`;
}

/** Bounded concurrency for per-job detail-page fetches. */
export const BREEZYHR_DETAIL_CONCURRENCY = 5;

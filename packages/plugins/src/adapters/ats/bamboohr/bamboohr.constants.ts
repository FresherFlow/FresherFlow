/** BambooHR public careers list endpoint (slug interpolated at runtime) */
export const BAMBOOHR_CAREERS_URL = 'https://{slug}.bamboohr.com/careers/list';

/** Build the BambooHR public careers list endpoint (sparse, no posting body). */
export function bamboohrListUrl(companySlug: string): string {
  return `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/list`;
}

/**
 * Build the BambooHR public per-job detail endpoint. The list feed omits the
 * posting body, compensation, and datePosted; those live only here (under
 * `result.jobOpening`).
 */
export function bamboohrDetailUrl(
  companySlug: string,
  jobId: string | number,
): string {
  return `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/${encodeURIComponent(String(jobId))}/detail`;
}

/** Bounded concurrency for per-job detail fetches. */
export const BAMBOOHR_DETAIL_CONCURRENCY = 5;

/** Default headers for BambooHR careers requests */
export const BAMBOOHR_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

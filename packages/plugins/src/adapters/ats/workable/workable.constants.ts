/** Workable widget API base URL (public job list, sparse fields) */
export const WORKABLE_API_URL = 'https://apply.workable.com/api/v1/widget/accounts';

/** Workable public per-job detail API base URL (rich body + workplace mode) */
export const WORKABLE_DETAIL_API_URL = 'https://apply.workable.com/api/v2/accounts';

/** Bounded concurrency for per-job detail fetches */
export const WORKABLE_DETAIL_CONCURRENCY = 5;

/** Build the public detail endpoint URL for a single job. */
export function workableDetailUrl(companySlug: string, shortcode: string): string {
  return `${WORKABLE_DETAIL_API_URL}/${encodeURIComponent(companySlug)}/jobs/${encodeURIComponent(shortcode)}`;
}

/** Default headers for Workable API requests */
export const WORKABLE_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

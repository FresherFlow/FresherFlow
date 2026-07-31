/**
 * Jobvite public career site JSON feed endpoint.
 * The slug is interpolated at runtime: /api/v2/job-feed/{companyId}
 */
export const JOBVITE_API_URL = 'https://jobs.jobvite.com/api/v2/job-feed';

/**
 * Jobvite official authenticated API endpoint.
 * Requires API key + secret as query parameters.
 * @see https://developer.jobvite.com
 */
export const JOBVITE_OFFICIAL_API_URL = 'https://api.jobvite.com/api/v2/job';

/** Default headers for Jobvite career page requests */
export const JOBVITE_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

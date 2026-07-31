/** Freshteam API URL pattern (companySlug is interpolated at runtime) */
export const FRESHTEAM_API_BASE = 'https://{slug}.freshteam.com/api/job_postings';

/** Default headers for Freshteam API requests */
export const FRESHTEAM_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

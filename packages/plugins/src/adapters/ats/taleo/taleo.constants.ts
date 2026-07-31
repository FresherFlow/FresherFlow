/**
 * Oracle Taleo uses company-specific subdomains. The URL pattern is:
 *   https://{company}.taleo.net/careersection/rest/jobboard/searchjobs
 *
 * The company slug format for Taleo is: {company}:{careersection}
 * e.g., "oracle:oraclecareerssection" or "ibm:ExternalCareerSite"
 */

/** Default page size for Taleo pagination */
export const TALEO_PAGE_SIZE = 25;

/** Minimum delay between Taleo requests (ms) */
export const TALEO_DELAY_MIN = 2000;

/** Maximum delay between Taleo requests (ms) */
export const TALEO_DELAY_MAX = 4000;

/** Default headers for Taleo API requests */
export const TALEO_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/**
 * Parse a Taleo compound slug into its components.
 * Format: "{company}:{careerSection}"
 * Defaults: careerSection=ExternalCareerSite
 */
export function parseTaleoSlug(slug: string): {
  company: string;
  careerSection: string;
} {
  const parts = slug.split(':');
  return {
    company: parts[0],
    careerSection: parts[1] ?? 'ExternalCareerSite',
  };
}

/**
 * Build the Taleo search API URL for a given company.
 */
export function buildTaleoSearchUrl(company: string): string {
  return `https://${company}.taleo.net/careersection/rest/jobboard/searchjobs`;
}

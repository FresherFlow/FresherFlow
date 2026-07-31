/**
 * SAP SuccessFactors uses a public OData API for job postings.
 *
 * Company slug format: {instance}:{companyId}
 * e.g., "sap:SAP" or "successfactors:CompanyXYZ"
 *
 * OData API:
 *   https://{instance}.successfactors.com/odata/v2/JobRequisitionPosting
 *   Supports $filter, $select, $top, $skip, $orderby params
 *
 * HTML fallback:
 *   https://{instance}.successfactors.com/career?company={companyId}&keyword={term}
 */

/** Default page size for SuccessFactors OData pagination */
export const SF_PAGE_SIZE = 20;

/** Minimum delay between SuccessFactors requests (ms) */
export const SF_DELAY_MIN = 1500;

/** Maximum delay between SuccessFactors requests (ms) */
export const SF_DELAY_MAX = 3000;

/** Default headers for SuccessFactors API requests */
export const SF_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/**
 * Parse a SuccessFactors compound slug into its components.
 * Format: "{instance}:{companyId}"
 * Defaults: companyId = instance name
 */
export function parseSfSlug(slug: string): {
  instance: string;
  companyId: string;
} {
  const parts = slug.split(':');
  return {
    instance: parts[0],
    companyId: parts[1] ?? parts[0],
  };
}

/**
 * Build the SuccessFactors OData API URL for a given instance.
 */
export function buildSfODataUrl(instance: string): string {
  return `https://${instance}.successfactors.com/odata/v2/JobRequisitionPosting`;
}

/**
 * Build the SuccessFactors HTML career page URL.
 */
export function buildSfCareerUrl(
  instance: string,
  companyId: string,
  keyword?: string,
): string {
  let url = `https://${instance}.successfactors.com/career?company=${encodeURIComponent(companyId)}`;
  if (keyword) {
    url += `&keyword=${encodeURIComponent(keyword)}`;
  }
  return url;
}

/**
 * Bullhorn REST API base URL pattern.
 * `{cls}` is the cluster number and `{corpToken}` is the company token.
 * The companySlug format is `{cls}:{corpToken}`.
 *
 * @see https://bullhorn.github.io/rest-api-docs/
 */
export const BULLHORN_API_BASE =
  'https://public-rest{cls}.bullhornstaffing.com/rest-services/{corpToken}/search/JobOrder';

/** Default query parameters for Bullhorn job search */
export const BULLHORN_DEFAULT_FIELDS =
  'id,title,publicDescription,address,dateAdded,salary,salaryUnit,employmentType,categories';

/** Default headers for Bullhorn API requests */
export const BULLHORN_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

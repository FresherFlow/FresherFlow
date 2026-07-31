/** SmartRecruiters API base URL */
export const SMARTRECRUITERS_API_URL = 'https://api.smartrecruiters.com/v1/companies';

/** Default headers for SmartRecruiters API requests */
export const SMARTRECRUITERS_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/** Default page size for paginated requests */
export const SMARTRECRUITERS_PAGE_SIZE = 100;

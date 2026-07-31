export const GLASSDOOR_HEADERS: Record<string, string> = {
  authority: 'www.glassdoor.com',
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  origin: 'https://www.glassdoor.com',
  referer: 'https://www.glassdoor.com/',
  'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export const FALLBACK_CSRF_TOKEN = 'test-csrf-token';

export const GD_JOB_SEARCH_QUERY = `
query JobSearchQuery(
  $keyword: String
  $locationId: Int
  $locationType: LocationTypeEnum
  $numPerPage: Int
  $pageCursor: String
  $filterParams: [FilterParamInput]
  $originalPageUrl: String
  $seoUrl: Boolean
) {
  jobListings(
    contextHolder: {
      searchParams: {
        keyword: $keyword
        locationId: $locationId
        locationType: $locationType
        numPerPage: $numPerPage
        pageCursor: $pageCursor
        filterParams: $filterParams
        originalPageUrl: $originalPageUrl
        seoUrl: $seoUrl
      }
    }
  ) {
    companyFilterOptions { id shortName }
    filterOptions { filterKey options { id label } }
    indeedCtk
    jobListingSeoLinks { linkItems { position url } }
    paginationCursors { cursor pageNumber }
    indexablePageCount
    searchResultsMetadata {
      searchCriteria { keyword impliedKeyword locationId locationType pageNumber seoFriendlyUrlInput }
      footerVO { countryMenu { childNavigationLinks { id link textKey } } }
      helpCenterDomain helpCenterLocale searchId
    }
    jobListings {
      jobview {
        header {
          adOrderId adOrderSponsorshipLevel ageInDays divisionEmployerName easyApply employer { id name shortName }
          employerNameFromSearch goc jobCountryId jobLink jobResultTrackingKey jobTitleId jobTitleText locId
          locationName locationType lowQualityApply payCurrency payPeriod payPeriodAdjustedPay { p10 p50 p90 }
          rating savedJobId seoJobLink sponsored normalizedJobTitle
        }
        job { descriptionFragments importConfigId jobTitleId jobTitleText listingId }
        overview { id name shortName squareLogoUrl }
      }
    }
  }
}`;

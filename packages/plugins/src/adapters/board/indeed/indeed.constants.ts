export const INDEED_HEADERS: Record<string, string> = {
  Host: 'apis.indeed.com',
  accept: 'application/json',
  'indeed-api-key': '161092c2017b5bbab13edb12461a62d5a833871e7c7571571571de7161a3b1d3',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'content-type': 'application/json',
};

export const JOB_SEARCH_QUERY = `
query GetJobData($what: String, $location: String, $cursor: String, $dateOnSiteFrom: DateInput, $radius: Int, $fromAge: String, $seoFriendlyToken: String, $filters: [SearchFilterInput!]) {
  jobSearch(
    what: $what
    location: { where: $location, radius: $radius, radiusUnit: MILES }
    cursor: $cursor
    sort: DATE
    limit: 100
    dateOnSiteFrom: $dateOnSiteFrom
    fromage: $fromAge
    seoFriendlyToken: $seoFriendlyToken
    filters: $filters
  ) {
    pageInfo { nextCursor }
    results {
      trackingKey
      job {
        source { name }
        key
        title
        dateOnSite
        datePublished
        description { html }
        location { formatted { long } city state country countryCode postalCode }
        attributes { label key }
        compensation { baseSalary { unitOfWork range { ... on Range { min max } } } estimated { baseSalary { unitOfWork range { ... on Range { min max } } } } formattedRange currencyCode }
        employer { dpiUrl name companyProfile { pageUrl images { squareLogoUrl bannerUrl } description overview { revenue employeeCount industryName } locations } relatedJobs(limit: 0) { totalCount } }
      }
    }
  }
}`;

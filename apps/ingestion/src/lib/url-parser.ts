export interface ParsedJobUrl {
  ats: string;
  slug: string; // The company slug
  url: string;
}

export function parseJobUrl(urlStr: string): ParsedJobUrl | null {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;
    
    // Lever: https://jobs.lever.co/company-slug/job-id
    if (hostname === 'lever.co' || hostname.endsWith('.lever.co')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        return { ats: 'lever', slug: parts[0], url: urlStr };
      }
    }
    
    // Greenhouse: https://boards.greenhouse.io/company-slug/jobs/job-id
    if (hostname === 'greenhouse.io' || hostname.endsWith('.greenhouse.io')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        return { ats: 'greenhouse', slug: parts[0], url: urlStr };
      }
    }
    
    // Ashby: https://jobs.ashbyhq.com/company-slug/job-id
    if (hostname === 'ashbyhq.com' || hostname.endsWith('.ashbyhq.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        return { ats: 'ashby', slug: parts[0], url: urlStr };
      }
    }
    
    // SmartRecruiters: https://careers.smartrecruiters.com/company-slug/job-id
    if (hostname === 'smartrecruiters.com' || hostname.endsWith('.smartrecruiters.com')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 1) {
        return { ats: 'smartrecruiters', slug: parts[0], url: urlStr };
      }
    }
    
    // Workday: https://company-slug.wd1.myworkdayjobs.com/...
    if (hostname === 'myworkdayjobs.com' || hostname.endsWith('.myworkdayjobs.com')) {
      const subdomain = hostname.split('.')[0];
      if (subdomain) {
        return { ats: 'workday', slug: subdomain, url: urlStr };
      }
    }
    
    return null;
  } catch (e) {
    console.error(`[URL Parser] Failed to parse URL: ${urlStr}`);
    return null;
  }
}

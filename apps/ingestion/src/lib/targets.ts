export interface IngestionTarget {
  company: string;
  ats: string;
  slug: string;
  resultsWanted?: number;
  hoursOld?: number;
  filter?: boolean;
}

export const COMPANY_SCRAPER_TARGETS: IngestionTarget[] = [
  { company: 'Google', ats: 'google', slug: 'google', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Amazon', ats: 'amazon', slug: 'amazon', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Microsoft', ats: 'microsoft', slug: 'microsoft', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Apple', ats: 'apple', slug: 'apple', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Meta', ats: 'meta', slug: 'meta', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Uber', ats: 'uber', slug: 'uber', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Stripe', ats: 'stripe', slug: 'stripe', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'IBM', ats: 'ibm', slug: 'ibm', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Nvidia', ats: 'nvidia', slug: 'nvidia', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Razorpay', ats: 'greenhouse', slug: 'razorpaysoftwareprivatelimited', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'CRED', ats: 'lever', slug: 'cred', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Urban Company', ats: 'lever', slug: 'urbancompany', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Canonical', ats: 'greenhouse', slug: 'canonical', resultsWanted: 50, hoursOld: 336, filter: true }
];

export const BOARD_SCRAPER_TARGETS: IngestionTarget[] = [
  { company: 'LinkedIn Jobs', ats: 'linkedin', slug: 'linkedin', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Naukri', ats: 'naukri', slug: 'naukri', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Indeed', ats: 'indeed', slug: 'indeed', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Glassdoor', ats: 'glassdoor', slug: 'glassdoor', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Internshala', ats: 'internshala', slug: 'internshala', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'HackerNews Who is Hiring', ats: 'hackernews', slug: 'hackernews', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Wellfound (AngelList)', ats: 'wellfound', slug: 'wellfound', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'RemoteOK', ats: 'remoteok', slug: 'remoteok', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'We Work Remotely', ats: 'weworkremotely', slug: 'weworkremotely', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Hasjob', ats: 'hasjob', slug: 'hasjob', resultsWanted: 50, hoursOld: 336, filter: true },
  { company: 'Bayt', ats: 'bayt', slug: 'bayt', resultsWanted: 50, hoursOld: 336, filter: true }
];

export const DEFAULT_INGESTION_TARGETS: IngestionTarget[] = [
  ...COMPANY_SCRAPER_TARGETS,
  ...BOARD_SCRAPER_TARGETS
];

export async function loadDefaultTargets(): Promise<IngestionTarget[]> {
  return [...DEFAULT_INGESTION_TARGETS];
}

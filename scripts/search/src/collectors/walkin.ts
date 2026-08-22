import { BOARD_SCRAPER_REGISTRY, ScraperInputDto, AtsJob } from '@fresherflow/plugins';
import { parseWalkInDetails, matchHyderabadCluster, ParsedWalkInDetails, MatchedClusterResult } from '@fresherflow/domain';

export interface WalkInJobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  city: string;
  cluster: MatchedClusterResult;
  walkInDetails: ParsedWalkInDetails;
  applyLink: string;
  source: string;
  postedAt: string;
}

export async function collectHyderabadWalkinDrives(options: {
  resultsPerQuery?: number;
  hoursOld?: number;
} = {}): Promise<WalkInJobOpportunity[]> {
  console.log(`\n======================================================`);
  console.log(`🗺️ STARTING HYDERABAD WALK-IN DRIVE DISCOVERY SWEEP`);
  console.log(`======================================================`);

  const walkinOpportunities: WalkInJobOpportunity[] = [];
  const seenUrls = new Set<string>();
  const limit = options.resultsPerQuery ?? 10;

  const queries = [
    'walkin fresher',
    'walk-in interview',
    'walk in drive',
    'walkin software engineer',
    'walkin technical support',
    'walkin graduate engineer trainee',
  ];

  const linkedinScraper = BOARD_SCRAPER_REGISTRY['linkedin'];

  for (const query of queries) {
    console.log(`\n🔍 Searching Walk-in drives for: "${query}" in Hyderabad...`);

    if (linkedinScraper) {
      try {
        const res = await linkedinScraper.scrape(
          new ScraperInputDto({
            searchTerm: query,
            location: 'Hyderabad',
            resultsWanted: limit,
            hoursOld: options.hoursOld,
          })
        );

        for (const job of res?.jobs || []) {
          if (!job.jobUrl || seenUrls.has(job.jobUrl)) continue;
          seenUrls.add(job.jobUrl);

          const title = job.title || 'Walk-in Drive';
          const company = job.companyName || 'Unknown Company';
          const desc = job.description || '';
          const location = job.location?.displayLocation() || 'Hyderabad, Telangana, India';

          // Parse Walk-in specific details
          const walkInDetails = parseWalkInDetails(title, desc, location);

          // Geocode to Hyderabad IT cluster
          const cluster = matchHyderabadCluster(`${walkInDetails.venueAddress} ${desc} ${title}`);

          const walkinJob: WalkInJobOpportunity = {
            id: job.id || `walkin-${Math.random().toString(36).slice(2, 9)}`,
            title,
            company,
            location,
            city: 'Hyderabad',
            cluster,
            walkInDetails,
            applyLink: job.jobUrl,
            source: 'LinkedIn Walk-in',
            postedAt: job.datePosted ? String(job.datePosted) : new Date().toISOString(),
          };

          walkinOpportunities.push(walkinJob);
        }

        console.log(`  └─ [LinkedIn] Found ${res?.jobs?.length || 0} candidates for "${query}"`);
      } catch (err: any) {
        console.warn(`  └─ [LinkedIn] Error for "${query}": ${err.message}`);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL HYDERABAD WALKIN DRIVES DISCOVERED: ${walkinOpportunities.length}`);
  console.log(`======================================================\n`);

  return walkinOpportunities;
}

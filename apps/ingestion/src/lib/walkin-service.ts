import { BOARD_SCRAPER_REGISTRY, ScraperInputDto } from '@fresherflow/plugins';
import { parseWalkInDetails, matchHyderabadCluster } from '@fresherflow/utils';
import { upsertJobs, startRun, finishRun } from '@fresherflow/pipeline';

export interface WalkinSearchInput {
  city?: string;
  hoursOld?: number;
  resultsWanted?: number;
}

export interface WalkinJobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  city: string;
  clusterName: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
  dateRange?: string;
  timeRange?: string;
  reportingTime: string;
  venueAddress: string;
  contactPerson?: string;
  contactPhone?: string;
  requiredDocuments: string[];
  applyLink: string;
  source: string;
  postedAt?: string;
}

export interface WalkinSearchResponse {
  count: number;
  city: string;
  clusterBreakdown: Record<string, number>;
  walkins: WalkinJobResult[];
  durationMs: number;
}

export async function searchWalkinDrives(input: WalkinSearchInput = {}): Promise<WalkinSearchResponse> {
  const startTime = Date.now();
  const city = input.city || 'Hyderabad';
  const limit = input.resultsWanted || 10;
  const hoursOld = input.hoursOld;

  const queries = [
    'walkin fresher',
    'walk-in interview',
    'walk in drive',
    'walkin software engineer',
    'walkin technical support',
    'walkin graduate engineer trainee',
  ];

  const linkedinScraper = BOARD_SCRAPER_REGISTRY['linkedin'];
  const seenUrls = new Set<string>();
  const walkinResults: WalkinJobResult[] = [];
  const rawJobsForPipeline: any[] = [];
  const clusterBreakdown: Record<string, number> = {};

  if (linkedinScraper) {
    for (const query of queries) {
      try {
        const res = await linkedinScraper.scrape(
          new ScraperInputDto({
            searchTerm: query,
            location: city,
            resultsWanted: limit,
            hoursOld,
          })
        );

        for (const job of res?.jobs || []) {
          if (!job.jobUrl || seenUrls.has(job.jobUrl)) continue;
          seenUrls.add(job.jobUrl);

          const title = job.title || 'Walk-in Drive';
          const company = job.companyName || 'Unknown Company';
          const desc = job.description || '';
          const location = job.location?.displayLocation() || `${city}, India`;

          // Parse Walk-in fields
          const details = parseWalkInDetails(title, desc, location);

          // Geocode Tech Cluster
          const matchedCluster = matchHyderabadCluster(`${details.venueAddress} ${desc} ${title}`);
          const clusterName = matchedCluster.cluster.name;

          clusterBreakdown[clusterName] = (clusterBreakdown[clusterName] || 0) + 1;

          const walkinObj: WalkinJobResult = {
            id: job.id || `walkin-${Math.random().toString(36).slice(2, 9)}`,
            title,
            company,
            location,
            city,
            clusterName,
            latitude: matchedCluster.latitude,
            longitude: matchedCluster.longitude,
            mapsUrl: matchedCluster.mapsUrl,
            dateRange: details.dateRange,
            timeRange: details.timeRange,
            reportingTime: details.reportingTime,
            venueAddress: details.venueAddress,
            contactPerson: details.contactPerson,
            contactPhone: details.contactPhone,
            requiredDocuments: details.requiredDocuments,
            applyLink: job.jobUrl,
            source: 'LinkedIn Walk-in',
            postedAt: job.datePosted ? String(job.datePosted) : new Date().toISOString(),
          };

          walkinResults.push(walkinObj);

          // Format for Supabase discovered_jobs table
          rawJobsForPipeline.push({
            title,
            company,
            location,
            applyLink: job.jobUrl,
            sourceType: 'AGGREGATOR',
            source: 'LinkedIn Walk-in',
            fresherScore: 90,
            reviewRequired: false,
            description: desc,
            venueAddress: details.venueAddress,
            clusterName,
            latitude: matchedCluster.latitude,
            longitude: matchedCluster.longitude,
            walkinDate: details.dateRange,
            walkinTime: details.timeRange,
            reportingTime: details.reportingTime,
            contactPerson: details.contactPerson,
            contactPhone: details.contactPhone,
            requiredDocs: JSON.stringify(details.requiredDocuments),
            isRemote: false,
            postedAt: job.datePosted ? new Date(job.datePosted).toISOString() : new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.warn(`[Ingestion Walkin] Error for query "${query}": ${err.message}`);
      }
    }
  }

  // Persist to Supabase if DB connection is active
  try {
    const runId = await startRun();
    if (rawJobsForPipeline.length > 0) {
      await upsertJobs(rawJobsForPipeline, runId);
    }
    await finishRun(runId, {
      total_found: rawJobsForPipeline.length,
      accepted: rawJobsForPipeline.length,
      review_required: 0,
      duplicates: 0,
      failed: 0,
      duration_ms: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: { city, clusters: clusterBreakdown },
    });
  } catch (err: any) {
    console.warn(`[Ingestion Walkin] DB persist note: ${err.message}`);
  }

  return {
    count: walkinResults.length,
    city,
    clusterBreakdown,
    walkins: walkinResults,
    durationMs: Date.now() - startTime,
  };
}

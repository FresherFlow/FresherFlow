import { parseJobUrl } from '@fresherflow/parser';
import { AtsJob, PLUGIN_REGISTRY } from '@fresherflow/plugins';
import { HEAVY_DORK_QUERIES, DORKER_PAGES_PER_QUERY, executeDorkQuery } from '@fresherflow/pipeline';

export async function executeDorkSearch(options: any): Promise<{ jobs: AtsJob[], totalFound: number }> {
  console.log(`\n🔍 Executing Wide Dorker Search...`);
  const jobs: AtsJob[] = [];
  const urlsToProcess = new Set<string>();

  for (const query of HEAVY_DORK_QUERIES) {
    console.log(`   └─ Dork Query: ${query}`);
    try {
      const rawLinks = await executeDorkQuery({
          query,
          pages: DORKER_PAGES_PER_QUERY || 1,
          delayMs: 2000,
      });
      for (const link of rawLinks) {
          urlsToProcess.add(link);
      }
    } catch (err: any) {
       console.error(`   └─ ❌ Dorker failed for query: ${err.message}`);
    }
  }

  console.log(`   └─ Found ${urlsToProcess.size} unique URLs to inspect.`);

  for (const rawUrl of urlsToProcess) {
    try {
      const parsed = parseJobUrl(rawUrl);
      if (parsed && parsed.adapter) {
        const adapter = PLUGIN_REGISTRY[parsed.adapter];
        if (adapter && adapter.fetchJobDetails) {
           const tempJob: AtsJob = {
             applyLink: rawUrl,
             title: 'Unknown',
             company: parsed.company || 'unknown',
             source: parsed.adapter,
             sourceType: 'ATS',
             descriptionSource: 'NONE'
           };
           const details = await adapter.fetchJobDetails(tempJob);
           if (details && typeof details === 'object' && details.title) {
             jobs.push({
               ...tempJob,
               title: details.title,
               description: details.text || '',
               descriptionSource: 'API',
               company: details.company || tempJob.company,
               location: details.locations?.[0] || undefined,
             });
             console.log(`      [+] Enriched: ${details.title} @ ${details.company || tempJob.company}`);
           } else if (typeof details === 'string') {
             jobs.push({
               ...tempJob,
               description: details,
               descriptionSource: 'HTML'
             });
             console.log(`      [+] Enriched (HTML): ${tempJob.company} - ${rawUrl}`);
           }
        }
      }
    } catch (err) {
       // Ignore parsing errors for random links
    }
  }

  return { jobs, totalFound: urlsToProcess.size };
}

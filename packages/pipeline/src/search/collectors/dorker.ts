import { chromium, Browser } from 'playwright';
import { AtsJob } from '@fresherflow/plugins';
import { executeDorkQuery } from '../../core/dork-executor.js';
import { HEAVY_DORK_QUERIES } from '../../config/index.js';
import { parseJobUrl } from '@fresherflow/parser';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';

export async function collectDorkSearches(options: {
  maxQueries?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 4: Search Engine Dorks (Playwright) ===`);
  const allJobs: AtsJob[] = [];
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const queriesToRun = HEAVY_DORK_QUERIES.slice(0, options.maxQueries ?? 6);
    const urlsToProcess = new Set<string>();

    for (const query of queriesToRun) {
      const rawLinks = await executeDorkQuery({
        query,
        pages: 1,
        delayMs: 2000,
        playwrightContext: context,
      });
      for (const link of rawLinks) {
        urlsToProcess.add(link);
      }
    }

    console.log(`  └─ [Dorker] Inspecting ${urlsToProcess.size} candidate ATS URLs...`);
    for (const rawUrl of urlsToProcess) {
      const parsed = parseJobUrl(rawUrl);
      if (parsed?.adapter) {
        const adapter = PLUGIN_REGISTRY[parsed.adapter];
        if (adapter?.fetchJobDetails) {
          const tempJob: AtsJob = {
            applyLink: rawUrl,
            title: 'Unknown',
            company: parsed.company || 'unknown',
            source: parsed.adapter,
            sourceType: 'ATS',
            descriptionSource: 'NONE',
          };
          const details = await adapter.fetchJobDetails(tempJob);
          if (details && typeof details === 'object' && details.title) {
            allJobs.push({
              ...tempJob,
              title: details.title,
              description: details.text || '',
              descriptionSource: 'API',
              company: details.company || tempJob.company,
              location: details.locations?.[0] || 'India',
              postedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Dorker] Execution error: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log(`\n[Dorker Summary] Total collected via dorks: ${allJobs.length} raw jobs\n`);
  return allJobs;
}

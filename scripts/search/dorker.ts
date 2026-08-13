import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseJobUrl } from '@fresherflow/parser';
import { AtsJob, PLUGIN_REGISTRY } from '@fresherflow/plugins';

const DORK_QUERIES = [
  'site:greenhouse.io OR site:jobs.lever.co "software" ("fresher" OR "graduate" OR "0-1 years") "india"',
  'site:myworkdayjobs.com "software" ("fresher" OR "graduate") "india"',
  'site:careers.smartrecruiters.com "software" ("fresher" OR "graduate") "india"',
  'site:jobs.ashbyhq.com "software" ("fresher" OR "graduate") "india"',
];

export async function executeDorkSearch(options: any): Promise<{ jobs: AtsJob[], totalFound: number }> {
  console.log(`\n🔍 Executing Wide Dorker Search...`);
  const jobs: AtsJob[] = [];
  const urlsToProcess = new Set<string>();

  for (const query of DORK_QUERIES) {
    console.log(`   └─ Dork Query: ${query}`);
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      const $ = cheerio.load(res.data);
      
      $('.result__snippet').each((_, el) => {
        const parent = $(el).closest('.result');
        let text = parent.find('.result__url').text().trim();
        if (text) {
          text = text.replace(/\s+/g, '');
          if (!text.startsWith('http')) text = `https://${text}`;
          urlsToProcess.add(text);
        }
      });
    } catch (err: any) {
       console.error(`   └─ ❌ Dorker failed for query: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
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

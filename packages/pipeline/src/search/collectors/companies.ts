import { AtsJob, PLUGIN_REGISTRY } from '@fresherflow/plugins';

const DIRECT_COMPANIES: Array<{ id: string; name: string }> = [
  { id: 'amazon', name: 'Amazon' },
  { id: 'apple', name: 'Apple' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'stripe', name: 'Stripe' },
  { id: 'google', name: 'Google' },
  { id: 'nvidia', name: 'NVIDIA' },
  { id: 'uber', name: 'Uber' },
];

export async function collectDirectCompanyPortals(options: {
  resultsWanted?: number;
  hoursOld?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 4: Direct Big Tech & High-Growth Career Portals ===`);
  const allJobs: AtsJob[] = [];
  const limit = options.resultsWanted ?? 25;

  const results = await Promise.allSettled(
    DIRECT_COMPANIES.map(async ({ id, name }) => {
      const adapter = PLUGIN_REGISTRY[id];
      if (!adapter || !adapter.fetchJobs) {
        return [];
      }

      const start = Date.now();
      try {
        const timeoutPromise = new Promise<AtsJob[]>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 20s')), 20000)
        );

        const fetchPromise = adapter.fetchJobs(id, name);
        const jobs = await Promise.race([fetchPromise, timeoutPromise]);
        const durationMs = Date.now() - start;


        if (Array.isArray(jobs) && jobs.length > 0) {
          // Strictly filter for India location & Fresher / Graduate / Intern / Entry Level roles
          const indiaFresherJobs = jobs.filter(j => {
            const loc = (j.location || '').toLowerCase();
            const title = (j.title || '').toLowerCase();
            const isIndia = /india|hyderabad|bengaluru|bangalore|pune|chennai|noida|gurgaon|gurugram|mumbai|delhi|remote/i.test(loc);
            const isFresher = /fresher|graduate|intern|trainee|associate|entry|junior|apprentice|2024|2025|2026|sde-1|engineer i\b|analyst|specialist/i.test(title);
            const isSenior = /senior|sr\.|lead|principal|director|manager|head|architect|staff/i.test(title);
            return isIndia && isFresher && !isSenior;
          });

          const returnJobs = indiaFresherJobs.length > 0 ? indiaFresherJobs.slice(0, limit) : [];
          console.log(`  └─ [${name}] Fetched ${returnJobs.length} India Fresher roles (${jobs.length} total) in ${durationMs}ms`);
          return returnJobs;
        } else {
          return [];
        }

      } catch (err: any) {
        console.warn(`  └─ [${name}] Notice: ${err.message}`);
        return [];
      }
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allJobs.push(...r.value);
    }
  }

  console.log(`[Company Portals Summary] Total collected from direct portals: ${allJobs.length} raw jobs\n`);
  return allJobs;
}

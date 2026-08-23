import { AtsJob } from '@fresherflow/plugins';

/**
 * Searches GitHub for open hiring issues and internship posts
 */
export async function collectGitHubHiring(options: {
  resultsWanted?: number;
} = {}): Promise<AtsJob[]> {
  console.log(`\n=== Phase 3: GitHub Hiring Issues & Open-Source Bounties ===`);
  const allJobs: AtsJob[] = [];
  const limit = options.resultsWanted ?? 25;

  const queries = [
    'label:hiring "intern" OR "fresher" OR "junior" is:open is:issue',
    'label:internship is:open is:issue',
    '"we are hiring" "fresher" OR "intern" in:title is:open is:issue',
  ];

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'FresherFlow-Search-Bot',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  for (const query of queries) {
    try {
      const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=15`;
      const resp = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(15000) });

      if (resp.status === 403) {
        console.warn(`  └─ [GitHub] Rate limit hit, skipping query.`);
        break;
      }

      if (!resp.ok) continue;

      const data = await resp.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      for (const item of items) {
        if (allJobs.length >= limit) break;

        const title = item.title || '';
        const body = item.body || '';
        const htmlUrl = item.html_url || '';
        const repoUrl = item.repository_url || '';

        let company = 'GitHub Community';
        if (repoUrl) {
          const parts = repoUrl.split('/');
          if (parts.length >= 5) {
            company = parts[parts.length - 2] || company;
          }
        }

        allJobs.push({
          title,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          location: 'Remote',
          applyLink: htmlUrl,
          description: body.slice(0, 1000),
          descriptionSource: 'API' as const,
          postedAt: item.created_at || new Date().toISOString(),
          source: 'GitHub',
          sourceType: 'AGGREGATOR' as const,
          isRemote: true,
        });
      }

      console.log(`  └─ [GitHub] Found ${items.length} issues for query: "${query.slice(0, 35)}..."`);
    } catch (err: any) {
      console.warn(`  └─ [GitHub] Search error: ${err.message}`);
    }
  }

  console.log(`\n[GitHub Summary] Total collected from GitHub: ${allJobs.length} raw jobs\n`);
  return allJobs;
}

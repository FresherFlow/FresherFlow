import { AtsAdapter, AtsJob } from './BaseAdapter.js';

export class ICimsAdapter implements AtsAdapter {
    providerName = 'iCIMS';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        // e.g. https://university-uber.icims.com
        try {
            const url = `${companyUrl.replace(/\/$/, '')}/jobs/search?pr=0&in_iframe=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[iCIMS] Failed to fetch jobs for ${companyName}: ${response.status} ${response.statusText}`);
                return [];
            }

            const html = await response.text();
            
            // iCIMS returns HTML. We can use a simple regex to extract job links and titles.
            // <a class="iCIMS_Anchor" href="https://university-uber.icims.com/jobs/123/software-engineer/job" title="Software Engineer">
            const regex = /<a[^>]*href="([^"]+\/job\??[^"]*)"[^>]*title="([^"]+)"[^>]*>/gi;
            
            const jobs: AtsJob[] = [];
            let match;
            
            // Limit to 50 jobs per company to avoid infinite loops on bad regex
            let count = 0;
            while ((match = regex.exec(html)) !== null && count < 50) {
                count++;
                let applyLink = match[1];
                const title = match[2].replace(' - Opens in new window', '').trim();
                
                // Sometimes apply links are relative
                if (applyLink.startsWith('/')) {
                    applyLink = `${companyUrl.replace(/\/$/, '')}${applyLink}`;
                }

                jobs.push({
                    title: title || 'Unknown Title',
                    applyLink: applyLink,
                    company: companyName,
                    source: 'ATS_ICIMS',
                    sourceType: 'ATS'
                });
            }

            // Deduplicate by applyLink
            const uniqueJobs = Array.from(new Map(jobs.map(j => [j.applyLink, j])).values());
            return uniqueJobs;

        } catch (error) {
            console.error(`[iCIMS] Error fetching jobs for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}

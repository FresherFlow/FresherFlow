import { AtsAdapter, AtsJob } from './BaseAdapter.js';

export class SuccessFactorsAdapter implements AtsAdapter {
    providerName = 'SuccessFactors';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        // e.g. https://career5.successfactors.eu/career?company=WNS
        try {
            const response = await fetch(companyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[SuccessFactors] Failed to fetch jobs for ${companyName}: ${response.status} ${response.statusText}`);
                return [];
            }

            const html = await response.text();
            
            // SuccessFactors typically has links with class "jobTitle" or hrefs pointing to /career?career_ns=job_listing
            // We'll use a broad regex to catch anything that looks like a job link on the page.
            const regex = /<a[^>]*href="([^"]*career_ns=job_listing[^"]*)"[^>]*>(?:<[^>]+>)*\s*([^<]+)\s*(?:<\/[^>]+>)*<\/a>/gi;
            
            const jobs: AtsJob[] = [];
            let match;
            
            let count = 0;
            while ((match = regex.exec(html)) !== null && count < 50) {
                count++;
                let applyLink = match[1];
                let title = match[2].trim();
                
                // HTML entities cleanup
                title = title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

                if (applyLink.startsWith('/')) {
                    const urlObj = new URL(companyUrl);
                    applyLink = `${urlObj.origin}${applyLink}`;
                }

                // Try to extract ID from URL param `career_job_req_id=123`
                const idMatch = applyLink.match(/career_job_req_id=(\d+)/);
                const id = idMatch ? idMatch[1] : undefined;

                jobs.push({
                    id,
                    title: title || 'Unknown Title',
                    applyLink: applyLink.replace(/&amp;/g, '&'),
                    company: companyName,
                    descriptionSource: 'NONE',
                    source: 'ATS_SUCCESSFACTORS',
                    sourceType: 'ATS'
                });
            }

            const uniqueJobs = Array.from(new Map(jobs.map(j => [j.applyLink, j])).values());
            return uniqueJobs;

        } catch (error) {
            console.error(`[SuccessFactors] Error fetching jobs for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}

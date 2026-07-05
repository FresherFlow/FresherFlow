import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface AshbyJobResponse {
    jobs?: Array<{
        title: string;
        jobUrl: string;
        location?: string;
        department?: string;
        employmentType?: string;
    }>;
}

export class AshbyAdapter implements AtsAdapter {
    providerName = 'Ashby';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${companyId}`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[Ashby] Failed to fetch jobs for ${companyId}: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as AshbyJobResponse;
            if (!data.jobs || !Array.isArray(data.jobs)) {
                return [];
            }

            return data.jobs.map(j => ({
                title: j.title || 'Unknown Title',
                applyLink: j.jobUrl,
                company: companyName,
                location: j.location,
                type: j.employmentType,
                source: 'ATS_ASHBY',
                sourceType: 'ATS'
            }));
        } catch (error) {
            console.error(`[Ashby] Error fetching jobs for ${companyId}:`, (error as Error).message);
            return [];
        }
    }
}

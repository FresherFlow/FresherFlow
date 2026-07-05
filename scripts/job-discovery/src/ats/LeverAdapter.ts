import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface LeverJobResponse {
    text: string; // Title
    hostedUrl: string;
    categories?: {
        location?: string;
        department?: string;
        team?: string;
    };
    workplaceType?: string;
}

export class LeverAdapter implements AtsAdapter {
    providerName = 'Lever';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.lever.co/v0/postings/${companyId}?mode=json`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[Lever] Failed to fetch jobs for ${companyId}: ${response.status} ${response.statusText}`);
                return [];
            }

            const jobs = await response.json() as LeverJobResponse[];
            if (!Array.isArray(jobs)) {
                return [];
            }

            return jobs.map(j => {
                let location = j.categories?.location || '';
                if (j.workplaceType && j.workplaceType.toLowerCase() !== 'unspecified') {
                    location = location ? `${location} (${j.workplaceType})` : j.workplaceType;
                }
                
                return {
                    title: j.text || 'Unknown Title',
                    applyLink: j.hostedUrl,
                    company: companyName,
                    location,
                    source: 'ATS_LEVER',
                    sourceType: 'ATS'
                };
            });
        } catch (error) {
            console.error(`[Lever] Error fetching jobs for ${companyId}:`, (error as Error).message);
            return [];
        }
    }
}

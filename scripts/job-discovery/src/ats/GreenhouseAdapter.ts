import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface GreenhouseJobResponse {
    jobs: Array<{
        absolute_url: string;
        location: { name: string };
        title: string;
    }>;
}

export class GreenhouseAdapter implements AtsAdapter {
    providerName = 'Greenhouse';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://boards-api.greenhouse.io/v1/boards/${companyId}/jobs`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[Greenhouse] Failed to fetch jobs for ${companyId}: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as GreenhouseJobResponse;
            if (!data.jobs || !Array.isArray(data.jobs)) {
                return [];
            }

            return data.jobs.map(j => ({
                title: j.title || 'Unknown Title',
                applyLink: j.absolute_url,
                company: companyName,
                location: j.location?.name,
                source: 'ATS_GREENHOUSE',
                sourceType: 'ATS'
            }));
        } catch (error) {
            console.error(`[Greenhouse] Error fetching jobs for ${companyId}:`, (error as Error).message);
            return [];
        }
    }
}

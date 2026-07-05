import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface SmartRecruitersJobResponse {
    content?: Array<{
        id: string;
        name: string;
        location?: {
            city?: string;
            region?: string;
            country?: string;
        };
        typeOfEmployment?: {
            label?: string;
        };
    }>;
}

export class SmartRecruitersAdapter implements AtsAdapter {
    providerName = 'SmartRecruiters';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[SmartRecruiters] Failed to fetch jobs for ${companyId}: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as SmartRecruitersJobResponse;
            if (!data.content || !Array.isArray(data.content)) {
                return [];
            }

            return data.content.map(j => {
                let locationStr = '';
                if (j.location) {
                    locationStr = [j.location.city, j.location.region, j.location.country].filter(Boolean).join(', ');
                }

                return {
                    title: j.name || 'Unknown Title',
                    applyLink: `https://jobs.smartrecruiters.com/${companyId}/${j.id}`,
                    company: companyName,
                    location: locationStr,
                    type: j.typeOfEmployment?.label,
                    source: 'ATS_SMARTRECRUITERS',
                    sourceType: 'ATS'
                };
            });
        } catch (error) {
            console.error(`[SmartRecruiters] Error fetching jobs for ${companyId}:`, (error as Error).message);
            return [];
        }
    }
}

import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface OracleJobResponse {
    items?: Array<{
        Id: number | string;
        Title: string;
        PrimaryLocation?: string;
        JobType?: string;
    }>;
}

export class OracleAdapter implements AtsAdapter {
    providerName = 'Oracle';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        // e.g. https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1
        try {
            const urlObj = new URL(companyUrl);
            const siteMatch = companyUrl.match(/\/sites\/([^\/]+)/);
            if (!siteMatch || !siteMatch[1]) {
                console.warn(`[Oracle] Invalid Oracle base URL for ${companyName}: ${companyUrl}`);
                return [];
            }
            const siteId = siteMatch[1];
            
            const apiUrl = `${urlObj.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=all&finder=findReqs;siteNumber=${siteId}`;

            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.ok) {
                console.warn(`[Oracle] Failed to fetch jobs for ${companyName}: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as OracleJobResponse;
            if (!data.items || !Array.isArray(data.items)) {
                return [];
            }

            return data.items.map(j => ({
                title: j.Title || 'Unknown Title',
                applyLink: `${companyUrl}/job/${j.Id}`,
                company: companyName,
                location: j.PrimaryLocation,
                type: j.JobType,
                source: 'ATS_ORACLE',
                sourceType: 'ATS'
            }));
        } catch (error) {
            console.error(`[Oracle] Error fetching jobs for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}

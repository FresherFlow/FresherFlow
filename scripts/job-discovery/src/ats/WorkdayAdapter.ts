import { AtsAdapter, AtsJob } from './BaseAdapter.js';

interface WorkdayJobResponse {
    jobPostings?: Array<{
        title: string;
        externalPath: string; // e.g. "/job/Pune/Software-Engineer_R123"
        locationsText?: string;
        timeType?: string; // e.g. "Full time"
    }>;
}

export class WorkdayAdapter implements AtsAdapter {
    providerName = 'Workday';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        // companyUrl expected format: https://genpact.wd108.myworkdayjobs.com/External_Careers
        try {
            const urlObj = new URL(companyUrl);
            const tenant = urlObj.hostname.split('.')[0];
            const board = urlObj.pathname.replace(/^\//, '').split('/')[0];
            
            if (!tenant || !board) {
                console.warn(`[Workday] Invalid Workday base URL for ${companyName}: ${companyUrl}`);
                return [];
            }

            // Workday JSON search API endpoint
            const apiUrl = `${urlObj.origin}/wday/cxs/${tenant}/${board}/jobs`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    appliedFacets: {},
                    limit: 20,
                    offset: 0,
                    searchText: ""
                })
            });

            if (!response.ok) {
                console.warn(`[Workday] Failed to fetch jobs for ${companyName}: ${response.status} ${response.statusText}`);
                return [];
            }

            const data = await response.json() as WorkdayJobResponse;
            if (!data.jobPostings || !Array.isArray(data.jobPostings)) {
                return [];
            }

            // Workday apply links are base URL + external path
            // e.g. https://genpact.wd108.myworkdayjobs.com/External_Careers + /job/Pune/...
            const baseUrl = `${urlObj.origin}/${board}`;

            return data.jobPostings.map(j => ({
                title: j.title || 'Unknown Title',
                applyLink: `${baseUrl}${j.externalPath}`,
                company: companyName,
                location: j.locationsText,
                type: j.timeType,
                source: 'ATS_WORKDAY',
                sourceType: 'ATS'
            }));
        } catch (error) {
            console.error(`[Workday] Error fetching jobs for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}

import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface AshbyJobResponse {
    jobs?: Array<{
        id: string;
        title: string;
        jobUrl: string;
        location?: string;
        department?: string;
        employmentType?: string;
        publishedAt?: string;
    }>;
}

export class AshbyAdapter implements AtsAdapter {
    providerName = 'Ashby';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${companyId}`;
        const data = await fetchJson<AshbyJobResponse>(url, {}, 'Ashby');
        if (!data?.jobs?.length) return [];

        return data.jobs.map(j => ({
            id: j.id,
            title: j.title || 'Unknown Title',
            applyLink: j.jobUrl,
            company: companyName,
            location: j.location,
            department: j.department,
            employmentType: j.employmentType,
            postedAt: j.publishedAt,
            descriptionSource: 'NONE',
            source: 'ATS_ASHBY',
            sourceType: 'ATS'
        }));
    }
}

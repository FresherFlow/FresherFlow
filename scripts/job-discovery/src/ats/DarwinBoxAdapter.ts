import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface DarwinBoxJob {
    job_id?: string;
    job_title?: string;
    location?: string;
    department?: string;
    employment_type?: string;
    date_posted?: string;
    experience?: string;
}

interface DarwinBoxResponse {
    data?: DarwinBoxJob[];
    jobs?: DarwinBoxJob[];
    total?: number;
}

export class DarwinBoxAdapter implements AtsAdapter {
    providerName = 'DarwinBox';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        // companyId = subdomain e.g. "hcltech"
        const url = `https://${companyId}.darwinbox.com/recruitment/listPosting`;
        const data = await fetchJson<DarwinBoxResponse>(
            url,
            { method: 'POST', body: JSON.stringify({ page: 0, limit: 100 }), headers: { 'Content-Type': 'application/json' } },
            'DarwinBox'
        );

        const jobs: DarwinBoxJob[] = data?.data ?? data?.jobs ?? [];
        if (!jobs.length) return [];

        return jobs.map(j => ({
            id: j.job_id,
            title: j.job_title || 'Unknown Title',
            applyLink: `https://${companyId}.darwinbox.com/ms/candidate/listPosting#${j.job_id}`,
            company: companyName,
            location: j.location,
            department: j.department,
            employmentType: j.employment_type,
            postedAt: j.date_posted,
            descriptionSource: 'NONE',
            source: 'ATS_DARWINBOX',
            sourceType: 'ATS' as const,
        }));
    }
}

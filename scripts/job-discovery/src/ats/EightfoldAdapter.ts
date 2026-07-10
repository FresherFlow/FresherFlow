import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface EightfoldJob {
    id?: number | string;
    name?: string;
    location?: string;
    department?: string;
    type?: string;
    posted_date?: string;
}

interface EightfoldResponse {
    positions?: EightfoldJob[];
    count?: number;
}

export class EightfoldAdapter implements AtsAdapter {
    providerName = 'Eightfold';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        // companyId = subdomain e.g. "eaton"
        const url = `https://${companyId}.eightfold.ai/api/getJobDetails?domain=${companyId}&start=0&num=100&location=India`;
        const data = await fetchJson<EightfoldResponse>(url, {}, 'Eightfold');
        if (!data?.positions?.length) return [];

        return data.positions.map(j => ({
            id: String(j.id ?? ''),
            title: j.name || 'Unknown Title',
            applyLink: `https://${companyId}.eightfold.ai/careers/job/${j.id}`,
            company: companyName,
            location: j.location,
            department: j.department,
            employmentType: j.type,
            postedAt: j.posted_date,
            descriptionSource: 'NONE',
            source: 'ATS_EIGHTFOLD',
            sourceType: 'ATS' as const,
        }));
    }
}

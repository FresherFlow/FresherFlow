import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface JobviteJob {
    id?: string;
    title?: string;
    location?: string;
    department?: string;
    jobApplyUrl?: string;
    jobUrl?: string;
    type?: string;
    date?: string;
}

export class JobviteAdapter implements AtsAdapter {
    providerName = 'Jobvite';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const data = await fetchJson<{ jobs?: JobviteJob[] }>(
            `https://jobs.jobvite.com/api/job?c=${companyId}`,
            {},
            'Jobvite'
        );
        if (!data?.jobs?.length) return [];

        return data.jobs
            .filter(j => j.jobApplyUrl || j.jobUrl)
            .map(j => ({
                id: j.id,
                title: j.title || 'Unknown Title',
                applyLink: j.jobApplyUrl || j.jobUrl!,
                company: companyName,
                location: j.location,
                department: j.department,
                employmentType: j.type,
                postedAt: j.date,
                descriptionSource: 'NONE',
                source: 'ATS_JOBVITE',
                sourceType: 'ATS' as const,
            }));
    }
}

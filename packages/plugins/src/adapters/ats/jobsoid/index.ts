import { AtsAdapter, AtsJob, fetchJson, htmlToPlainText } from '../../../base/BaseAdapter.js';

export class JobsoidAdapter implements AtsAdapter {
    providerName = 'Jobsoid';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        // companyId is the tenant slug
        const host = `https://${encodeURIComponent(companyId)}.jobsoid.com`;
        const url = `${host}/api/v1/jobs`;
        
        const response = await fetchJson<any[]>(url, {}, 'Jobsoid');
        if (!response || !Array.isArray(response)) return [];

        const jobs: AtsJob[] = [];
        for (const job of response) {
            try {
                const title = job.title?.trim();
                if (!title) continue;
                
                const id = String(job.id || '');
                if (!id) continue;
                
                const slug = job.slug?.trim() || '';
                const jobUrl = job.hostedUrl?.trim() || `${host}/j/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
                const applyUrl = job.applyUrl?.trim() || `${host}/apply/${encodeURIComponent(id)}`;
                
                let locStr = '';
                if (job.location) {
                    if (job.location.city || job.location.state || job.location.country) {
                        locStr = [job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ');
                    } else if (job.location.title) {
                        locStr = job.location.title;
                    }
                }
                
                let isRemote = false;
                const haystacks = [job.title, job.location?.title, job.location?.city, job.type];
                for (const field of haystacks) {
                    if (typeof field === 'string' && /remote|work from home|wfh/i.test(field)) {
                        isRemote = true;
                        break;
                    }
                }
                
                const department = job.department?.title || job.function?.title || job.industry || undefined;

                jobs.push({
                    title,
                    company: job.company?.trim() || companyName,
                    applyLink: jobUrl,
                    applyUrl,
                    jobUrlDirect: jobUrl,
                    location: locStr,
                    description: htmlToPlainText(job.description || ''),
                    descriptionSource: job.description ? 'HTML' : 'NONE',
                    isRemote,
                    postedAt: job.postedDate ? new Date(job.postedDate).toISOString() : undefined,
                    department,
                    source: 'ATS_JOBSOID',
                    sourceType: 'ATS',
                    site: 'jobsoid',
                    atsId: id,
                    atsType: 'jobsoid'
                });
            } catch (err) {
                // skip
            }
        }
        return jobs;
    }
}

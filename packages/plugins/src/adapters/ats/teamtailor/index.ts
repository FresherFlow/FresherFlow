import { AtsAdapter, AtsJob, fetchJson, htmlToPlainText } from '../../../base/BaseAdapter.js';

export class TeamtailorAdapter implements AtsAdapter {
    providerName = 'Teamtailor';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://career.teamtailor.com/widget/jobs/${encodeURIComponent(companyId)}`;
        const response = await fetchJson<any>(url, {}, 'Teamtailor');
        if (!response || !Array.isArray(response.data)) return [];

        const jobs: AtsJob[] = [];
        for (const job of response.data) {
            try {
                const attrs = job.attributes || {};
                const title = attrs.title;
                if (!title) continue;

                const id = job.id;
                const applyUrl = attrs['apply-url'] || attrs['external-url'];
                const jobUrl = job.links?.['careersite-url'] || applyUrl || `https://career.teamtailor.com/${encodeURIComponent(companyId)}/jobs/${encodeURIComponent(id)}`;
                const location = [attrs.city, attrs.region, attrs.country].filter(Boolean).join(', ');
                
                jobs.push({
                    title,
                    company: companyName,
                    applyLink: jobUrl,
                    applyUrl,
                    jobUrlDirect: jobUrl,
                    location,
                    description: htmlToPlainText(attrs.body || ''),
                    descriptionSource: attrs.body ? 'HTML' : 'NONE',
                    isRemote: attrs.remote || false,
                    postedAt: attrs['created-at'] ? new Date(attrs['created-at']).toISOString() : undefined,
                    department: job.relationships?.department?.data?.id || undefined,
                    employmentType: attrs['employment-type'] || undefined,
                    source: 'ATS_TEAMTAILOR',
                    sourceType: 'ATS',
                    site: 'teamtailor',
                    atsId: id,
                    atsType: 'teamtailor'
                });
            } catch (err) {
                // Ignore individual job errors
            }
        }
        return jobs;
    }
}

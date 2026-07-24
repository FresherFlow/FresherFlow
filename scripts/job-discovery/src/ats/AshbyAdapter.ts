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
        descriptionPlain?: string;
        descriptionHtml?: string;
    }>;
}

export class AshbyAdapter implements AtsAdapter {
    providerName = 'Ashby';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${companyId}`;
        const data = await fetchJson<AshbyJobResponse>(url, {}, 'Ashby');
        if (!data?.jobs?.length) return [];

        return data.jobs.map(j => {
            let description = j.descriptionPlain || '';
            if (!description && j.descriptionHtml) {
                description = j.descriptionHtml
                    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n**$1**\n\n')
                    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                    .replace(/<li[^>]*>/gi, '\n- ')
                    .replace(/<\/li>/gi, '')
                    .replace(/<p[^>]*>/gi, '\n')
                    .replace(/<\/p>/gi, '')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/&amp;/gi, '&')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            }

            return {
                id: j.id,
                title: j.title || 'Unknown Title',
                applyLink: j.jobUrl,
                company: companyName,
                location: j.location,
                department: j.department,
                employmentType: j.employmentType,
                postedAt: j.publishedAt,
                description: description || undefined,
                descriptionSource: description ? 'API' : 'NONE',
                source: 'ATS_ASHBY',
                sourceType: 'ATS'
            };
        });
    }
}

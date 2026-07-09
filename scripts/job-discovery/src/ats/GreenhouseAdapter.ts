import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface GreenhouseJobResponse {
    jobs: Array<{
        absolute_url: string;
        location: { name: string };
        title: string;
        id: number | string;
    }>;
}

export class GreenhouseAdapter implements AtsAdapter {
    providerName = 'Greenhouse';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://boards-api.greenhouse.io/v1/boards/${companyId}/jobs`;
        const data = await fetchJson<GreenhouseJobResponse>(url, {}, 'Greenhouse');
        if (!data?.jobs?.length) return [];

        return data.jobs.map(j => ({
            id: String(j.id),
            title: j.title || 'Unknown Title',
            applyLink: j.absolute_url,
            company: companyName,
            location: j.location?.name,
            descriptionSource: 'NONE',
            source: 'ATS_GREENHOUSE',
            sourceType: 'ATS',
            boardToken: companyId
        }));
    }

    async fetchJobDetails(job: AtsJob): Promise<string | undefined> {
        if (!job.id) return undefined;
        
        const boardToken = job.boardToken || (() => {
            const urlObj = new URL(job.applyLink);
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const boardsIdx = parts.indexOf('boards');
            return boardsIdx !== -1 ? parts[boardsIdx + 1] : parts[0];
        })();

        const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.id}?content=true`;
        const data = await fetchJson<any>(url, {}, 'Greenhouse Details');
        if (!data || !data.content) return undefined;

        // data.content is HTML. We will return the raw HTML, and downstream scorer can strip it or parse it.
        return data.content;
    }
}

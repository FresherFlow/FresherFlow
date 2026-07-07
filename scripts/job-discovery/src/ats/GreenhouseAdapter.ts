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
            sourceType: 'ATS'
        }));
    }
}

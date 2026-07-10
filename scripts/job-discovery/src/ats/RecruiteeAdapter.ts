import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface RecruiteeOffer {
    id: number;
    title?: string;
    location?: string;
    department?: string;
    slug?: string;
    kind?: string; // employment type
    remote?: boolean;
}

export class RecruiteeAdapter implements AtsAdapter {
    providerName = 'Recruitee';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const data = await fetchJson<{ offers?: RecruiteeOffer[] }>(
            `https://${companyId}.recruitee.com/api/offers/`,
            {},
            'Recruitee'
        );
        if (!data?.offers?.length) return [];

        return data.offers.map(j => ({
            id: String(j.id),
            title: j.title || 'Unknown Title',
            applyLink: `https://${companyId}.recruitee.com/o/${j.slug || j.id}`,
            company: companyName,
            location: j.remote ? `Remote, ${j.location || ''}`.trim().replace(/,$/, '') : j.location,
            department: j.department,
            employmentType: j.kind,
            descriptionSource: 'NONE',
            source: 'ATS_RECRUITEE',
            sourceType: 'ATS' as const,
        }));
    }
}

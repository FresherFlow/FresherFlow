import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface WorkableJob {
    id: string;
    shortcode?: string;
    title?: string;
    full_title?: string;
    location?: {
        city?: string;
        region?: string;
        countryName?: string;
        telecommute?: boolean;
    };
    department?: string;
    type?: string;
    created_at?: string;
    published_on?: string;
    url?: string;
    description?: string;
}

interface WorkableResponse {
    jobs?: WorkableJob[];
}

export class WorkableAdapter implements AtsAdapter {
    providerName = 'Workable';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://apply.workable.com/api/v1/widget/accounts/${companyId}`;
        const data = await fetchJson<WorkableResponse>(url, {}, 'Workable');

        if (!data?.jobs?.length) return [];

        return data.jobs.map(j => {
            let locStr: string | undefined;
            if (j.location) {
                const parts = [j.location.city, j.location.region, j.location.countryName].filter(Boolean);
                locStr = parts.join(', ');
                if (j.location.telecommute) {
                    locStr = `Remote, ${locStr}`.trim().replace(/,$/, '');
                }
            }

            const code = j.shortcode || j.id;
            const applyLink = j.url || `https://apply.workable.com/${companyId}/j/${code}/`;

            return {
                id: String(j.id || code),
                title: j.title || j.full_title || 'Unknown Title',
                applyLink,
                company: companyName,
                location: locStr,
                department: j.department,
                employmentType: j.type,
                description: j.description,
                descriptionSource: j.description ? 'API' : 'NONE',
                postedAt: j.published_on || j.created_at,
                source: 'ATS_WORKABLE',
                sourceType: 'ATS' as const,
                boardToken: companyId
            };
        });
    }
}

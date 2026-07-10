import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface TeamtailorJob {
    id: string;
    attributes?: {
        title?: string;
        'remote-status'?: string;
        picture?: unknown;
    };
    relationships?: {
        department?: { data?: { id: string } };
        location?: { data?: { id: string } | null };
    };
}

interface TeamtailorResponse {
    data?: TeamtailorJob[];
    included?: Array<{
        id: string;
        type: string;
        attributes?: { city?: string; name?: string };
    }>;
}

export class TeamtailorAdapter implements AtsAdapter {
    providerName = 'Teamtailor';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        // companyId is the Teamtailor API token for the company
        const data = await fetchJson<TeamtailorResponse>(
            `https://api.teamtailor.com/v1/jobs?include=locations,department&filter[feed]=public&page[size]=50`,
            {
                headers: {
                    'Authorization': `Token token="${companyId}"`,
                    'X-Api-Version': '20240404',
                },
            },
            'Teamtailor'
        );
        if (!data?.data?.length) return [];

        const locationMap = new Map<string, string>();
        for (const inc of data.included ?? []) {
            if (inc.type === 'locations' && inc.attributes) {
                locationMap.set(inc.id, inc.attributes.city || inc.attributes.name || '');
            }
        }

        return data.data.map(j => {
            const locId = j.relationships?.location?.data?.id;
            const location = j.attributes?.['remote-status'] === 'remote'
                ? 'Remote'
                : locId ? locationMap.get(locId) : undefined;

            return {
                id: j.id,
                title: j.attributes?.title || 'Unknown Title',
                applyLink: `https://jobs.teamtailor.com/jobs/${j.id}`,
                company: companyName,
                location,
                descriptionSource: 'NONE',
                source: 'ATS_TEAMTAILOR',
                sourceType: 'ATS' as const,
            };
        });
    }
}

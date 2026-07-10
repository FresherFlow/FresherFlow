import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

interface BambooJob {
    id: string;
    title?: { label: string };
    location?: { city?: string; state?: string; country?: string; remote?: boolean };
    department?: { label: string };
    employmentType?: string;
}

export class BambooHRAdapter implements AtsAdapter {
    providerName = 'BambooHR';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const data = await fetchJson<{ result?: BambooJob[] }>(
            `https://${companyId}.bamboohr.com/careers/list`,
            {},
            'BambooHR'
        );
        if (!data?.result?.length) return [];

        return data.result.map(j => {
            const loc = j.location;
            const locationStr = loc
                ? [loc.remote ? 'Remote' : undefined, loc.city, loc.state, loc.country]
                    .filter(Boolean).join(', ')
                : undefined;
            return {
                id: j.id,
                title: j.title?.label || 'Unknown Title',
                applyLink: `https://${companyId}.bamboohr.com/careers/${j.id}`,
                company: companyName,
                location: locationStr,
                department: j.department?.label,
                employmentType: j.employmentType,
                descriptionSource: 'NONE',
                source: 'ATS_BAMBOOHR',
                sourceType: 'ATS' as const,
            };
        });
    }
}

import { AtsAdapter, AtsJob, COUNTRY_CODE_MAP, fetchJson, sleep } from './BaseAdapter.js';

interface LeverJobResponse {
    text: string;
    hostedUrl: string;
    categories?: {
        location?: string;
        department?: string;
        team?: string;
        commitment?: string;
    };
    workplaceType?: string;
    country?: string; // ISO 3166-1 alpha-2
    tags?: string[];
    lists?: Array<{ text: string; content: string }>;
    openingPlain?: string;
    additionalPlain?: string;
}

const VAGUE_LOCATIONS = ['global', 'remote', 'worldwide', 'asia', 'apac', 'south east asia', 'emea'];

export class LeverAdapter implements AtsAdapter {
    providerName = 'Lever';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.lever.co/v0/postings/${companyId}?mode=json`;
        const jobs = await fetchJson<LeverJobResponse[]>(url, {}, 'Lever');
        if (!Array.isArray(jobs)) return [];

        return jobs.map(j => {
            const countryCode = j.country || '';
            const countryName = COUNTRY_CODE_MAP[countryCode] || countryCode;
            let location = j.categories?.location || '';

            // Only rewrite vague/empty locations using country code.
            // If Lever already says "Mumbai" don't add "India (Mumbai)" redundancy.
            const isVague = !location || VAGUE_LOCATIONS.some(t => location.toLowerCase().includes(t));
            if (isVague && countryCode) {
                // Preserve "India (Remote)" style or just the country name
                location = countryCode === 'IN'
                    ? `India${location ? ' (' + location + ')' : ''}`
                    : `${location || countryName} [${countryCode}]`;
            }

            // Build description from all text sections
            const descParts: string[] = [];
            
            // Inject tags at the very beginning to ensure they get matched
            if (Array.isArray(j.tags) && j.tags.length > 0) {
                descParts.push(`Tags: ${j.tags.join(', ')}`);
            }

            if (j.openingPlain) descParts.push(j.openingPlain);
            if (j.lists) {
                for (const list of j.lists) {
                    if (list.text) descParts.push(list.text);
                    if (list.content) descParts.push(list.content.replace(/<[^>]+>/g, ' ').trim());
                }
            }
            if (j.additionalPlain) descParts.push(j.additionalPlain);
            const description = descParts.join('\n').trim();

            return {
                title: j.text || 'Unknown Title',
                applyLink: j.hostedUrl,
                company: companyName,
                location,
                parsedLocation: {
                    raw: j.categories?.location || '',
                    country: countryName || undefined,
                    countryCode: countryCode || undefined,
                    remote: j.workplaceType?.toLowerCase() === 'remote',
                },
                description: description || undefined,
                descriptionSource: description ? 'API' : 'NONE',
                department: j.categories?.department || j.categories?.team,
                employmentType: j.categories?.commitment,
                source: 'ATS_LEVER',
                sourceType: 'ATS',
            };
        });
    }
}

import { AtsAdapter, AtsJob, COUNTRY_CODE_MAP, fetchJson, sleep } from './BaseAdapter.js';

interface SmartRecruitersJob {
    id: string;
    name: string;
    location?: {
        city?: string;
        region?: string;
        country?: string; // ISO 3166-1 alpha-2
        remote?: boolean;
    };
    typeOfEmployment?: { label?: string };
    department?: { label?: string };
}

interface SmartRecruitersResponse {
    content?: SmartRecruitersJob[];
    totalFound?: number;
    limit?: number;
    offset?: number;
}

export class SmartRecruitersAdapter implements AtsAdapter {
    providerName = 'SmartRecruiters';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const allJobs: AtsJob[] = [];
        const seen = new Set<string>();
        let offset = 0;
        const limit = 100;

        while (true) {
            const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings?limit=${limit}&offset=${offset}`;
            const data = await fetchJson<SmartRecruitersResponse>(url, {}, 'SmartRecruiters');
            if (!data?.content?.length) break;

            for (const j of data.content) {
                const applyLink = `https://jobs.smartrecruiters.com/${companyId}/${j.id}`;
                if (seen.has(applyLink)) continue;
                seen.add(applyLink);

                const countryCode = (j.location?.country || '').toUpperCase();
                // Import Country dynamically or just rely on the fact that if we map it to the full name, the filter works.
                // We'll use a local require or just rely on COUNTRY_CODE_MAP but expanded, or just pass the code if it fails.
                // Actually, since we don't have country-state-city imported here, we can just use Intl.DisplayNames
                let countryName = countryCode;
                try {
                    if (countryCode) {
                        const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
                        countryName = displayNames.of(countryCode) || countryCode;
                    }
                } catch (e) {
                    countryName = COUNTRY_CODE_MAP[countryCode] || countryCode;
                }
                
                const locationParts = [j.location?.city, j.location?.region, countryName].filter(Boolean);
                let locationStr = locationParts.join(', ');
                if (j.location?.remote) {
                    locationStr = locationStr ? `${locationStr} (Remote)` : 'Remote';
                }

                allJobs.push({
                    id: j.id,
                    title: j.name || 'Unknown Title',
                    applyLink,
                    company: companyName,
                    location: locationStr,
                    parsedLocation: {
                        raw: locationStr,
                        country: countryName || undefined,
                        countryCode: countryCode || undefined,
                        city: j.location?.city,
                        region: j.location?.region,
                        remote: j.location?.remote ?? false,
                    },
                    descriptionSource: 'NONE',
                    department: j.department?.label,
                    employmentType: j.typeOfEmployment?.label,
                    source: 'ATS_SMARTRECRUITERS',
                    sourceType: 'ATS',
                });
            }

            // Stop if we got fewer than limit (last page)
            if (data.content.length < limit) break;
            offset += limit;
            await sleep(400);
        }

        return allJobs;
    }
}

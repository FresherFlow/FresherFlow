import { AtsAdapter, AtsJob, fetchJson } from '../../../base/BaseAdapter.js';

export class ComeetAdapter implements AtsAdapter {
    providerName = 'Comeet';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://www.comeet.com/careers-api/2.0/company/${encodeURIComponent(companyId)}/positions?token=`;
        const response = await fetchJson<any[]>(url, {}, 'Comeet');
        if (!response || !Array.isArray(response)) return [];

        const jobs: AtsJob[] = [];
        for (const listing of response) {
            try {
                const title = listing.name;
                if (!title) continue;

                const jobId = listing.uid || listing.id || '';
                const locationStr = listing.location?.name || '';
                const isRemote = locationStr.toLowerCase().includes('remote');
                const jobUrl = listing.url_active_page || listing.url || '';
                
                let description = '';
                if (listing.details && Array.isArray(listing.details)) {
                    description = listing.details.map((d: any) => d.value || '').join('\n').replace(/<[^>]+>/g, '');
                }

                jobs.push({
                    title,
                    company: listing.company_name || companyName,
                    applyLink: jobUrl,
                    applyUrl: jobUrl,
                    jobUrlDirect: jobUrl,
                    location: locationStr,
                    description,
                    descriptionSource: description ? 'API' : 'NONE',
                    isRemote,
                    postedAt: listing.time_updated || undefined,
                    department: listing.department || undefined,
                    source: 'ATS_COMEET',
                    sourceType: 'ATS',
                    site: 'comeet',
                    atsId: jobId,
                    atsType: 'comeet'
                });
            } catch (err) {
                // skip
            }
        }
        return jobs;
    }
}

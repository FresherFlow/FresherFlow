import { AtsAdapter, AtsJob, fetchJson, htmlToPlainText } from '../../../base/BaseAdapter.js';

export class HibobAdapter implements AtsAdapter {
    providerName = 'HiBob';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://api.hibob.com/v1/hiring/job-ads/search`;
        const payload = {
            companySlug: companyId,
            company: companyId,
            filters: [],
            fields: []
        };
        
        const response = await fetchJson<any>(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Company': companyId
            },
            body: JSON.stringify(payload)
        }, 'HiBob');

        if (!response) return [];
        
        let items: any[] = [];
        if (Array.isArray(response.jobAds)) items = response.jobAds;
        else if (Array.isArray(response.results)) items = response.results;
        else if (Array.isArray(response.items)) items = response.items;

        const jobs: AtsJob[] = [];
        const seen = new Set<string>();

        for (const entry of items) {
            try {
                const listAd = entry.jobAd || entry;
                const jobId = String(listAd?.id || entry?.id || '');
                if (!jobId || seen.has(jobId)) continue;
                seen.add(jobId);

                let detail = null;
                try {
                    // Fetch detail
                    const detailUrl = `https://api.hibob.com/v1/hiring/job-ads/${encodeURIComponent(jobId)}`;
                    const detailRes = await fetchJson<any>(detailUrl, {
                        headers: { 'X-Company': companyId }
                    }, 'HiBob Detail');
                    
                    if (detailRes) {
                        detail = detailRes.jobAd || detailRes;
                    }
                } catch (e) {
                    // skip detail if fail
                }

                const title = detail?.title || listAd?.title || detail?.name || listAd?.name;
                if (!title) continue;

                const city = detail?.city || listAd?.city;
                const state = detail?.state || listAd?.state;
                const country = detail?.country || listAd?.country;
                const locStr = [city, state, country].filter(Boolean).join(', ');
                
                const department = detail?.department || listAd?.department || detail?.team || listAd?.team;
                const employmentType = detail?.employmentType || listAd?.employmentType || detail?.jobType || listAd?.jobType;
                const workplaceType = detail?.workplaceType || listAd?.workplaceType;
                
                const jobUrl = detail?.url || listAd?.url || `https://${encodeURIComponent(companyId)}.careers.hibob.com/jobs/${encodeURIComponent(jobId)}`;
                const applyUrl = detail?.applyUrl || listAd?.applyUrl || `${jobUrl}/apply`;
                
                const isRemote = (detail?.remote === true) || (listAd?.remote === true) || 
                                (/remote/i.test(workplaceType || '')) || 
                                (/remote/i.test(title)) || 
                                (/remote/i.test(locStr));

                const htmlDesc = detail?.description || listAd?.description;

                jobs.push({
                    title,
                    company: companyName,
                    applyLink: jobUrl,
                    applyUrl,
                    jobUrlDirect: jobUrl,
                    location: locStr,
                    description: htmlToPlainText(htmlDesc || ''),
                    descriptionSource: htmlDesc ? 'HTML' : 'NONE',
                    isRemote,
                    postedAt: detail?.createdAt || listAd?.createdAt || detail?.publishedAt || listAd?.publishedAt || undefined,
                    department,
                    employmentType,
                    source: 'ATS_HIBOB',
                    sourceType: 'ATS',
                    site: 'hibob',
                    atsId: jobId,
                    atsType: 'hibob'
                });
            } catch (err) {
                // skip
            }
        }
        return jobs;
    }
}

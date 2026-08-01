import { AtsAdapter, AtsJob, fetchJson, htmlToPlainText } from '../../../base/BaseAdapter.js';

export class RipplingAdapter implements AtsAdapter {
    providerName = 'Rippling';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://ats.rippling.com/${encodeURIComponent(companyId)}/jobs?page=0&jobBoardSlug=${encodeURIComponent(companyId)}`;
        let jobs: AtsJob[] = [];
        
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            if (!res.ok) return [];
            
            const html = await res.text();
            const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
            if (!match || !match[1]) return [];
            
            const nextData = JSON.parse(match[1]);
            let items: any[] = [];
            const queries = nextData.props?.pageProps?.dehydratedState?.queries || [];
            
            for (const q of queries) {
                const dataItems = q.state?.data?.items;
                if (Array.isArray(dataItems)) {
                    items = dataItems;
                    break;
                }
            }
            if (!items.length) {
                const jobsProp = nextData.props?.pageProps?.jobs;
                if (Array.isArray(jobsProp)) {
                    items = jobsProp;
                }
            }
            
            for (const job of items) {
                const sourceId = job.uuid || job.id;
                if (!sourceId) continue;
                
                const title = job.title || job.name;
                if (!title) continue;
                
                let detail = job;
                
                try {
                    const detailUrl = `https://ats.rippling.com/api/v2/board/${encodeURIComponent(companyId)}/jobs/${encodeURIComponent(sourceId)}`;
                    const detailRes = await fetchJson<any>(detailUrl, {}, 'Rippling Detail');
                    if (detailRes && typeof detailRes === 'object') {
                        detail = detailRes.data || detailRes;
                    }
                } catch (e) {
                    // skip detail if it fails
                }
                
                const descriptionHtml = detail.description?.role || detail.description?.company || job.description?.role || job.description?.company || '';
                const applyUrl = detail.applyUrl || job.applyUrl || '';
                const jobUrl = detail.url || job.url || `https://ats.rippling.com/${encodeURIComponent(companyId)}/jobs/${encodeURIComponent(sourceId)}`;
                
                let locLabels: string[] = [];
                for (const loc of (detail.locations || job.locations || [])) {
                    const l = [loc.city || loc.name, loc.state || loc.stateCode, loc.country || loc.countryCode].filter(Boolean).join(', ');
                    if (l) locLabels.push(l);
                }
                for (const wl of (detail.workLocations || job.workLocations || [])) {
                    if (typeof wl === 'string') locLabels.push(wl);
                }
                const location = locLabels.join('; ');
                
                let isRemote = false;
                if ((detail.locations || job.locations || []).some((l: any) => l.workplaceType?.toUpperCase() === 'REMOTE') ||
                    (detail.workLocations || job.workLocations || []).some((l: any) => typeof l === 'string' && l.toLowerCase().includes('remote'))) {
                    isRemote = true;
                }
                if (/remote/i.test(location)) isRemote = true;
                
                jobs.push({
                    title,
                    company: detail.companyName || job.companyName || companyName,
                    applyLink: jobUrl,
                    applyUrl,
                    jobUrlDirect: jobUrl,
                    location,
                    description: htmlToPlainText(descriptionHtml),
                    descriptionSource: descriptionHtml ? 'HTML' : 'NONE',
                    isRemote,
                    postedAt: detail.createdOn || job.createdOn || undefined,
                    department: detail.department?.name || job.department?.name || undefined,
                    employmentType: detail.employmentType?.label || job.employmentType?.label || undefined,
                    source: 'ATS_RIPPLING',
                    sourceType: 'ATS',
                    site: 'rippling',
                    atsId: sourceId,
                    atsType: 'rippling'
                });
            }
        } catch (err) {
            // fail open
        }
        
        return jobs;
    }
}

import { parseJobUrl } from './url-parser.js';

export interface RawJobData {
    adapter: string;
    company: string;
    jobId: string;
    rawPayload: any;
    textForFiltering: string;
    locationsForFiltering: string[];
}

async function fetchJson<T = any>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', ...headers },
            signal: AbortSignal.timeout(12000)
        });
        if (!res.ok) return null;
        return await res.json() as T;
    } catch {
        return null;
    }
}

function stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Attempts to fetch a job using the native JSON API of the ATS.
 * If successful, returns the raw payload and extracted text/locations for fast filtering.
 * If API fails or ATS is unsupported by API, returns null (fallback to Playwright).
 */
export async function tryFetchNativeApi(urlStr: string): Promise<RawJobData | null> {
    const parsed = parseJobUrl(urlStr);
    if (!parsed) return null;

    const { adapter, company, jobId } = parsed;

    if (adapter === 'lever') {
        const data = await fetchJson<any>(`https://api.lever.co/v0/postings/${company}/${jobId}`);
        if (!data || !data.text) return null;
        
        let textForFiltering = data.descriptionPlain || '';
        for (const list of (data.lists || [])) {
            if (list.content) textForFiltering += ' ' + stripHtml(list.content);
        }
        
        const locations = [];
        if (data.categories?.location) locations.push(data.categories.location);
        if (Array.isArray(data.categories?.allLocations)) locations.push(...data.categories.allLocations);

        return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
    }

    if (adapter === 'greenhouse') {
        // Find board token
        const u = new URL(urlStr);
        const parts = u.pathname.split('/').filter(Boolean);
        const boardsIdx = parts.indexOf('boards');
        const boardToken = boardsIdx !== -1 ? parts[boardsIdx + 1] : parts[0];

        const data = await fetchJson<any>(`https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?content=true`);
        if (!data || !data.title) return null;

        const locations = [];
        if (data.location?.name) locations.push(data.location.name);
        for (const off of (data.offices || [])) {
            if (off.name) locations.push(off.name);
        }

        const textForFiltering = stripHtml(data.content || '');
        return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
    }

    if (adapter === 'ashby') {
        const data = await fetchJson<any>(`https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`);
        if (!data?.jobPostings) return null;

        const posting = data.jobPostings.find((j: any) => j.id === jobId || j.externalLink?.includes(jobId));
        if (!posting) return null;

        const locations = [];
        if (posting.isRemote) locations.push('Remote');
        if (Array.isArray(posting.locationIds) && Array.isArray(data.officeLocations)) {
            for (const locId of posting.locationIds) {
                const loc = data.officeLocations.find((o: any) => o.id === locId);
                if (loc?.name) locations.push(loc.name);
            }
        }

        const textForFiltering = stripHtml(posting.descriptionHtml || '');
        return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
    }

    if (adapter === 'smartrecruiters') {
        const data = await fetchJson<any>(`https://api.smartrecruiters.com/v1/companies/${company}/postings/${jobId}`);
        if (!data?.name) return null;

        const locations = [];
        if (data.location?.city) locations.push(data.location.city);
        if (data.location?.country) locations.push(data.location.country);
        if (data.location?.remote) locations.push('Remote');

        const html = (data.jobAd?.sections?.companyDescription?.text || '') +
                     (data.jobAd?.sections?.jobDescription?.text || '') +
                     (data.jobAd?.sections?.qualifications?.text || '');
        const textForFiltering = stripHtml(html);

        return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
    }

    // No native API available for this adapter (Workday, etc.)
    return null;
}

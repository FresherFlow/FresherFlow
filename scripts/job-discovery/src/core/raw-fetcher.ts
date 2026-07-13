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

    if (adapter === 'icims') {
        const url = `https://${company}/jobs/${jobId}/job?in_iframe=1`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
            if (!res.ok) return null;
            const html = await res.text();
            
            const textForFiltering = stripHtml(html);
            
            const locations: string[] = [];
            const locSpanMatch = html.match(/<span[^>]*class="[^"]*iCIMS_JobHeaderData[^"]*"[^>]*>(.*?)<\/span>/gi);
            if (locSpanMatch) {
                locSpanMatch.forEach(m => {
                    const txt = stripHtml(m).trim();
                    if (txt && !locations.includes(txt)) locations.push(txt);
                });
            }
            
            const locDtMatch = html.match(/<dt[^>]*>\s*(?:Job\s*)?Locations?\s*<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/is);
            if (locDtMatch && locDtMatch[1]) {
                const txt = stripHtml(locDtMatch[1]).trim();
                if (txt && !locations.includes(txt)) locations.push(txt);
            }

            const titleMatch = html.match(/<h1[^>]*class="[^"]*iCIMS_Header_Primary[^"]*"[^>]*>(.*?)<\/h1>/i) || html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch && titleMatch[1] ? stripHtml(titleMatch[1]).trim() : "Unknown API Job";
            
            if (title.includes(' in ')) {
                locations.push(title.split(' in ').pop()!);
            }

            return { adapter, company, jobId, rawPayload: { title, html }, textForFiltering, locationsForFiltering: locations };
        } catch {
            return null;
        }
    }

    if (adapter === 'workable') {
        // try public widget API: apply.workable.com/api/v1/widget/accounts/{company}?details=true
        const data = await fetchJson<any>(`https://apply.workable.com/api/v1/widget/accounts/${company}?details=true`);
        if (data?.jobs) {
            const job = data.jobs.find((j: any) => j.shortcode === jobId || j.id === jobId);
            if (job) {
                const locations = [];
                if (job.location) {
                    if (job.location.city) locations.push(job.location.city);
                    if (job.location.countryName) locations.push(job.location.countryName);
                }
                const textForFiltering = stripHtml(job.description || '') + ' ' + stripHtml(job.requirements || '');
                return { adapter, company, jobId, rawPayload: job, textForFiltering, locationsForFiltering: locations };
            }
        }
        return null;
    }

    if (adapter === 'recruitee') {
        const data = await fetchJson<any>(`https://${company}.recruitee.com/api/offers/${jobId}`);
        if (data?.offer) {
            const job = data.offer;
            const locations = [];
            if (job.location) locations.push(job.location);
            if (job.city) locations.push(job.city);
            if (job.country) locations.push(job.country);
            if (job.remote) locations.push('Remote');
            
            const textForFiltering = stripHtml(job.description || '') + ' ' + stripHtml(job.requirements || '');
            return { adapter, company, jobId, rawPayload: job, textForFiltering, locationsForFiltering: locations };
        }
        return null;
    }

    if (adapter === 'teamtailor') {
        const data = await fetchJson<any>(`https://careers.${company}.com/jobs/${jobId}.json`) || 
                     await fetchJson<any>(`https://${company}.teamtailor.com/jobs/${jobId}.json`);
        
        if (data && data.title) {
            const locations = [];
            if (data.location?.city) locations.push(data.location.city);
            if (data.location?.country) locations.push(data.location.country);
            if (data.remote_status) locations.push(data.remote_status);
            
            const textForFiltering = stripHtml(data.body || '');
            return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
        }
        return null;
    }

    if (adapter === 'workday') {
        try {
            const u = new URL(urlStr);
            // Example workday url: https://company.wd1.myworkdayjobs.com/Board/job/Location/Title_JR12345
            // API url needs to be /wday/cxs/company/Board/job/JR12345
            const parts = u.pathname.split('/job/');
            if (parts.length === 2) {
                const wdayApiUrl = `${u.origin}/wday/cxs${parts[0]}/job/${jobId}`;
                const res = await fetch(wdayApiUrl, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.jobPostingInfo) {
                        const job = data.jobPostingInfo;
                        const locations = [];
                        if (job.location) locations.push(job.location);
                        if (Array.isArray(job.additionalLocations)) locations.push(...job.additionalLocations);
                        
                        const textForFiltering = stripHtml(job.jobDescription || '');
                        return { adapter, company, jobId, rawPayload: data, textForFiltering, locationsForFiltering: locations };
                    }
                }
            }
        } catch {
            return null;
        }
        return null;
    }

    if (adapter === 'oracle') {
        try {
            const u = new URL(urlStr);
            const host = u.hostname;
            const pathParts = u.pathname.split('/');
            const sitesIdx = pathParts.indexOf('sites');
            const siteCode = sitesIdx !== -1 ? pathParts[sitesIdx + 1] : 'CX_1';
            
            let siteNumber = 'CX_1';
            
            // Try resolving siteNumber from siteSettings if siteCode is available
            if (siteCode && siteCode !== 'CX_1') {
                const settingsUrl = `https://${host}/hcmRestApi/CandidateExperience/en/siteSettings/${siteCode}`;
                const settingsRes = await fetch(settingsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    if (settingsData?.app?.siteNumber) {
                        siteNumber = settingsData.app.siteNumber;
                    }
                }
            }

            const apiUrl = `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?finder=ById;Id=${jobId},siteNumber=${siteNumber}`;
            const res = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'REST-Framework-Version': '2'
                },
                signal: AbortSignal.timeout(12000)
            });

            if (res.ok) {
                const data = await res.json();
                if (data?.items && data.items.length > 0) {
                    const job = data.items[0];
                    const locations: string[] = [];
                    if (job.PrimaryLocation) locations.push(job.PrimaryLocation);
                    if (job.WorkplaceType) locations.push(job.WorkplaceType);
                    if (Array.isArray(job.OtherLocations)) {
                        job.OtherLocations.forEach((l: any) => {
                            if (l.LocationName) locations.push(l.LocationName);
                        });
                    }
                    
                    const textForFiltering = stripHtml(job.Title || '') + ' ' + 
                                             stripHtml(job.ExternalDescriptionStr || '') + ' ' + 
                                             stripHtml(job.ExternalQualificationsStr || '');
                    
                    return {
                        adapter,
                        company: siteCode.toLowerCase(),
                        jobId,
                        rawPayload: job,
                        textForFiltering,
                        locationsForFiltering: locations
                    };
                }
            }
        } catch {
            return null;
        }
        return null;
    }

    // No native API available for this adapter (or fetching failed)
    return null;
}

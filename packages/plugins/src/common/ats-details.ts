import { htmlToPlainText, decodeHtmlEntities } from './html-utils.js';

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
    return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanDescription(text: string): string {
    return text
        .split('\n')
        .map(line => line.trimEnd())
        .filter((line, i, arr) => {
            if (/^[\s*]+$/.test(line) && line.trim().length === 0) {
                const prev = arr[i - 1] ?? 'X';
                return prev.trim().length > 0;
            }
            return true;
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function buildLeverDescription(data: any): string {
    const parts: string[] = [];
    const intro = (data.descriptionPlain || '').trim();
    if (intro) parts.push(intro);

    for (const list of (data.lists || [])) {
        const heading = (list.text || '').trim();
        const contentHtml = list.content || '';
        if (!contentHtml && !heading) continue;

        const items: string[] = [];
        const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        while ((m = liPattern.exec(contentHtml)) !== null) {
            const itemText = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (itemText) items.push(`- ${itemText}`);
        }

        if (items.length === 0) {
            const fallback = stripHtml(contentHtml);
            if (fallback) items.push(fallback);
        }

        if (items.length === 0 && !heading) continue;

        let canonicalHeading = heading;
        if (/what you.ll\s+(do|own|build|work|drive|manage)/i.test(heading) || /responsibilities|your role/i.test(heading)) {
            canonicalHeading = 'Responsibilities';
        } else if (/what we.re looking for|requirements|qualifications|who you are|must.have/i.test(heading)) {
            canonicalHeading = 'Requirements';
        } else if (/nice.to.have|preferred|bonus/i.test(heading)) {
            canonicalHeading = 'Preferred';
        } else if (/benefits|perks|what we offer|compensation/i.test(heading)) {
            canonicalHeading = 'Benefits';
        } else if (/about (the company|us)|who (we are|are we)/i.test(heading)) {
            continue;
        }

        const sectionLines = [`**${canonicalHeading}**`];
        if (items.length > 0) sectionLines.push(...items);
        parts.push(sectionLines.join('\n'));
    }

    return cleanDescription(parts.join('\n\n'));
}

export async function fetchGreenhouseDetails(applyLink: string): Promise<any> {
    try {
        const urlObj = new URL(applyLink);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        const boardsIdx = parts.indexOf('boards');
        const jobsIdx = parts.indexOf('jobs');
        if (jobsIdx === -1 || jobsIdx === parts.length - 1) return undefined;
        
        const boardToken = boardsIdx !== -1 ? parts[boardsIdx + 1] : parts[0];
        const jobId = parts[jobsIdx + 1];

        const data = await fetchJson<any>(
            `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?content=true`
        );
        if (!data || !data.title) return undefined;

        const rawLocations: string[] = [];
        if (data.location?.name) rawLocations.push(data.location.name);
        for (const off of (data.offices || [])) {
            if (off.name) rawLocations.push(off.name);
        }

        return {
            title: data.title,
            html: data.content || '',
            text: htmlToPlainText(data.content || ''),
            locations: rawLocations,
            company: data.company_name || ''
        };
    } catch {
        return undefined;
    }
}

export async function fetchLeverDetails(applyLink: string): Promise<any> {
    try {
        const urlObj = new URL(applyLink);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return undefined;
        const [company, jobId] = parts;

        const data = await fetchJson<any>(`https://api.lever.co/v0/postings/${company}/${jobId}`);
        if (!data || !data.text) return undefined;

        const locations: string[] = [];
        if (data.categories?.location) locations.push(data.categories.location);
        if (Array.isArray(data.categories?.allLocations)) locations.push(...data.categories.allLocations);

        let html = data.descriptionPlain || '';
        for (const list of (data.lists || [])) {
            if (list.text) html += `\n\n<h3>${list.text}</h3>\n`;
            if (list.content) html += list.content;
        }

        return {
            title: data.text,
            html: data.descriptionBody || html || '',
            text: buildLeverDescription(data),
            locations,
            company: ''
        };
    } catch {
        return undefined;
    }
}

export async function fetchAshbyDetails(applyLink: string): Promise<any> {
    try {
        const urlObj = new URL(applyLink);
        const parts = (urlObj.hostname === 'ashbyhq.com' || urlObj.hostname.endsWith('.ashbyhq.com'))
            ? urlObj.pathname.split('/').filter(Boolean)
            : [];
        if (parts.length < 2) return undefined;
        const [company, jobId] = parts;

        const data = await fetchJson<any>(
            `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`
        );
        if (!data?.jobPostings) return undefined;

        const posting = data.jobPostings.find((j: any) => j.id === jobId || j.externalLink?.includes(jobId));
        if (!posting) return undefined;

        const locations: string[] = [];
        if (posting.isRemote) {
            // remote
        } else if (Array.isArray(posting.locationIds) && Array.isArray(data.officeLocations)) {
            for (const locId of posting.locationIds) {
                const loc = data.officeLocations.find((o: any) => o.id === locId);
                if (loc?.name) locations.push(loc.name);
            }
        }

        return {
            title: posting.title,
            html: posting.descriptionHtml || '',
            text: htmlToPlainText(posting.descriptionHtml || ''),
            locations,
            company: ''
        };
    } catch {
        return undefined;
    }
}

export async function fetchSmartRecruitersDetails(applyLink: string): Promise<any> {
    try {
        const urlObj = new URL(applyLink);
        const parts = urlObj.pathname.split('/').filter(Boolean);

        let company: string;
        let jobId: string;

        if (urlObj.hostname === 'api.smartrecruiters.com') {
            if (parts.length < 5) return undefined;
            company = parts[2];
            jobId = parts[4];
        } else {
            if (parts.length < 2) return undefined;
            company = parts[0];
            jobId = /^\d+$/.test(parts[1]) ? parts[1] : parts[1].split('-')[0];
        }

        if (!company || !jobId) return undefined;

        const data = await fetchJson<any>(
            `https://api.smartrecruiters.com/v1/companies/${company}/postings/${jobId}`
        );
        if (!data?.name) return undefined;

        const locations: string[] = [];
        if (data.location?.city) locations.push(data.location.city);
        if (data.location?.country) locations.push(data.location.country);

        const html = (data.jobAd?.sections?.companyDescription?.text || '') +
                     (data.jobAd?.sections?.jobDescription?.text || '') +
                     (data.jobAd?.sections?.qualifications?.text || '');

        return {
            title: data.name,
            html,
            text: htmlToPlainText(html),
            locations,
            company: data.company?.name || '',
            applyLink: data.applyUrl || data.jobAd?.applyUrl || `https://careers.smartrecruiters.com/${company}/${jobId}`
        };
    } catch {
        return undefined;
    }
}

export async function fetchWorkdayDetails(applyLink: string, page?: any): Promise<any> {
    try {
        const urlObj = new URL(applyLink);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return undefined;

        // E.g., motorolasolutions.wd5.myworkdayjobs.com
        const companyDomain = urlObj.hostname.split('.')[0];
        const site = parts[0]; 
        
        // Remove the site part to get the external path, e.g., /job/Illinois-Remote-Work/Field-Engineer_R67664
        const externalPath = '/' + parts.slice(1).join('/');
        
        const apiUrl = `https://${urlObj.hostname}/wday/cxs/${companyDomain}/${site}${externalPath}`;

        const data = await fetchJson<any>(apiUrl);
        if (!data || !data.jobPostingInfo) return undefined;
        
        const info = data.jobPostingInfo;
        const title = info.title || '';
        const company = data.hiringOrganization?.name || '';
        const locations = [];
        if (info.location) locations.push(info.location);
        if (info.additionalLocations) locations.push(...info.additionalLocations);
        
        const html = info.jobDescription || '';

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locations.map((l: string) => l.trim()).filter(Boolean),
            company: company.trim()
        };
    } catch (e: any) {
        console.warn(`[Workday] details fetch failed: ${e.message}`);
        return undefined;
    }
}

export async function fetchOracleDetails(applyLink: string, page?: any): Promise<any> {
    if (!page) return undefined;
    try {
        await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);

        const title = await page.locator('.requisitionTitle, h1.title, [data-bind*="Title"]').first().innerText().catch(() => '');
        const locationEl = await page.locator('.requisition-detail-location, .job-location, [data-bind*="Location"]').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.content-block, .ats-description, #requisitionDescriptionInterface').innerHTML().catch(() => '');

        if (!title && !html) return undefined;

        const pageTitle = await page.title().catch(() => '');
        let company = '';
        if (pageTitle && title) {
            const cleanTitle = title.trim();
            const idx = pageTitle.indexOf(cleanTitle);
            if (idx !== -1) {
                company = pageTitle.replace(cleanTitle, '')
                    .replace(/^[\s-–|]+|[\s-–|]+$/g, '')
                    .replace(/\b(Careers|Jobs|Hiring|Opportunities|Recruitment|Portal)\b.*/i, '')
                    .replace(/^[\s-–|]+|[\s-–|]+$/g, '')
                    .trim();
            }
        }
        if (!company) {
            company = await page.locator('meta[property="og:site_name"]').getAttribute('content').catch(() => '') ||
                      await page.locator('meta[name="author"]').getAttribute('content').catch(() => '') || '';
        }

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map((l: string) => l.trim()).filter(Boolean),
            company: company.trim()
        };
    } catch (e: any) {
        console.warn(`[Oracle] details fetch failed: ${e.message}`);
        return undefined;
    }
}

export async function fetchICimsDetails(applyLink: string, page?: any): Promise<any> {
    if (!page) return undefined;
    try {
        await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2000);

        const title = await page.locator('#job-position-title, .iCIMS_JobTitle h1, h1.title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.iCIMS_JobLocation, .job-location, .icims-location').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.iCIMS_JobDescription, .jobDescription, #jobDescription').innerHTML().catch(() => '');

        if (!title && !html) return undefined;

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map((l: string) => l.trim()).filter(Boolean),
            company: ''
        };
    } catch (e: any) {
        console.warn(`[iCIMS] details fetch failed: ${e.message}`);
        return undefined;
    }
}

export async function fetchSuccessFactorsDetails(applyLink: string, page?: any): Promise<any> {
    if (!page) return undefined;
    try {
        await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        const title = await page.locator('[class*="jobTitle"], .jobTitle h1, .job-header h1').first().innerText().catch(() => '');
        const locationEl = await page.locator('[class*="jobLocation"], .job-location, .location').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('[class*="jobDesc"], .jobDescription, [id*="description"]').innerHTML().catch(() => '');

        if (!title && !html) return undefined;

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map((l: string) => l.trim()).filter(Boolean),
            company: ''
        };
    } catch (e: any) {
        console.warn(`[SuccessFactors] details fetch failed: ${e.message}`);
        return undefined;
    }
}

export async function fetchPhenomDetails(applyLink: string, page?: any): Promise<any> {
    if (!page) return undefined;
    try {
        await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3000);

        const title = await page.locator('.phenom-job-title, h1[class*="title"], .job-title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.phenom-job-location, [class*="location"]').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.phenom-job-description, [class*="description-container"]').innerHTML().catch(() => '');

        if (!title && !html) return undefined;

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map((l: string) => l.trim()).filter(Boolean),
            company: ''
        };
    } catch (e: any) {
        console.warn(`[Phenom] details fetch failed: ${e.message}`);
        return undefined;
    }
}

export async function fetchDarwinboxDetails(applyLink: string, page?: any): Promise<any> {
    if (!page) return undefined;
    try {
        await page.goto(applyLink, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(2000);

        const title = await page.locator('.job-title, h1.title, .career-title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.job-location, .location-label').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.job-description, .career-description, .desc-container').innerHTML().catch(() => '');

        if (!title && !html) return undefined;

        return {
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map((l: string) => l.trim()).filter(Boolean),
            company: ''
        };
    } catch (e: any) {
        console.warn(`[Darwinbox] details fetch failed: ${e.message}`);
        return undefined;
    }
}

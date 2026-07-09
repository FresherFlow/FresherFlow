/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ATS Native Extractor
 * 
 * Strategy:
 * 1. Try public JSON API (Lever, Greenhouse, Ashby, SmartRecruiters) — fastest, zero Playwright
 * 2. Fallback: Playwright with ATS-specific CSS selectors — since all companies on same ATS
 *    share the same HTML structure, one adapter covers ALL companies on that platform.
 */

import { Page } from 'playwright';

import { parseGreenhouseHtml, filterRealLocations } from './parsers/greenhouse-parser.js';

export interface NativeAtsData {
    title: string;
    company: string;
    text: string;
    html: string;
    // Structured fields from native API/HTML
    nativeSkills: string[];
    experienceLevel: string;
    workplaceType: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
    locations: string[];
    department: string;
    employmentType: string;
    salaryRange: string;
    postedAt: string;
    // Extra enrichment
    logoUrl: string;
    companyWebsite: string;
    allowedDegrees?: string[];
    allowedCourses?: string[];
    experienceMin?: number;
    experienceMax?: number;
    incentives?: string;
    selectionProcess?: string;
}

const EMPTY: NativeAtsData = {
    title: '', company: '', text: '', html: '',
    nativeSkills: [], experienceLevel: '', workplaceType: null,
    locations: [], department: '', employmentType: '',
    salaryRange: '', postedAt: '', logoUrl: '', companyWebsite: '',
    allowedDegrees: [], allowedCourses: [],
    experienceMin: undefined, experienceMax: undefined, incentives: ''
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HTTP HELPER
// ─────────────────────────────────────────────────────────────────────────────

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
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEVER — Public JSON API
// URL: jobs.lever.co/{company}/{jobId}
// API: api.lever.co/v0/postings/{company}/{jobId}
// ─────────────────────────────────────────────────────────────────────────────

async function extractLever(urlObj: URL): Promise<NativeAtsData | null> {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const [company, jobId] = parts;

    const data = await fetchJson<any>(`https://api.lever.co/v0/postings/${company}/${jobId}`);
    if (!data || !data.text) return null;

    let html = data.descriptionPlain || '';
    for (const list of (data.lists || [])) {
        if (list.text) html += `\n\n<h3>${list.text}</h3>\n`;
        if (list.content) html += list.content;
    }

    const locations: string[] = [];
    if (data.categories?.location) locations.push(data.categories.location);
    if (Array.isArray(data.categories?.allLocations)) locations.push(...data.categories.allLocations);

    let wpType: NativeAtsData['workplaceType'] = null;
    const wt = (data.workplaceType || '').toLowerCase();
    if (wt === 'remote') wpType = 'REMOTE';
    else if (wt === 'hybrid') wpType = 'HYBRID';
    else if (wt === 'onsite' || wt === 'on-site') wpType = 'ONSITE';

    return {
        ...EMPTY,
        title: data.text,
        company: '',
        html,
        text: stripHtml(html),
        nativeSkills: Array.isArray(data.tags) ? data.tags : [],
        locations,
        workplaceType: wpType,
        department: data.categories?.department || '',
        employmentType: data.categories?.commitment || '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GREENHOUSE — Public JSON API
// URL: boards.greenhouse.io/{token}/jobs/{jobId}  OR
//      company.greenhouse.io/boards/{token}/jobs/{jobId}
// API: boards-api.greenhouse.io/v1/boards/{token}/jobs/{jobId}?content=true
// ─────────────────────────────────────────────────────────────────────────────

async function extractGreenhouse(urlObj: URL, companySlug?: string): Promise<NativeAtsData | null> {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    // Patterns: /token/jobs/id OR /boards/token/jobs/id
    const boardsIdx = parts.indexOf('boards');
    const jobsIdx = parts.indexOf('jobs');
    if (jobsIdx === -1 || jobsIdx === parts.length - 1) return null;
    
    const boardToken = boardsIdx !== -1 ? parts[boardsIdx + 1] : parts[0];
    const jobId = parts[jobsIdx + 1];

    const data = await fetchJson<any>(
        `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?content=true`
    );
    if (!data || !data.title) return null;

    const rawLocations: string[] = [];
    if (data.location?.name) rawLocations.push(data.location.name);
    for (const off of (data.offices || [])) {
        if (off.name) rawLocations.push(off.name);
    }
    const locations = filterRealLocations(rawLocations);

    let experienceLevel = '';
    for (const m of (data.metadata || [])) {
        if (m.name && /experience|level|employment/i.test(m.name) && m.value) {
            experienceLevel += String(m.value) + ' ';
        }
    }

    const parsed = parseGreenhouseHtml(data.content || '', companySlug);

    return {
        ...EMPTY,
        title: data.title,
        html: data.content || '',
        text: parsed.description, // clean markdown description
        locations,
        experienceLevel: experienceLevel.trim(),
        department: data.departments?.[0]?.name || '',
        nativeSkills: parsed.requiredSkills,
        allowedDegrees: parsed.allowedDegrees,
        allowedCourses: parsed.allowedCourses,
        experienceMin: parsed.experienceMin,
        experienceMax: parsed.experienceMax,
        incentives: parsed.incentives,
        selectionProcess: parsed.selectionProcess,
        workplaceType: parsed.workplaceType || null
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASHBY — Public JSON API
// URL: jobs.ashbyhq.com/{company}/{jobId}
// API: api.ashbyhq.com/posting-api/job-board/{company}?includeCompensation=true
// Then filter by jobId
// ─────────────────────────────────────────────────────────────────────────────

async function extractAshby(urlObj: URL): Promise<NativeAtsData | null> {
    const parts = urlObj.hostname.includes('ashbyhq.com')
        ? urlObj.pathname.split('/').filter(Boolean)
        : [];
    if (parts.length < 2) return null;
    const [company, jobId] = parts;

    // Fetch all postings and find our job
    const data = await fetchJson<any>(
        `https://api.ashbyhq.com/posting-api/job-board/${company}?includeCompensation=true`
    );
    if (!data?.jobPostings) return null;

    const posting = data.jobPostings.find((j: any) => j.id === jobId || j.externalLink?.includes(jobId));
    if (!posting) return null;

    const locations: string[] = [];
    if (posting.isRemote) {
        // Remote role
    } else if (Array.isArray(posting.locationIds) && Array.isArray(data.officeLocations)) {
        for (const locId of posting.locationIds) {
            const loc = data.officeLocations.find((o: any) => o.id === locId);
            if (loc?.name) locations.push(loc.name);
        }
    }

    return {
        ...EMPTY,
        title: posting.title,
        html: posting.descriptionHtml || '',
        text: stripHtml(posting.descriptionHtml || ''),
        locations,
        workplaceType: posting.isRemote ? 'REMOTE' : null,
        department: posting.department || '',
        employmentType: posting.employmentType || '',
        salaryRange: posting.compensationTierSummary || '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMARTRECRUITERS — Public JSON API
// URL: careers.smartrecruiters.com/{Company}/{jobId}
// API: api.smartrecruiters.com/v1/companies/{Company}/postings/{jobId}
// ─────────────────────────────────────────────────────────────────────────────

async function extractSmartRecruiters(urlObj: URL): Promise<NativeAtsData | null> {
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const [company, jobIdSlug] = parts;
    // jobIdSlug can be "12345-job-title", we need the ID prefix
    const jobId = jobIdSlug.split('-')[0];

    const data = await fetchJson<any>(
        `https://api.smartrecruiters.com/v1/companies/${company}/postings/${jobId}`
    );
    if (!data?.name) return null;

    const locations: string[] = [];
    if (data.location?.city) locations.push(data.location.city);
    if (data.location?.country) locations.push(data.location.country);

    let wpType: NativeAtsData['workplaceType'] = null;
    const rm = data.typeOfRemote?.label?.toLowerCase() || '';
    if (rm.includes('fully') || rm.includes('remote')) wpType = 'REMOTE';
    else if (rm.includes('hybrid')) wpType = 'HYBRID';
    else if (data.location?.remote === false) wpType = 'ONSITE';

    const html = (data.jobAd?.sections?.companyDescription?.text || '') +
                 (data.jobAd?.sections?.jobDescription?.text || '') +
                 (data.jobAd?.sections?.qualifications?.text || '');

    return {
        ...EMPTY,
        title: data.name,
        company: data.company?.name || '',
        html,
        text: stripHtml(html),
        locations,
        workplaceType: wpType,
        department: data.department?.label || '',
        employmentType: data.typeOfEmployment?.label || '',
        salaryRange: data.compensation?.range ? `${data.compensation.range.min}-${data.compensation.range.max} ${data.compensation.currency || ''}`.trim() : '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYWRIGHT-BASED ADAPTERS (same HTML structure per ATS platform)
// ─────────────────────────────────────────────────────────────────────────────

// Workday: all companies share the same Workday SPA HTML structure
async function extractWorkdayPlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);

        // Workday job detail selectors (consistent across ALL Workday clients)
        const title = await page.locator('[data-automation-id="jobPostingHeader"]').innerText().catch(() => '');
        const company = await page.locator('[data-automation-id="company-name"]').innerText().catch(() => '');
        const locationEl = await page.locator('[data-automation-id="locations"]').allInnerTexts().catch(() => [] as string[]);
        const jobType = await page.locator('[data-automation-id="time-type"]').innerText().catch(() => '');
        const postedOn = await page.locator('[data-automation-id="postedOn"]').innerText().catch(() => '');
        const html = await page.locator('[data-automation-id="jobPostingDescription"]').innerHTML().catch(() => '');
        
        // Workday has a workplace type field
        const workplaceText = await page.locator('[data-automation-id="workplace-type"]').innerText().catch(() => '');
        
        let wpType: NativeAtsData['workplaceType'] = null;
        if (/remote/i.test(workplaceText)) wpType = 'REMOTE';
        else if (/hybrid/i.test(workplaceText)) wpType = 'HYBRID';
        else if (/on.?site|onsite/i.test(workplaceText)) wpType = 'ONSITE';

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            company: company.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
            workplaceType: wpType,
            employmentType: jobType.trim(),
            postedAt: postedOn.trim(),
        };
    } catch (e) {
        console.warn(`[Workday] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// Oracle (HCM): consistent selectors across all Oracle Cloud clients
async function extractOraclePlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(4000);

        const title = await page.locator('.requisitionTitle, h1.title, [data-bind*="Title"]').first().innerText().catch(() => '');
        const locationEl = await page.locator('.requisition-detail-location, .job-location, [data-bind*="Location"]').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.content-block, .ats-description, #requisitionDescriptionInterface').innerHTML().catch(() => '');
        const postedOn = await page.locator('.posted-date, [data-bind*="PostingStartDate"]').innerText().catch(() => '');

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
            postedAt: postedOn.trim(),
        };
    } catch (e) {
        console.warn(`[Oracle] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// iCIMS: consistent selectors across all iCIMS client career sites
async function extractICIMSPlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2000);

        const title = await page.locator('#job-position-title, .iCIMS_JobTitle h1, h1.title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.iCIMS_JobLocation, .job-location, .icims-location').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.iCIMS_JobDescription, .jobDescription, #jobDescription').innerHTML().catch(() => '');

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
        };
    } catch (e) {
        console.warn(`[iCIMS] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// SuccessFactors: consistent selectors across all SAP SuccessFactors career sites
async function extractSuccessFactorsPlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);

        const title = await page.locator('[class*="jobTitle"], .jobTitle h1, .job-header h1').first().innerText().catch(() => '');
        const locationEl = await page.locator('[class*="jobLocation"], .job-location, .location').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('[class*="jobDesc"], .jobDescription, [id*="description"]').innerHTML().catch(() => '');
        const jobType = await page.locator('[class*="jobType"], .employment-type').innerText().catch(() => '');

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
            employmentType: jobType.trim(),
        };
    } catch (e) {
        console.warn(`[SuccessFactors] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// Phenom: consistent selectors across all Phenom career sites
async function extractPhenomPlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(3000);

        const title = await page.locator('.phenom-job-title, h1[class*="title"], .job-title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.phenom-job-location, [class*="location"]').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.phenom-job-description, [class*="description-container"]').innerHTML().catch(() => '');

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
        };
    } catch (e) {
        console.warn(`[Phenom] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// Darwinbox: common in India, consistent HTML structure
async function extractDarwinboxPlaywright(page: Page, url: string): Promise<NativeAtsData | null> {
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2000);

        const title = await page.locator('.job-title, h1.title, .career-title').first().innerText().catch(() => '');
        const locationEl = await page.locator('.job-location, .location-label').allInnerTexts().catch(() => [] as string[]);
        const html = await page.locator('.job-description, .career-description, .desc-container').innerHTML().catch(() => '');

        if (!title && !html) return null;

        return {
            ...EMPTY,
            title: title.trim(),
            html,
            text: stripHtml(html),
            locations: locationEl.map(l => l.trim()).filter(Boolean),
        };
    } catch (e) {
        console.warn(`[Darwinbox] Playwright extraction failed: ${(e as Error).message}`);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try native JSON API first. If it fails or the platform doesn't have a
 * public API, fall back to Playwright with ATS-specific selectors.
 * 
 * Since all companies on the same ATS use the same HTML structure,
 * one Playwright adapter covers ALL companies on that platform.
 */
export async function extractNativeAtsData(
    url: string,
    source: string,
    page?: Page,
    companySlug?: string
): Promise<NativeAtsData | null> {
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase();

        // ── JSON API Adapters (no Playwright needed) ──────────────────────────

        if (host.includes('lever.co')) {
            const result = await extractLever(urlObj);
            if (result) { console.log('[Native] Lever JSON API success'); return result; }
        }

        if (host.includes('greenhouse.io') || source === 'ATS_GREENHOUSE') {
            const result = await extractGreenhouse(urlObj, companySlug);
            if (result) { console.log('[Native] Greenhouse JSON API success'); return result; }
        }

        // Company-hosted Greenhouse pages (e.g. mthree.com/careers/job/?gh_jid=123456)
        // Use gh_jid query param + slug from companies CDN to call Greenhouse API
        const ghJid = urlObj.searchParams.get('gh_jid');
        if (ghJid && companySlug) {
            const result = await fetchJson<any>(
                `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs/${ghJid}?content=true`
            );
            if (result && result.title) {
                console.log(`[Native] Greenhouse via gh_jid+slug (${companySlug}/${ghJid}) success`);
                const rawLocations: string[] = [];
                if (result.location?.name) rawLocations.push(result.location.name);
                for (const off of (result.offices || [])) if (off.name) rawLocations.push(off.name);
                const parsed = parseGreenhouseHtml(result.content || '', companySlug);
                return {
                    ...EMPTY,
                    title: result.title,
                    html: result.content || '',
                    text: parsed.description,
                    locations: filterRealLocations(rawLocations),
                    department: result.departments?.[0]?.name || '',
                    nativeSkills: parsed.requiredSkills,
                    allowedDegrees: parsed.allowedDegrees,
                    allowedCourses: parsed.allowedCourses,
                    experienceMin: parsed.experienceMin,
                    experienceMax: parsed.experienceMax,
                    incentives: parsed.incentives,
                    selectionProcess: parsed.selectionProcess,
                    workplaceType: parsed.workplaceType || null
                };
            }
        }

        if (host.includes('ashbyhq.com') || source === 'ATS_ASHBY') {
            const result = await extractAshby(urlObj);
            if (result) { console.log('[Native] Ashby JSON API success'); return result; }
        }

        if (host.includes('smartrecruiters.com') || source === 'ATS_SMARTRECRUITERS') {
            const result = await extractSmartRecruiters(urlObj);
            if (result) { console.log('[Native] SmartRecruiters JSON API success'); return result; }
        }

        // ── Playwright Adapters (same HTML per ATS platform) ─────────────────
        if (!page) return null; // Can't do Playwright without a page handle

        if (host.includes('myworkdayjobs.com') || source === 'ATS_WORKDAY') {
            const result = await extractWorkdayPlaywright(page, url);
            if (result) { console.log('[Native] Workday Playwright adapter success'); return result; }
        }

        if (host.includes('oraclecloud.com') || source === 'ATS_ORACLE') {
            const result = await extractOraclePlaywright(page, url);
            if (result) { console.log('[Native] Oracle Playwright adapter success'); return result; }
        }

        if (host.includes('icims.com') || source === 'ATS_ICIMS') {
            const result = await extractICIMSPlaywright(page, url);
            if (result) { console.log('[Native] iCIMS Playwright adapter success'); return result; }
        }

        if (host.includes('successfactors.') || host.includes('sapsf.') || source === 'ATS_SUCCESSFACTORS') {
            const result = await extractSuccessFactorsPlaywright(page, url);
            if (result) { console.log('[Native] SuccessFactors Playwright adapter success'); return result; }
        }

        if (source === 'ATS_PHENOM') {
            const result = await extractPhenomPlaywright(page, url);
            if (result) { console.log('[Native] Phenom Playwright adapter success'); return result; }
        }

        if (host.includes('darwinbox.in') || source === 'ATS_DARWINBOX') {
            const result = await extractDarwinboxPlaywright(page, url);
            if (result) { console.log('[Native] Darwinbox Playwright adapter success'); return result; }
        }

    } catch (e) {
        console.warn(`[NativeATS] Error for ${url}: ${(e as Error).message}`);
    }

    return null;
}

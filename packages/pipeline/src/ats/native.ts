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

import { parseJobUrl, demuxJobTitle, extractSkills } from '@fresherflow/parser';
import { CANONICAL_CITIES_MAP } from '@fresherflow/parser/metadata';
import { PLUGIN_REGISTRY, decodeHtmlEntities } from '@fresherflow/plugins';
import { extractAtsBoard, extractAtsJobId } from './detector.js';

/**
 * Normalizes raw ATS location strings to canonical city names.
 * e.g. "Bengaluru-VTP" → "Bangalore", "bengaluru" → "Bangalore", "India" → removed
 * Falls back to the original string if no match.
 */
function normalizeLocations(rawLocations: string[]): string[] {
    const result: string[] = [];
    const seen = new Set<string>();

    // Words that are countries/generic and not useful as city names
    const SKIP_TOKENS = new Set(['india', 'remote', 'pan india', 'multiple locations', 'various locations', 'anywhere']);

    for (const raw of rawLocations) {
        if (!raw || raw.trim().length < 2) continue;
        const lower = raw.trim().toLowerCase();
        if (SKIP_TOKENS.has(lower)) continue;

        // Drop bare ISO country/region codes (e.g. "IN", "US", "MH,IN", "KA")
        // but keep real city names of the same length (e.g. "Pune", "Citi").
        if (/^[a-z]{2}(?:,[a-z]{2})*$/.test(lower) || /^\d{4,6}$/.test(lower)) continue;

        // Try exact match first
        if (CANONICAL_CITIES_MAP.has(lower)) {
            const canonical = CANONICAL_CITIES_MAP.get(lower)!;
            if (!seen.has(canonical)) { seen.add(canonical); result.push(canonical); }
            continue;
        }

        // Try matching against first token (e.g. "Bengaluru-VTP" → "bengaluru")
        const firstToken = lower.split(/[-,\s]+/)[0];
        if (firstToken && CANONICAL_CITIES_MAP.has(firstToken)) {
            const canonical = CANONICAL_CITIES_MAP.get(firstToken)!;
            if (!seen.has(canonical)) { seen.add(canonical); result.push(canonical); }
            continue;
        }

        // Try partial match — if any canonical city key appears in the raw string
        let matched = false;
        for (const [key, canonical] of CANONICAL_CITIES_MAP.entries()) {
            if (lower.includes(key)) {
                if (!seen.has(canonical)) { seen.add(canonical); result.push(canonical); }
                matched = true;
                break;
            }
        }

        // Keep as-is if no canonical match found (don't drop data)
        if (!matched) {
            const cleaned = raw.trim();
            if (!seen.has(cleaned)) { seen.add(cleaned); result.push(cleaned); }
        }
    }
    return result;
}

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
    applyLink?: string;  // Canonical public URL (returned by some adapters to override discovery URL)
}

const EMPTY: NativeAtsData = {
    title: '', company: '', text: '', html: '',
    nativeSkills: [], experienceLevel: '', workplaceType: null,
    locations: [], department: '', employmentType: '',
    salaryRange: '', postedAt: '', logoUrl: '', companyWebsite: '',
    allowedDegrees: [], allowedCourses: [],
    experienceMin: undefined, experienceMax: undefined, incentives: '', applyLink: undefined
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
// GENERIC JSON-LD / META EXTRACTION (zero-LLM fallback for any ATS URL)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(12000)
        });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

interface JsonLdJobPosting {
    title?: string;
    description?: string;
    datePosted?: string;
    employmentType?: string;
    hiringOrganization?: { name?: string };
    jobLocation?: unknown;
    applicantLocationRequirements?: unknown;
    jobLocationType?: string;
    url?: string;
}

function collectJsonLdNodes(raw: string): JsonLdJobPosting[] {
    const nodes: JsonLdJobPosting[] = [];
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return nodes;
    }
    const candidates = Array.isArray(parsed) ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed['@graph']) ? parsed['@graph']
        : [parsed];
    for (const node of candidates) {
        if (!node || typeof node !== 'object') continue;
        const type = String(node['@type'] || '').toLowerCase();
        if (type.includes('jobposting')) nodes.push(node as JsonLdJobPosting);
    }
    return nodes;
}

function locationValues(input: unknown): string[] {
    if (!input) return [];
    const arr = Array.isArray(input) ? input : [input];
    const out: string[] = [];
    for (const loc of arr) {
        if (!loc || typeof loc !== 'object') {
            if (typeof loc === 'string' && loc.trim()) out.push(loc.trim());
            continue;
        }
        const l = loc as any;
        const addr = l.address && typeof l.address === 'object' ? l.address : l;
        for (const field of ['addressLocality', 'addressRegion', 'addressCountry', 'name']) {
            const v = addr[field];
            if (typeof v === 'string' && v.trim()) out.push(v.trim());
            else if (v && typeof v === 'object' && typeof v.name === 'string' && v.name.trim()) out.push(v.name.trim());
        }
        if (l.name && typeof l.name === 'string' && l.name.trim() && !out.includes(l.name.trim())) {
            out.push(l.name.trim());
        }
    }
    return out;
}

function metaContent(html: string, patterns: RegExp[]): string | undefined {
    for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1] && m[1].trim()) return m[1].trim();
    }
    return undefined;
}

/** ATS hostnames / site labels that are never a real hiring company name. */
const NON_COMPANY_LABELS = /^(?:workable|hire|hiring|job-boards?|jobboard|google docs|amazon\.jobs|hr|jobs|careers?|external career site|linkedin|indeed|unstop|buddy4study|playpower labs|stripe|pinterest|meta|headout)$/i;

/** Page titles that are search/landing shells, not individual jobs. */
const NON_JOB_TITLES = /^(?:external career site|internship details?|stripe careers?|headout li|top paying medical careers?|careers?|jobs?|job details?|search jobs?|search results?|unstop\s*-\s*competitions?|home)$/i;

/** Strip recruiting-site prefixes/noise and SAP client-number codes from company names. */
function cleanCompanyName(raw: string | undefined): string {
    if (!raw) return '';
    let c = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
    // "Jobs at Icertis" → "Icertis", "Datavail Career Site" → "Datavail"
    const jobsAt = c.match(/^jobs?\s+at\s+(.+)$/i);
    if (jobsAt) c = jobsAt[1].trim();
    c = c.replace(/\s*[-–|]?\s*(?:(?:external\s*)?candidate\s+experience\s*site|career\s*site|careers?|jobs?|job\s*portal|portal)\s*$/i, '').trim();
    // SAP/Workday client codes: "5110 Pitney Bowes India Pvt. Ltd.", ".IN1 Harman International", "6200 - India - VWR"
    c = c.replace(/^\.?(?:IN|US|GB|CA|AU)\d+\s+/i, '').trim();
    c = c.replace(/^\d{3,5}\s*[-–]?\s*/,'').trim();
    // "Hindustancopper" style: normalise camel-ish hostname casing
    if (/^[a-z]+[A-Z][a-z]+$/.test(c)) {
        c = c.replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    if (NON_COMPANY_LABELS.test(c)) return '';
    // Reject single generic words
    if (c.length < 2 || /^(?:n\/a|na|unknown|not specified)$/i.test(c)) return '';
    return c;
}

/** A title that is really a legal entity name is not a job role. */
function looksLikeCompanyName(title: string): boolean {
    return /\b(?:limited|ltd\.?|private|pvt\.?|inc\.?|incorporated|corp(?:oration)?|llc|gmbh|plc|company|co\.?)\b\s*$/i.test(title.trim());
}

/**
 * Tier-2: derive a clean title from the URL path slug when HTML carries no
 * usable title (e.g. Wipro's SPA shell renders "Job Details | Wipro Limited").
 *   /job/Associate-Analyst/193367-en_US → "Associate Analyst"
 *   /jobs/10449085/central-ops-support → "Central Ops Support"
 */
function titleFromUrlPath(pageUrl: string): string {
    try {
        const u = new URL(pageUrl);
        const parts = u.pathname.split('/').filter(Boolean);
        // Prefer the segment right after a 'job'/'jobs' marker
        const jobIdx = parts.findIndex(p => /^jobs?$/i.test(p));
        const candidates = jobIdx !== -1 ? parts.slice(jobIdx + 1) : parts;
        for (const seg of candidates) {
            if (!seg || seg.length < 4) continue;
            if (/^\d+$/.test(seg)) continue;                          // numeric ids
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(seg)) continue; // UUIDs
            if (/^[a-z]{2}(-[A-Z]{2})?$/.test(seg)) continue;          // locales
            if (/^[a-z]{2}_[A-Z]{2}$/.test(seg)) continue;             // en_US
            if (/^[A-Za-z]+_[A-Za-z]+\.\w+$/.test(seg)) continue;      // file names
            if (seg.includes('_') && /\d/.test(seg)) continue;         // REQ-26671 style
            const words = seg.replace(/\.[a-z]+$/i, '').split(/[-_]+/).filter(Boolean);
            if (words.length < 2) continue;
            const title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (title.length >= 6) return title;
        }
    } catch { /* ignore */ }
    return '';
}

/**
 * Tier-1 universal extractor: parse Schema.org JobPosting JSON-LD and OpenGraph/meta
 * tags from raw HTML. Deterministic, no LLM. Works for HSBC, GE HealthCare, Wipro,
 * Capgemini, and any other ATS/careers site that publishes structured data.
 */
export function extractFromStructuredHtml(html: string, pageUrl: string): NativeAtsData | null {
    if (!html) return null;

    let ldTitle: string | undefined;
    let ldCompany: string | undefined;
    let ldDescriptionHtml: string | undefined;
    let ldLocations: string[] = [];
    let ldDatePosted: string | undefined;
    let ldEmploymentType: string | undefined;
    let ldRemote = false;
    let ldApply: string | undefined;

    // Collect all <script type="application/ld+json"> blocks (regex avoids a cheerio dep here)
    const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = scriptRe.exec(html)) !== null) {
        const nodes = collectJsonLdNodes(m[1].trim());
        if (nodes.length === 0) continue;
        const node = nodes[0];
        if (!ldTitle && node.title) ldTitle = String(node.title).trim();
        if (!ldCompany && node.hiringOrganization?.name) ldCompany = String(node.hiringOrganization.name).trim();
        if (!ldDescriptionHtml && typeof node.description === 'string' && node.description.trim()) {
            ldDescriptionHtml = node.description;
        }
        if (ldLocations.length === 0) {
            const locs = locationValues(node.jobLocation);
            ldLocations = locs.length > 0 ? locs : locationValues(node.applicantLocationRequirements);
        }
        if (!ldDatePosted && node.datePosted) ldDatePosted = String(node.datePosted);
        if (!ldEmploymentType && node.employmentType) {
            ldEmploymentType = Array.isArray(node.employmentType) ? String(node.employmentType[0]) : String(node.employmentType);
        }
        if (!ldRemote && typeof node.jobLocationType === 'string' && node.jobLocationType.toUpperCase() === 'TELECOMMUTE') {
            ldRemote = true;
        }
        if (!ldApply && node.url) ldApply = String(node.url);
    }

    // Meta tag fallback
    const ogTitle = metaContent(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    ]);
    const metaTitle = metaContent(html, [/<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i]);
    const titleTag = metaContent(html, [/<title[^>]*>([^<]{3,300})<\/title>/i]);
    const ogSite = metaContent(html, [
        /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    ]);
    const ogDesc = metaContent(html, [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    const rawTitle = decodeHtmlEntities(ldTitle || ogTitle || metaTitle || titleTag || '');
    const demux = demuxJobTitle(rawTitle);

    let title = decodeHtmlEntities(demux.title)
        .replace(/\s*[-–|]\s*(?:Job\s*Detail|Careers?\s*Marketplace|Jobs?\s*in\s*\d{4})\s*$/i, '')
        .trim();
    let company = cleanCompanyName(ldCompany) || demux.company || cleanCompanyName(ogSite);
    const locations = ldLocations.length > 0 ? ldLocations : (demux.location ? [demux.location] : []);

    // Tier-2 fallback: dissect the URL path for a title slug
    // e.g. careers.wipro.com/job/Associate-Analyst/193367-en_US → "Associate Analyst"
    if (!title || title.length < 3) {
        title = titleFromUrlPath(pageUrl);
    }

    if (!title || title.length < 3) return null;

    // Reject search/landing pages that are not an individual job posting.
    // They must fall through to the Playwright fallback (or be rejected upstream).
    if (NON_JOB_TITLES.test(title.trim()) || /\(\s*[\d,]+\+\s*(?:open\s+)?(?:roles?|jobs?|positions?)\s*\)/i.test(title)) {
        return null;
    }

    // A "title" that is really the company name (e.g. "Hindustan Copper Limited")
    if (looksLikeCompanyName(title) && !company) {
        company = cleanCompanyName(title);
        title = titleFromUrlPath(pageUrl);
        if (!title) return null;
    }

    const htmlDesc = ldDescriptionHtml || '';
    const text = decodeHtmlEntities(ldDescriptionHtml ? stripHtml(ldDescriptionHtml) : (ogDesc || ''));

    // URL-host fallback for company when nothing else matched
    if (!company) {
        try {
            const u = new URL(pageUrl);
            const labels = u.hostname.split('.');
            for (const raw of labels) {
                if (/^(www|careers?|jobs?|apply|portal|recruiting|wd\d+|co|com|in|org|net)$/.test(raw)) continue;
                if (raw.length < 3) continue;
                company = cleanCompanyName(raw.charAt(0).toUpperCase() + raw.slice(1));
                if (company) break;
            }
        } catch { /* ignore */ }
    }

    console.log(`[Native] Structured HTML (JSON-LD/meta) success for ${pageUrl}`);

    return {
        ...EMPTY,
        title,
        company: company || '',
        html: htmlDesc,
        text,
        locations: normalizeLocations(locations),
        postedAt: ldDatePosted || '',
        employmentType: ldEmploymentType || '',
        workplaceType: ldRemote ? 'REMOTE' : (/\bremote\b/i.test(text) ? 'REMOTE' : null),
        nativeSkills: text ? extractSkills(text, locations) : [],
        applyLink: ldApply
    };
}

/**
 * Cleans up description text:
 * - Collapses lines that are only whitespace/asterisks
 * - Collapses 3+ consecutive newlines to 2
 * - Removes trailing spaces on each line
 * - Ensures bullet points start with '- ' not '\n- '
 */
function cleanDescription(text: string): string {
    return text
        .split('\n')
        .map(line => line.trimEnd())
        // Remove lines that are ONLY whitespace or only asterisks/spaces
        .filter((line, i, arr) => {
            if (/^[\s*]+$/.test(line) && line.trim().length === 0) {
                // Keep at most one blank line between content
                const prev = arr[i - 1] ?? 'X';
                return prev.trim().length > 0;
            }
            return true;
        })
        .join('\n')
        // Collapse 3+ consecutive newlines to exactly 2
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Builds a structured, template-compliant description from Lever's API response.
 * Lever gives us: descriptionPlain (role intro) + lists[] (sections with headings + bullet items)
 * Output format: matches docs/data/templates.md
 *   **Section Heading**\n- bullet 1\n- bullet 2\n\n**Next Section**\n...
 */
function buildLeverDescription(data: any): string {
    const parts: string[] = [];

    // Role intro (descriptionPlain is plain text — keep as-is, cleaned)
    const intro = (data.descriptionPlain || '').trim();
    if (intro) parts.push(intro);

    // Each list becomes a section: **heading** + bullet items
    for (const list of (data.lists || [])) {
        const heading = (list.text || '').trim();
        const contentHtml = list.content || '';
        if (!contentHtml && !heading) continue;

        // Extract <li> items from the content HTML
        const items: string[] = [];
        const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        while ((m = liPattern.exec(contentHtml)) !== null) {
            const itemText = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (itemText) items.push(`- ${itemText}`);
        }

        // If no <li> items, fall back to stripping all HTML
        if (items.length === 0) {
            const fallback = stripHtml(contentHtml);
            if (fallback) items.push(fallback);
        }

        if (items.length === 0 && !heading) continue;

        // Map common Lever section headings to canonical template headings
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
            // Skip company boilerplate sections
            continue;
        }

        const sectionLines = [`**${canonicalHeading}**`];
        if (items.length > 0) sectionLines.push(...items);
        parts.push(sectionLines.join('\n'));
    }

    return cleanDescription(parts.join('\n\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Dispatch to @fresherflow/plugins Registry ───
export async function extractNativeAtsData(
    url: string,
    source: string,
    page?: Page,
    companySlug?: string
): Promise<NativeAtsData | null> {
    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase();

        // 1. Direct Greenhouse URL extraction
        const ghParsed = extractAtsJobId(url);
        if (ghParsed && ghParsed.provider === 'greenhouse' && ghParsed.board) {
            const board = ghParsed.board;
            const jobId = ghParsed.jobId;
            const result = await fetchJson<any>(
                `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}?content=true`
            );
            if (result && result.title) {
                console.log(`[Native] Greenhouse direct API (${board}/${jobId}) success`);
                const rawLocations: string[] = [];
                if (result.location?.name) rawLocations.push(result.location.name);
                for (const off of (result.offices || [])) if (off.name) rawLocations.push(off.name);
                return {
                    ...EMPTY,
                    title: decodeHtmlEntities(result.title),
                    company: cleanCompanyName(result.company_name || board),
                    html: result.content || '',
                    text: decodeHtmlEntities(result.content ? result.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
                    locations: rawLocations,
                    department: result.departments?.[0]?.name || '',
                };
            }
        }

        // 1c. Direct Lever URL extraction
        const leverParsed = extractAtsJobId(url);
        if (leverParsed && leverParsed.provider === 'lever' && leverParsed.board) {
            const company = leverParsed.board;
            const jobId = leverParsed.jobId;
            const result = await fetchJson<any>(`https://api.lever.co/v0/postings/${company}/${jobId}`);
            if (result && result.text) {
                console.log(`[Native] Lever direct API (${company}/${jobId}) success`);
                const desc = [
                    result.descriptionPlain,
                    ...(result.lists || []).map((l: any) => `\n**${l.text}**\n${l.content}`)
                ].join('\n\n');
                return {
                    ...EMPTY,
                    title: decodeHtmlEntities(result.text),
                    company: cleanCompanyName(company),
                    html: result.description || '',
                    text: decodeHtmlEntities(desc),
                    locations: [result.categories?.location || ''].filter(Boolean),
                    department: result.categories?.department || '',
                    employmentType: result.categories?.commitment || '',
                    workplaceType: result.workplaceType === 'remote' ? 'REMOTE' : result.workplaceType === 'hybrid' ? 'HYBRID' : 'ONSITE'
                };
            }
        }

        // 1d. Direct Ashby URL extraction
        const ashbyParsed = extractAtsJobId(url);
        if (ashbyParsed && ashbyParsed.provider === 'ashby' && ashbyParsed.board) {
            const company = ashbyParsed.board;
            const jobId = ashbyParsed.jobId;
            const result = await fetchJson<any>(`https://api.ashbyhq.com/posting-api/job-board/${company}/job/${jobId}`);
            if (result && result.title) {
                console.log(`[Native] Ashby direct API (${company}/${jobId}) success`);
                return {
                    ...EMPTY,
                    title: decodeHtmlEntities(result.title),
                    company: cleanCompanyName(company),
                    html: result.descriptionHtml || '',
                    text: decodeHtmlEntities(result.descriptionPlain || ''),
                    locations: [result.locationName || ''].filter(Boolean),
                    department: result.departmentName || '',
                    employmentType: result.employmentType || '',
                    workplaceType: result.isRemote ? 'REMOTE' : 'ONSITE'
                };
            }
        }

        // 2. Identify which ATS registry key this job belongs to.
        //    Order: valid source tag → parseJobUrl → extractAtsBoard (URL shape) → host heuristics.
        //    A source tag with no adapter (e.g. 'telegram', 'unstop', 'walkin') must not block
        //    URL-based detection — an unknown source key used to short-circuit the dispatch and
        //    the job fell to the generic scrape with no structured fields.
        let providerKey = '';
        const sourceKey = source ? source.toLowerCase().replace(/^ats_/, '') : '';
        if (sourceKey && PLUGIN_REGISTRY[sourceKey]) {
            providerKey = sourceKey;
        }

        if (!providerKey) {
            const parsed = parseJobUrl(url);
            if (parsed && parsed.adapter) {
                providerKey = parsed.adapter.toLowerCase().replace(/^company-/, '');
            }
        }

        if (!providerKey) {
            const board = extractAtsBoard(url);
            if (board && PLUGIN_REGISTRY[board.provider]) {
                providerKey = String(board.provider);
            }
        }

        if (!providerKey) {
            const hostName = host.replace(/\.[a-z]+$/, '').toLowerCase();
            if (PLUGIN_REGISTRY[hostName]) providerKey = hostName;
            else if (host.includes('linkedin')) providerKey = 'linkedin';
            else if (host.includes('naukri')) providerKey = 'naukri';
            else if (host.includes('internshala')) providerKey = 'internshala';
            else if (host.includes('wellfound')) providerKey = 'wellfound';
        }

        // 3. Dispatch to @fresherflow/plugins Registry
        if (providerKey) {
            const plugin = PLUGIN_REGISTRY[providerKey];
            if (plugin && typeof plugin.fetchJobDetails === 'function') {
                const dummyJob = {
                    applyLink: url,
                    title: '',
                    company: '',
                    source: source || '',
                    descriptionSource: 'API' as const,
                    sourceType: 'ATS' as const
                };

                let result = null;
                try {
                    result = await plugin.fetchJobDetails(dummyJob, page);
                } catch (err) {
                    console.warn(`[Native] @fresherflow/plugins (${plugin.providerName}) fetchJobDetails failed:`, err);
                }
                if (result) {
                    if (typeof result === 'string') {
                        console.log(`[Native] @fresherflow/plugins (${plugin.providerName}) fetchJobDetails success`);
                        return {
                            ...EMPTY,
                            title: '',
                            html: result,
                            text: stripHtml(result),
                            locations: []
                        };
                    } else {
                        console.log(`[Native] @fresherflow/plugins (${plugin.providerName}) fetchJobDetails success (structured)`);
                        
                        const expLevel = ((result as any).experienceLevel || '').toLowerCase().replace(/[-\s]/g, '_');
                        let expMin: number | undefined = (result as any).experienceMin;
                        
                        if (expMin === undefined && expLevel) {
                            if (['mid_senior_level', 'director', 'executive', 'senior', 'manager', 'lead'].includes(expLevel)) {
                                expMin = 4;
                            } else if (['entry_level', 'internship', 'student'].includes(expLevel)) {
                                expMin = 0;
                            } else if (['associate'].includes(expLevel)) {
                                expMin = 1;
                            }
                        }

                        let outsideApply = (result as any).applyLink;
                        if (!outsideApply && (result.html || result.text)) {
                            const combined = `${result.html || ''} ${result.text || ''}`;
                            const urlMatches = combined.match(/https?:\/\/[^\s\)\"\'\<\>]+/g) || [];
                            for (const u of urlMatches) {
                                const parsedU = parseJobUrl(u);
                                if (parsedU && parsedU.adapter) {
                                    outsideApply = u;
                                    break;
                                }
                                try {
                                    const parsed = new URL(u);
                                    const h = parsed.hostname.toLowerCase();
                                    if (!h.includes('linkedin.com') && !h.includes('t.me') && !h.includes('whatsapp.com') && !h.includes('google.com')) {
                                        if (h.includes('careers') || h.includes('jobs') || u.includes('form')) {
                                            outsideApply = u;
                                            break;
                                        }
                                    }
                                } catch {}
                            }
                        }

                        return {
                            ...EMPTY,
                            title: decodeHtmlEntities(result.title || ''),
                            html: result.html || '',
                            text: result.text || stripHtml(result.html || ''),
                            locations: normalizeLocations(result.locations || []),
                            company: cleanCompanyName(result.company),
                            experienceLevel: (result as any).experienceLevel || '',
                            experienceMin: expMin,
                            applyLink: outsideApply || undefined
                        };
                    }
                }
            }
        }

        // 4. Universal JSON-LD / meta fallback: any careers page that publishes
        //    Schema.org JobPosting structured data (HSBC, GE HealthCare, Wipro,
        //    Capgemini, Amazon, ...) — zero Playwright, zero LLM.
        //    If a Playwright page was passed, use its already-loaded DOM first.
        let html: string | null = null;
        if (page) {
            try { html = await page.content(); } catch { html = null; }
        }
        if (!html) {
            html = await fetchHtml(url);
        }
        if (html) {
            const structured = extractFromStructuredHtml(html, url);
            // Require real content: a description or a title + location.
            // A title-only shell (SPA hosts like Wipro) must fall through to
            // the Playwright fallback instead of short-circuiting it.
            const hasContent = !!structured && (
                structured.text.length >= 150 ||
                (structured.title && structured.locations.length > 0)
            );
            if (structured && hasContent) {
                return structured;
            }
        }
    } catch (e) {
        console.warn(`[NativeATS] Error for ${url}: ${(e as Error).message}`);
    }

    return null;
}


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

import { parseJobUrl } from '@fresherflow/parser';
import { CANONICAL_CITIES_MAP } from '@fresherflow/parser/metadata';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';

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

        // 1. Special case: Greenhouse gh_jid fallback
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
                return {
                    ...EMPTY,
                    title: result.title,
                    html: result.content || '',
                    text: result.content ? result.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '',
                    locations: rawLocations,
                    department: result.departments?.[0]?.name || '',
                };
            }
        }

        // 2. Identify which ATS registry key this job belongs to using parseJobUrl or direct registry match
        let providerKey = '';
        if (source) {
            providerKey = source.toLowerCase().replace(/^ats_/, '');
        }

        if (!providerKey) {
            const parsed = parseJobUrl(url);
            if (parsed && parsed.adapter) {
                providerKey = parsed.adapter.toLowerCase().replace(/^company-/, '');
            } else {
                const hostName = host.replace(/\.[a-z]+$/, '').toLowerCase();
                if (PLUGIN_REGISTRY[hostName]) providerKey = hostName;
                else if (host.includes('linkedin')) providerKey = 'linkedin';
                else if (host.includes('naukri')) providerKey = 'naukri';
                else if (host.includes('internshala')) providerKey = 'internshala';
                else if (host.includes('wellfound')) providerKey = 'wellfound';
            }
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
                            title: result.title || '',
                            html: result.html || '',
                            text: result.text || stripHtml(result.html || ''),
                            locations: normalizeLocations(result.locations || []),
                            company: result.company || '',
                            experienceLevel: (result as any).experienceLevel || '',
                            experienceMin: expMin,
                            applyLink: outsideApply || undefined
                        };
                    }
                }
            }
        }
    } catch (e) {
        console.warn(`[NativeATS] Error for ${url}: ${(e as Error).message}`);
    }

    return null;
}


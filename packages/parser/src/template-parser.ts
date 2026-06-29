/**
 * template-parser.ts
 *
 * Source-aware structured extraction for aggregator pages that follow a
 * predictable key-value template (govtjobmart, dailypharmajobs, etc.).
 *
 * These sites format job details as:
 *   "Name of the Company\tXYZ Corp"
 *   "Job Location: Hyderabad"
 *   "Work Type\tOnsite"
 *   "Posted in: 2024, 2025, 2026, Bangalore, MNC"
 *
 * Dictionaries are sourced from:
 *   - https://cdn.fresherflow.in/companies.json  → KNOWN_COMPANIES (name, url, logo_url)
 *   - https://cdn.fresherflow.in/skills.json     → KNOWN_SKILLS (flat string array)
 *   - https://cdn.fresherflow.in/cities.json     → KNOWN_CITIES (state → city[])
 *   - https://cdn.fresherflow.in/education.json  → degree/course/specialization enums
 *
 * No LLM required for these structured sources.
 */

import { OpportunityType, WorkMode, SalaryPeriod } from '@fresherflow/types';
import type { ParsedJob } from './types.js';
import { MONTH_INDEX } from './heuristics.js';

// ── Supported template sources ─────────────────────────────────────────────
// All 22 aggregator sites discovered by the job-discovery bot.

const TEMPLATE_SOURCES = new Set([
    // Confirmed structured-template sites (govtjobmart style)
    'govtjobmart',
    'dailypharmajobs',
    'freshersworld',
    // Other aggregators that use similar patterns
    'job4freshers',
    'frontlinesmedia',
    'findmyjobss',
    'jobsaddafreshers',
    'internshipss',
    'freshersvoice',
    'placementdrive',
    'freshershunt',
    'fresheropenings',
    'freshersjobsaadda',
    'topvarsity',
    'love2pickleball',
    'freshersnow',
    'softwaremuchatlu',
    'onlinestudy4u',
    'merademyjobs',
    'fresheroffcampus',
    'kickcharm',
    'offcampusjobdrives',
    'mohancareers',
]);

export function isTemplateSource(source: string): boolean {
    return TEMPLATE_SOURCES.has(source.toLowerCase().trim());
}


// ── Runtime-injectable CDN lookup tables ──────────────────────────────────
// Populated via setCdnMetadata() after CDN metadata is loaded.
// Falls back to empty collections if not set (template parser still works, just no CDN enrichment).

let CDN_CITIES_MAP = new Map<string, string>();
let CDN_COMPANIES_MAP = new Map<string, { name: string; url?: string }>();
let CDN_SKILLS_LOWERCASE = new Set<string>();

/** Called once by job-processor after loadCdnMetadata() to inject live CDN data */
export function setCdnMetadata(params: {
    cities: Map<string, string>;      // lowercase → canonical
    companies: Map<string, { name: string; url?: string; logo_url?: string }>;  // lowercase → entry
    skills: Map<string, string>;      // lowercase → canonical
}): void {
    CDN_CITIES_MAP = params.cities;
    CDN_COMPANIES_MAP = new Map(
        Array.from(params.companies.entries()).map(([k, v]) => [k, { name: v.name, url: v.url }])
    );
    CDN_SKILLS_LOWERCASE = new Set(params.skills.keys());
    console.log(`Template parser CDN metadata loaded: ${CDN_CITIES_MAP.size} cities, ${CDN_COMPANIES_MAP.size} companies, ${CDN_SKILLS_LOWERCASE.size} skills.`);
}



// ── Education mapping from education.json ──────────────────────────────────
// Maps raw text → canonical degree code

const DEGREE_MAP: Array<[RegExp, string]> = [
    [/\b(diploma|polytechnic|iti)\b/i, 'DIPLOMA'],
    [/\b(b\.?e|b\.?tech|bachelor|engineering|b\.?sc|bsc|bca|bba|b\.?com|bcom|graduation|graduate|degree|any graduate)\b/i, 'DEGREE'],
    [/\b(m\.?e|m\.?tech|m\.?sc|mca|mba|master|post.?graduate|pg|pgdm)\b/i, 'PG'],
    [/\b(12th|hsc|intermediate|inter)\b/i, 'INTER'],
    [/\b(10th|ssc|matriculation|tenth)\b/i, 'TENTH'],
];

const COURSE_MAP: Array<[RegExp, string]> = [
    [/\bb\.?tech\b/i, 'B.Tech / B.E.'],
    [/\bb\.?e\b/i, 'B.Tech / B.E.'],
    [/\bm\.?tech\b/i, 'M.Tech / M.E.'],
    [/\bm\.?e\b/i, 'M.Tech / M.E.'],
    [/\bb\.?sc\b/i, 'B.Sc'],
    [/\bm\.?sc\b/i, 'M.Sc'],
    [/\bbca\b/i, 'BCA'],
    [/\bmca\b/i, 'MCA'],
    [/\bbba\b/i, 'BBA'],
    [/\bmba\b/i, 'MBA'],
    [/\bb\.?com\b/i, 'B.Com'],
    [/\bm\.?com\b/i, 'M.Com'],
    [/\bb\.?a\b/i, 'B.A'],
    [/\bm\.?a\b/i, 'M.A'],
    [/\bb\.?pharma\b/i, 'B.Pharma'],
];

const SPECIALIZATION_MAP: Array<[RegExp, string]> = [
    [/\b(computer science|cs|cse)\b/i, 'Computer Science'],
    [/\b(information technology|it)\b/i, 'Information Technology'],
    [/\b(mechanical|mech)\b/i, 'Mechanical'],
    [/\b(civil)\b/i, 'Civil'],
    [/\b(electrical|eee|ee)\b/i, 'Electrical'],
    [/\b(electronics|ece)\b/i, 'Electronics'],
    [/\b(ai\/?ml|artificial intelligence|machine learning)\b/i, 'AI & ML'],
    [/\b(data science|data analytics)\b/i, 'Data Science'],
    [/\b(cyber security|cybersecurity)\b/i, 'Cyber Security'],
    [/\b(finance)\b/i, 'Finance'],
    [/\b(marketing)\b/i, 'Marketing'],
    [/\b(hr|human resources)\b/i, 'Human Resources'],
];

// ── Low-level field extractors ─────────────────────────────────────────────

/** Extract "Key\tValue" or "Key: Value" pattern */
function extractField(text: string, key: string): string | undefined {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`${escaped}\\s*[\\t:]+\\s*([^\\n\\r]+)`, 'i'));
    return m?.[1]?.trim() || undefined;
}

// ── Title cleaning ─────────────────────────────────────────────────────────

const TITLE_NOISE_PATTERNS = [
    /\s*[|–-]\s*apply\s+now\s*!?$/i,
    /\s*[|–-]\s*apply\s+online\s*!?$/i,
    /\s*[|–-]\s*apply\s+soon\s*!?$/i,
    /\s*\|\s*freshers?\s*\|?\s*/i,
    /\s*\|\s*(?:multiple locations?|pan india)\s*\|?\s*/i,
    /\s*off\s+campus\s+drive\s+\d{4}\s*/i,
    /\s*–?\s*apply\s+now\s*!?$/i,
    /\s*\|\s*\d{4}\s*$/i,
    /\s*\[\s*\d{4}\s*\]\s*$/i,
    /\s+recruitment\s+(?:drive\s+)?\d{4}\s+/i,
    /\s+recruitment\s+(?:drive)?\s+/i,
];

export function cleanAggregatorTitle(aggregatorTitle: string): string {
    if (!aggregatorTitle) return '';
    let title = aggregatorTitle;

    // Pattern 1: "XYZ Recruitment: Hiring Role Name - Apply Now"
    // Handles "hiring ", "hiring: ", "hiring for ", etc.
    const hiringMatch = title.match(/\bhiring(?:\s+|:\s+|\s+for\s+)(.+)$/i);
    if (hiringMatch && hiringMatch[1].length < 80) {
        title = hiringMatch[1];
        // Strip trailing suffixes like " | Location" or " - Apply Now" safely
        const suffixMatch = title.match(/(.+?)\s*[|–]\s*(?:apply\s+(?:now|soon|online)|[A-Za-z\s]+)$/i);
        if (suffixMatch) title = suffixMatch[1];
    } else {
        // Pattern 2: "Company Recruitment Drive; Role – Apply Now"
        // Safely strip the "Company Recruitment Drive;" prefix if present
        const prefixMatch = title.match(/^[^;]+;\s*(.*)/);
        if (prefixMatch && prefixMatch[1].length > 5) {
            title = prefixMatch[1].trim();
        }
    }

    // Strip common suffixes/noise
    for (const p of TITLE_NOISE_PATTERNS) {
        title = title.replace(p, ' ');
    }

    // Clean up trailing separators
    title = title.replace(/\s*[|–-]\s*$/, '').trim();
    // Clean up double spaces caused by replacement
    title = title.replace(/\s{2,}/g, ' ');

    return title.trim() || aggregatorTitle;
}

// ── Opportunity type ───────────────────────────────────────────────────────

export function extractTypeFromText(text: string, textLower = text.toLowerCase()): OpportunityType {
    if (textLower.includes('walkin') || textLower.includes('walk-in') || textLower.includes('walk in')) return OpportunityType.WALKIN;
    if (textLower.includes('hackathon')) return OpportunityType.HACKATHONS;
    if (textLower.includes('internship') || textLower.includes('intern/trainee') || textLower.includes('stipend')) return OpportunityType.INTERNSHIP;
    if (textLower.includes('government') || textLower.includes(' govt ')) return OpportunityType.GOVERNMENT;
    return OpportunityType.JOB;
}

// ── Locations using CDN cities ─────────────────────────────────────────────

export function parseLocationsFromString(raw: string): string[] {
    if (!raw) return [];
    const lower = raw.toLowerCase();
    if (lower.includes('pan india') || lower.includes('across india') || lower.includes('anywhere in india')) {
        return ['Pan India'];
    }
    if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) {
        return ['Remote'];
    }

    // Split by separators, then match each part against CDN_CITIES
    const parts = raw.split(/[,&/|]/).map(p => p.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
    const found: string[] = [];
    for (const part of parts) {
        const partLower = part.toLowerCase();
        // Exact match
        if (CDN_CITIES_MAP.has(partLower)) {
            const canonical = CDN_CITIES_MAP.get(partLower)!;
            if (!found.includes(canonical)) found.push(canonical);
            continue;
        }
        // Partial match (e.g. "Bengaluru" → "Bangalore" alias)
        let matched = '';
        for (const [lower, canonical] of CDN_CITIES_MAP.entries()) {
            if (partLower.includes(lower) || lower.includes(partLower)) {
                matched = canonical;
                break;
            }
        }
        if (matched && !found.includes(matched)) found.push(matched);
    }

    return found.length > 0 ? found : parts.slice(0, 5).filter(p => p.length > 2 && /^[A-Z]/.test(p));
}

// ── Work mode ──────────────────────────────────────────────────────────────

function parseWorkMode(raw: string): WorkMode {
    const lower = raw.toLowerCase().trim();
    if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) return WorkMode.REMOTE;
    if (lower.includes('hybrid') || lower.includes('flexible')) return WorkMode.HYBRID;
    return WorkMode.ONSITE;
}

// ── Degrees using education.json mapping ──────────────────────────────────

function parseDegrees(raw: string): string[] {
    if (!raw) return ['DEGREE'];
    const found: string[] = [];
    for (const [pattern, code] of DEGREE_MAP) {
        if (pattern.test(raw) && !found.includes(code)) found.push(code);
    }
    return found.length > 0 ? found : ['DEGREE'];
}

function parseCourses(raw: string): string[] {
    if (!raw) return [];
    const found: string[] = [];
    for (const [pattern, course] of COURSE_MAP) {
        if (pattern.test(raw) && !found.includes(course)) found.push(course);
    }
    return found;
}

function parseSpecializations(raw: string): string[] {
    if (!raw) return [];
    const found: string[] = [];
    for (const [pattern, spec] of SPECIALIZATION_MAP) {
        if (pattern.test(raw) && !found.includes(spec)) found.push(spec);
    }
    return found;
}

// ── Company matching using CDN companies list ──────────────────────────────

function matchCompany(raw: string | undefined): { name: string; website?: string } | undefined {
    if (!raw) return undefined;
    // Strip leading dash/tab/whitespace that some templates add
    const cleaned = raw.replace(/^[-–\t\s]+/, '').trim();
    const rawLower = cleaned.toLowerCase();
    // Exact match
    const exact = CDN_COMPANIES_MAP.get(rawLower);
    if (exact) return { name: exact.name, website: exact.url };
    // Return cleaned raw value — trust the structured field
    return cleaned ? { name: cleaned } : undefined;
}

// ── Skills using CDN skills dictionary ────────────────────────────────────

function extractSkills(rawSkillField: string | undefined, fullText: string): string[] {
    const results = new Set<string>();

    // From the structured "Skills" field
    if (rawSkillField) {
        rawSkillField.split(/[,;|]/).map(s => s.trim().toLowerCase()).filter(s => {
            // Reject if too long (prose), too many spaces, or starts with stop words
            return s.length > 1 && s.length <= 35 && (s.match(/\s/g) || []).length <= 3 && !/^(and|or|the|a |to |of )/.test(s);
        }).forEach(s => results.add(s));
    }

    // Dictionary match against CDN skills (case-insensitive)
    const lower = fullText.toLowerCase();
    for (const skill of CDN_SKILLS_LOWERCASE) {
        // Always use word-boundary match for all skills to avoid false positives (e.g., "escalated" -> "scala")
        const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match only if surrounded by string start/end, spaces, or standard punctuation
        const pattern = new RegExp(`(?:^|[^a-zA-Z0-9+#.])(${escapedSkill})(?:$|[^a-zA-Z0-9+#.])`, 'i');
        if (pattern.test(lower)) {
            results.add(skill);
        }
    }

    return Array.from(results).slice(0, 15);
}

// ── Passout years from "Posted in" tag line ───────────────────────────────

function extractYearsFromTags(tagsLine: string): number[] {
    const yearRegex = /\b(20[2-9][0-9])\b/g;
    return Array.from(new Set(
        (tagsLine.match(yearRegex) || []).map(y => parseInt(y))
    )).sort();
}

// ── Expiry from "Closing Date" ─────────────────────────────────────────────

function parseClosingDate(raw: string): string | undefined {
    if (!raw) return undefined;
    const m = raw.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i)
        || raw.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
    if (!m) return undefined;
    try {
        let day: number, monthStr: string, year: number;
        if (/^\d/.test(m[1])) {
            [, , ] = [day, monthStr, year] = [parseInt(m[1]), m[2].toLowerCase(), parseInt(m[3])];
        } else {
            [monthStr, day, year] = [m[1].toLowerCase(), parseInt(m[2]), parseInt(m[3])];
        }
        const month = MONTH_INDEX[monthStr] ?? MONTH_INDEX[monthStr.slice(0, 3)];
        if (month === undefined) return undefined;
        return new Date(year, month, day).toISOString().split('T')[0];
    } catch {
        return undefined;
    }
}

// ── Salary ─────────────────────────────────────────────────────────────────

function parseSalaryFromText(text: string): { salaryRange?: string; salaryMin?: number; salaryMax?: number; salaryPeriod?: SalaryPeriod } {
    const lpa = text.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)\s*LPA/i)
        || text.match(/(\d+(?:\.\d+)?)\s*LPA/i);
    if (lpa) {
        if (lpa[2]) {
            return { salaryRange: `${lpa[1]}-${lpa[2]} LPA`, salaryMin: parseFloat(lpa[1]) * 100000, salaryMax: parseFloat(lpa[2]) * 100000, salaryPeriod: SalaryPeriod.YEARLY };
        }
        return { salaryRange: `${lpa[1]} LPA`, salaryMin: parseFloat(lpa[1]) * 100000, salaryPeriod: SalaryPeriod.YEARLY };
    }
    const monthly = text.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]+)\s*(?:\/|-)\s*(?:month|mo)/i)
        || text.match(/(\d+)k?\s*per\s*month/i);
    if (monthly) {
        const val = parseInt(monthly[1].replace(/,/g, ''));
        return { salaryRange: `₹${val}/month`, salaryMin: val, salaryPeriod: SalaryPeriod.MONTHLY };
    }
    return {};
}

// ── Experience ─────────────────────────────────────────────────────────────

function parseExperience(text: string): { experienceMin?: number; experienceMax?: number } {
    const range = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:year|yr)s?/i);
    if (range) return { experienceMin: parseInt(range[1]), experienceMax: parseInt(range[2]) };
    const fresher = /\b(fresher|freshers|0\s*year|entry.?level)\b/i.test(text);
    if (fresher) return { experienceMin: 0, experienceMax: 0 };
    const min = text.match(/(\d+)\+?\s*(?:year|yr)s?\s+(?:exp|experience)/i);
    if (min) return { experienceMin: parseInt(min[1]) };
    return {};
}

// ── Description cleanup ───────────────────────────────────────────────────

function cleanJobDescription(rawText: string): string {
    let text = rawText;
    
    // Strip common footer/sidebar noise to prevent skill/type cross-pollination
    const endMarkers = [
        /How to Apply/i,
        /Disclaimer:/i,
        /Recent Posts/i,
        /Leave a Reply/i,
        /Post navigation/i,
        /Apply Link/i
    ];
    
    let minEnd = text.length;
    for (const marker of endMarkers) {
        const match = text.match(marker);
        if (match && match.index !== undefined && match.index < minEnd) {
            minEnd = match.index;
        }
    }
    
    // Cut off the noisy end
    text = text.substring(0, minEnd);
    
    // Strip header navigation noise (often ends with "Posted on ... by admin" or similar)
    const headerMatch = text.match(/Posted on\s+.*?by\s+admin/i) || text.match(/Skip to content[\s\S]*?Home[\s\S]*?(?=Company Overview|Job Details|Roles and Responsibilities)/i);
    if (headerMatch && headerMatch.index !== undefined) {
        text = text.substring(headerMatch.index + headerMatch[0].length);
    }
    
    return text.trim();
}

// ── Main entry point ───────────────────────────────────────────────────────

export interface TemplateParseResult {
    job: Partial<ParsedJob>;
    /**
     * Confidence score 0.0–1.0.
     * Based on how many of the 6 key fields were successfully extracted.
     * >= 0.6 means we can skip the LLM.
     */
    confidence: number;
    /** Company website if found in CDN list */
    companyWebsite?: string;
}

const CONFIDENCE_FIELDS: (keyof ParsedJob)[] = [
    'title', 'company', 'locations', 'workMode', 'allowedDegrees', 'skills',
];

export function parseFromTemplate(
    aggregatorText: string,
    aggregatorTitle: string,
): TemplateParseResult {
    const text = aggregatorText || '';

    // ── Extract key-value fields ───────────────────────────────────────
    const rawCompany = extractField(text, 'Name of the Company')
        || extractField(text, 'Company Name')
        || extractField(text, 'Company')
        || extractField(text, 'Organisation');

    const rawLocation = extractField(text, 'Job Location')
        || extractField(text, 'Location')
        || extractField(text, 'Place of Posting')
        || extractField(text, 'Job Location');

    const rawQuals = extractField(text, 'Required Qualifications')
                     || extractField(text, 'Qualification')
                     || extractField(text, 'Educational Qualification')
                     || extractField(text, 'Education')
                     || extractField(text, 'Degree')
                     || extractField(text, 'Eligibility')
                     || '';
                     
    const allowedDegrees = parseDegrees(rawQuals);
    const allowedCourses = parseCourses(rawQuals);
    const allowedSpecializations = parseSpecializations(rawQuals);

    // "Work Type" is most reliable; avoid "Job Type" which is "Full Time" not onsite/remote
    const rawWorkType = extractField(text, 'Work Type')
        || extractField(text, 'Work Mode');

    const rawSkills = extractField(text, 'Skills')
        || extractField(text, 'Key Skills')
        || extractField(text, 'Required Skills');

    const rawClosing = extractField(text, 'Closing Date')
        || extractField(text, 'Last Date')
        || extractField(text, 'Application Deadline');

    // "Posted in: 2024, 2025, 2026, Bangalore, MNC" tag line
    const postedIn = text.match(/Posted in[:\s]+([^\n]+)/i)?.[1] ?? '';

    // ── Clean the text for scanning ────────────────────────────────────
    const cleanedText = cleanJobDescription(text);
    const cleanedTextLower = cleanedText.toLowerCase();

    // ── Build typed result ─────────────────────────────────────────────
    const title = cleanAggregatorTitle(aggregatorTitle);

    // Company: prefer CDN match for canonical name + website
    const companyMatch = matchCompany(rawCompany);
    const company = companyMatch?.name;
    const companyWebsite = companyMatch?.website;

    const locations = rawLocation ? parseLocationsFromString(rawLocation) : [];
    const workMode = rawWorkType ? parseWorkMode(rawWorkType) : WorkMode.ONSITE;
    const skills = extractSkills(rawSkills, cleanedText);
    const allowedPassoutYears = extractYearsFromTags(postedIn);
    const expiresAt = parseClosingDate(rawClosing || '');
    const type = extractTypeFromText(cleanedText, cleanedTextLower);
    const isFresherOnly = /\b(fresher|freshers|entry.?level|fresh.?graduate)\b/i.test(cleanedText);
    const isRemote = workMode === WorkMode.REMOTE;
    const salary = parseSalaryFromText(text);
    const experience = parseExperience(text);
    const description = text.trim().substring(0, 2000);

    const job: Partial<ParsedJob> = {
        title,
        ...(company ? { company } : {}),
        locations,
        workMode,
        allowedDegrees,
        allowedCourses,
        allowedSpecializations,
        skills,
        allowedPassoutYears,
        type,
        isFresherOnly,
        isRemote,
        description,
        ...(expiresAt ? { expiresAt } : {}),
        ...salary,
        ...experience,
    };

    // ── Confidence score ───────────────────────────────────────────────
    let filled = 0;
    for (const field of CONFIDENCE_FIELDS) {
        const val = job[field];
        if (Array.isArray(val) ? val.length > 0 : val !== undefined && val !== '') filled++;
    }
    const confidence = filled / CONFIDENCE_FIELDS.length;

    return { job, confidence, companyWebsite };
}

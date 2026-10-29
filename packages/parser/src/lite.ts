import { ParsedJob } from './types.js';
import { OpportunityCategory, EmploymentType, WorkMode, EducationLevel, SalaryPeriod } from '@fresherflow/types';
import {
    NAV_PATTERNS, TITLE_KEYWORDS, COMMON_SKILLS, COMMON_CITIES,
    KNOWN_COMPANIES, isPlausibleCompanyName,
} from './heuristics.js';

/**
 * Lightweight browser-safe job text parser.
 * No heavy dependencies like compromise or natural.
 */
import { 
    normalizeSalary as domainNormalizeSalary, 
    normalizeExpiry as domainNormalizeExpiry 
} from '@fresherflow/utils';

export function parseJobTextLite(rawText: string): ParsedJob {
    let text = rawText;
    for (const pattern of NAV_PATTERNS) {
        text = text.replace(pattern, '');
    }

    const textLower = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l.length < 120);

    // Business Normalization (Shared Logic)
    const salary = domainNormalizeSalary(text);
    const expiresAt = domainNormalizeExpiry(text);

    const result: ParsedJob = {
        title: '',
        company: '',
        category: OpportunityCategory.EMPLOYMENT,
        locations: [],
        skills: [],
        allowedPassoutYears: [],
        allowedDegrees: [],
        isFresherOnly: false,
        workMode: WorkMode.ONSITE,
        isRemote: false,
        salaryPeriod: salary.period as unknown as SalaryPeriod,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryRange: salary.range,
        expiresAt,
        description: text.trim().substring(0, 2000),
    };

    // Title
    for (const line of lines) {
        if (/^\d+$|^Posted|^Location:|^Experience:|^Salary:|^Job ID/i.test(line)) continue;
        if (TITLE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(line))) {
            if (line.split(' ').length >= 2 && line.split(' ').length <= 8) {
                result.title = line;
                break;
            }
        }
    }

    // Company
    //
    // The old pattern list started with `(?:About|Join|At)` and was matched
    // case-insensitively, so any Telegram post containing "Join our WhatsApp
    // group" reported the GROUP as the employer. That value was then written
    // to the sheet, the company registry and the public listing. Extraction is
    // now priority-ordered and every candidate has to survive
    // `isPlausibleCompanyName`: an empty company is recoverable from the apply
    // link, a wrong one silently poisons every downstream table.
    // `result.title` is optional on ParsedJob; the title is only used here to
    // reject a candidate that merely repeats it, so an absent title is ''.
    result.company = extractCompanyFromPost(text, result.title ?? '');

    // Location
    const locations: string[] = [];
    for (const city of COMMON_CITIES) {
        if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
            locations.push(city);
        }
    }
    result.locations = Array.from(new Set(locations));

    const foundSkills = COMMON_SKILLS.filter(skill => {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?:^|[^a-zA-Z0-9+#.])(${escaped})(?:$|[^a-zA-Z0-9+#.])`, 'i');
        return pattern.test(text);
    });
    result.skills = foundSkills.slice(0, 15);

    // Work mode
    if (/\b(fully remote|100% remote|remote.?only|work from home|wfh)\b/i.test(text)) {
        result.workMode = WorkMode.REMOTE;
        result.isRemote = true;
    } else if (/\b(hybrid|flexible|remote.?friendly)\b/i.test(text)) {
        result.workMode = WorkMode.HYBRID;
    }

    // Degrees
    if (/\b(bachelor|b\.?e|b\.?tech|graduation)\b/i.test(text)) result.allowedDegrees.push(EducationLevel.DEGREE);
    if (/\b(diploma|polytechnic)\b/i.test(text)) result.allowedDegrees.push(EducationLevel.DIPLOMA);
    if (/\b(master|pg|m\.?tech|mca|mba)\b/i.test(text)) result.allowedDegrees.push(EducationLevel.PG);

    // Passout years
    const currentYear = new Date().getFullYear();
    const yearMatches = text.match(/\b(20\d{2})\b/g);
    if (yearMatches) {
        const valid = yearMatches
            .map(y => parseInt(y))
            .filter(y => y >= 2020 && y <= currentYear + 2);
        result.allowedPassoutYears = Array.from(new Set(valid)).sort();
    }

    result.isFresherOnly = textLower.includes('fresher');

    return result;
}

/** Trailing words a greedy match leaves behind ("Acme is", "Acme and"). */
const TRAILING_JOINERS = /\s+(?:is|are|was|were|and|or|the|a|an|we|our|you|with|for|from|has|have|will|to|at|in)$/i;
/** Leading words that describe the post, never the employer. */
const LEADING_NON_COMPANY = new Set([
    'we', 'our', 'you', 'your', 'they', 'their', 'it', 'this', 'that', 'the',
    'a', 'an', 'and', 'or', 'hiring', 'job', 'jobs', 'urgent', 'immediate',
    'mega', 'free', 'new', 'all', 'apply', 'join', 'company', 'organization',
    'organisation', 'employer',
]);

/**
 * Clean a raw candidate and decide whether it can be an employer name.
 * Returns null (not "") so callers can fall through to the next strategy.
 */
function cleanCompanyCandidate(raw: string | null | undefined): string | null {
    if (!raw) return null;

    // "Acme | Hyderabad" / "Acme • Chennai" carry the location after a pipe.
    let value = raw.split(/[|•·\n]/)[0] ?? '';
    value = value.replace(/\s*[-–—]\s*$/, '').replace(/\s+/g, ' ').trim();

    const words = value.split(' ').filter(Boolean);
    while (words.length > 0 && TRAILING_JOINERS.test(` ${words[words.length - 1]}`)) words.pop();
    while (words.length > 0 && LEADING_NON_COMPANY.has(words[0].toLowerCase())) words.shift();

    const cleaned = words.join(' ').replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9)]+$/, '').trim();
    return isPlausibleCompanyName(cleaned) ? cleaned : null;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Priority-ordered company extraction for a channel/Telegram post.
 *
 *   1. an explicit label — `Company: Acme`
 *   2. a known employer mentioned anywhere in the text
 *   3. `<Employer> is hiring / is looking for / invites applications`
 *   4. `<Employer> hiring …` at the start of a line
 *   5. a title that ends in `at <Employer>`
 *
 * Every candidate is validated; nothing is taken from a URL, a group name or
 * a "join the channel" line.
 */
function extractCompanyFromPost(text: string, title: string): string {
    const labeled = text.match(
        /(?:^|\n)\s*(?:company(?:\s+name)?|organization|organisation|employer|hiring\s+for)\s*[:\-–]\s*([^\n]{2,60})/i,
    );
    const fromLabel = cleanCompanyCandidate(labeled?.[1]);
    if (fromLabel) return fromLabel;

    for (const known of KNOWN_COMPANIES) {
        const pattern = new RegExp(`\\b${escapeRegExp(known)}\\b`, 'i');
        if (pattern.test(text)) return known;
    }

    const hiringSentence = text.match(
        /(?:^|\n)\s*([A-Za-z0-9&.'()\-]+(?:\s+[A-Za-z0-9&.'()\-]+){0,4})\s+(?:is\s+)?(?:hiring|is\s+looking\s+for|is\s+seeking|invites|recruiting|walk[- ]?in)\b/i,
    );
    const fromSentence = cleanCompanyCandidate(hiringSentence?.[1]);
    if (fromSentence) return fromSentence;

    const titleAt = title.match(/(?:\bat|\bwith|\bfor)\s+([A-Za-z0-9&.'()\-]+(?:\s+[A-Za-z0-9&.'()\-]+){0,3})\s*$/i);
    const fromTitle = cleanCompanyCandidate(titleAt?.[1]);
    if (fromTitle) return fromTitle;

    const titlePrefix = title.match(/^([A-Za-z0-9&.'()\-]+(?:\s+[A-Za-z0-9&.'()\-]+){0,3})\s*[-–—:|]\s+/);
    const fromPrefix = cleanCompanyCandidate(titlePrefix?.[1]);
    if (fromPrefix) return fromPrefix;

    return '';
}

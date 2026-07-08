/**
 * cdn-matcher.ts
 *
 * Deterministic field extraction from raw job description text using CDN metadata.
 * Runs BEFORE LLM enrichment — reduces LLM calls significantly.
 *
 * CDN data wired:
 *  - skills.json       → requiredSkills (scan full text)
 *  - education.json    → allowedDegrees + allowedCourses (course names + keywords)
 *  - cities.json       → locations (detect Indian cities in raw text)
 *  - passout year      → allowedPassoutYears (regex over text)
 *  - salary            → salaryRange (regex over text)
 *  - experience        → experienceMin/Max (regex over text)
 *  - work mode         → workMode (keyword scan)
 */

import {
    CANONICAL_SKILLS_MAP,
    CANONICAL_CITIES_MAP,
    INDIAN_CITIES_MAP,
    INTERNATIONAL_CITIES_MAP,
    CANONICAL_EDUCATION,
} from './metadata.js';
import { normalizeCourseArray } from '@fresherflow/constants';

// Soft-skills / generic words to never add as technical skills
const SOFT_SKILL_BLOCKLIST = new Set([
    // Soft skills
    'english', 'fluent', 'communication', 'communication skills', 'written communication',
    'verbal communication', 'written and verbal communication', 'presentation skills',
    'interpersonal skills', 'teamwork', 'team player', 'problem solving', 'problem-solving',
    'critical thinking', 'attention to detail', 'time management', 'multitasking',
    'self-motivated', 'proactive', 'ownership', 'leadership', 'collaboration',
    'adaptability', 'organization', 'organizational skills', 'analytical skills',
    'analytical', 'creativity', 'innovation', 'drive', 'motivation',
    'fast learner', 'quick learner', 'coachable', 'detail-oriented', 'detail oriented',
    'growth mindset', 'result-oriented', 'results-oriented',
    // Domain-generic single words that match too broadly
    'insurance', 'engineering', 'sales', 'finance', 'accounting', 'marketing',
    'operations', 'documentation', 'technology', 'management', 'strategy',
    'reporting', 'compliance', 'governance', 'audit', 'research',
    // Generic action/trait words that exist in CDN but hit false positives in narrative text
    'can', 'confidence', 'editing', 'flexibility', 'scheduling', 'switching',
    'exchange', 'coordination', 'production', 'training', 'testing',
    'analysis', 'analytics', 'planning', 'delivery', 'execution',
]);

// Maps raw degree mentions in text → canonical CDN degree level
const DEGREE_KEYWORD_MAP: Array<[RegExp, string]> = [
    [/\bph\.?d\b/i, 'PG'],
    [/\bm\.?tech\b|\bm\.?e\b|\bmaster[s]? (of|in) (engineering|technology)/i, 'PG'],
    [/\bmca\b/i, 'PG'],
    [/\bmba\b/i, 'PG'],
    [/\bm\.?sc\b/i, 'PG'],
    [/\bm\.?com\b/i, 'PG'],
    [/\bm\.?a\b|\bmaster[s]? (of|in) arts/i, 'PG'],
    [/\bpostgraduate\b|\bpost.?graduate\b|\bmaster'?s degree\b/i, 'PG'],
    [/\bb\.?tech\b|\bb\.?e\b|\bbachelor[s]? (of|in) (engineering|technology)/i, 'DEGREE'],
    [/\bbca\b/i, 'DEGREE'],
    [/\bbba\b/i, 'DEGREE'],
    [/\bb\.?sc\b/i, 'DEGREE'],
    [/\bb\.?com\b/i, 'DEGREE'],
    [/\bb\.?a\b|\bbachelor[s]? (of|in) arts/i, 'DEGREE'],
    [/\bany graduate\b|\bany bachelor\b|\bundergraduate\b/i, 'DEGREE'],
    [/\bdiploma\b|\bpoly(technic)?\b|\biti\b/i, 'DIPLOMA'],
    [/\b(10\+2|12th|hsc|intermediate|higher secondary)\b/i, 'INTER'],
    [/\b(10th|ssc|matriculation|secondary school)\b/i, 'TENTH'],
];

// Maps course keywords → canonical course names from CDN
const COURSE_KEYWORD_MAP: Array<[RegExp, string]> = [
    [/\bb\.?tech\b|\bb\.?e\.?\b/i, 'B.Tech / B.E.'],
    [/\bmca\b/i, 'MCA'],
    [/\bbca\b/i, 'BCA'],
    [/\bbba\b/i, 'BBA'],
    [/\bb\.?sc\b/i, 'B.Sc'],
    [/\bb\.?com\b/i, 'B.Com'],
    [/\bb\.?a\b/i, 'B.A'],
    [/\bm\.?tech\b|\bm\.?e\.?\b/i, 'M.Tech / M.E.'],
    [/\bmba\b/i, 'MBA'],
    [/\bm\.?sc\b/i, 'M.Sc'],
    [/\bm\.?com\b/i, 'M.Com'],
    [/\bm\.?a\b/i, 'M.A'],
    [/\bdiploma\b/i, 'Diploma'],
    [/\bany graduate\b|\ball graduates\b|\ball degree\b/i, 'Any Graduate'],
    [/\bany postgraduate\b|\bany pg\b|\bany masters\b/i, 'Any Postgraduate'],
    [/\b12th\b|\bhsc\b|\b10\+2\b/i, '12th Pass'],
    [/\bph\.?d\b/i, 'PhD'],
];

// CDN course names that are too generic and cause false positives when scanning full text
const GENERIC_COURSE_SKIP = new Set([
    'Any Graduate', 'Any Postgraduate', 'Other', 'Engineering',
    "Bachelor's", "Bachelor's Degree", "Master's Degree",
    'PROFESSIONAL', 'Business', 'Communications', 'MIS',
]);

const CURRENT_YEAR = new Date().getFullYear();
const PASSOUT_YEAR_REGEX = /\b(20(2[3-9]|3[0-2]))\b/g;
const BATCH_PHRASE_REGEX = /(?:batch|passout|pass.?out|graduated?|graduating)\s*(?:of\s*)?(?:year\s*)?(?:20)?(\d{2})/gi;

// Salary patterns (India-specific)
const SALARY_REGEX = /(?:₹|INR|Rs\.?)\s*[\d,.]+\s*(?:to|-|–)\s*[\d,.]+\s*(?:LPA|CTC|lakh|lakhs|per annum|\/month|per month)?|[\d.]+\s*(?:to|-|–)\s*[\d.]+\s*LPA|[\d]+\s*LPA/i;

// Experience patterns
const EXP_RANGE_REGEX = /\b(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:\+\s*)?years?\s*(?:of\s+(?:work\s+)?experience)?/i;
const EXP_PLUS_REGEX = /\b(\d+)\s*\+\s*years?\s*(?:of\s+(?:work\s+)?experience)?/i;
const EXP_FRESHER_REGEX = /\b(?:fresher|fresh graduate|0\s*(?:to|-)\s*[12]\s*years?|no\s+experience\s+required)/i;

// Work mode keywords
const REMOTE_REGEX = /\bremote\b|\bwork from home\b|\bwfh\b|\bfully remote\b/i;
const HYBRID_REGEX = /\bhybrid\b/i;
const ONSITE_REGEX = /\bonsite\b|\bon.?site\b|\bin.?office\b|\bin office\b/i;

// Canonical city aliases — both names map to the preferred single canonical name
// Prevents duplicate entries like ["Bengaluru", "Bangalore"] in the same locations array
const CITY_ALIASES: Record<string, string> = {
    'Bengaluru': 'Bangalore',
    'Gurgaon': 'Gurugram',
    'Bombay': 'Mumbai',
    'Calcutta': 'Kolkata',
    'Madras': 'Chennai',
    'Trivandrum': 'Thiruvananthapuram',
    'Vizag': 'Visakhapatnam',
    'Cochin': 'Kochi',
    'Secunderabad': 'Hyderabad',
    'Poona': 'Pune',
};

/**
 * Normalize raw Greenhouse location strings to clean, meaningful values.
 * Returns array of canonical values (may be empty if the string is meaningless).
 *
 * Examples:
 *   "Home based - Worldwide"     → ["Remote"]
 *   "Home Based - Americas"      → ["Remote"]
 *   "India (Remote)"             → ["Remote India"]
 *   "Office Based - London, UK"  → []  (filtered; international office)
 *   "Bengaluru"                  → ["Bangalore"]  (alias)
 *   "Bengaluru, Karnataka"       → ["Bangalore"]
 */
function normalizeLocationString(raw: string): string[] {
    const s = raw.trim();
    if (!s) return [];

    // Home based / remote → "Remote"
    if (/home.?based|home.?office|work.?from.?home|fully.?remote|work.?remotely/i.test(s)) return ['Remote'];
    if (/\bworldwide\b|\ball.?locations?\b|\banywhere\b/i.test(s)) return ['Remote'];
    if (/\bremote\b/i.test(s) && /india/i.test(s)) return ['Remote India'];
    if (/\bremote\b/i.test(s)) return ['Remote'];
    if (/\bpan.?india\b/i.test(s)) return ['PAN India'];

    // Strip country suffix for known Indian cities: "Bengaluru, India" → "Bengaluru"
    // Match: "<City>, India" or "<City>, Karnataka, India" etc.
    const indiaStrip = s.replace(/,?\s*(india|karnataka|maharashtra|telangana|tamil nadu|west bengal|uttar pradesh|rajasthan|gujarat|punjab|andhra pradesh|delhi|ncr)(\s*,.*)?$/i, '').trim();
    if (indiaStrip && indiaStrip !== s) return [indiaStrip];

    // Office based / office only → skip (not a real location)
    if (/^office.?based/i.test(s)) return [];

    // "City; City2" → split on semicolon
    if (s.includes(';')) {
        return s.split(';').flatMap(part => normalizeLocationString(part.trim())).filter(Boolean);
    }

    return [s];
}

export interface CdnMatchResult {
    requiredSkills: string[];
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedPassoutYears: number[];
    salaryRange: string;
    experienceMin: number | undefined;
    experienceMax: number | undefined;
    workMode: 'ONSITE' | 'HYBRID' | 'REMOTE' | null;
    locations: string[];
}

/**
 * Extract all possible fields from raw job description text using CDN metadata.
 * Returns partial matches — caller decides what to do with empty arrays.
 */
export function matchFromCdn(rawText: string, existingLocations: string[] = []): CdnMatchResult {
    const text = rawText || '';
    const lowerText = text.toLowerCase();

    // ─────────────────────────────────────────────────────────────────
    // 1. SKILLS — scan full text for every canonical skill (CDN-backed)
    // ─────────────────────────────────────────────────────────────────
    const skillsFound = new Set<string>();
    for (const [lowerSkill, canonicalSkill] of CANONICAL_SKILLS_MAP.entries()) {
        if (SOFT_SKILL_BLOCKLIST.has(lowerSkill)) continue;
        // Skip very short skills (1-2 chars) that match too broadly — C, Go etc handled via exact word
        // Exception: well-known acronyms with 2+ chars like 'AI', 'ML', 'Go' are fine
        if (lowerSkill.length < 2) continue;
        // For single-letter skills like 'C', 'R' — require exact word (space or start/end of line)
        const isVeryShort = lowerSkill.length <= 2 && /^[a-z]$/i.test(lowerSkill);
        const escaped = lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = isVeryShort
            ? new RegExp(`(?:^|\\s)(${escaped})(?:\\s|$|[,;.])`, 'i')   // strict: spaces/punctuation only
            : new RegExp(`(?:^|[^a-zA-Z0-9+#._/-])(${escaped})(?:$|[^a-zA-Z0-9+#._/-])`, 'i');
        if (pattern.test(lowerText)) {
            skillsFound.add(canonicalSkill);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. EDUCATION — degrees + courses from CDN education.json
    //    Uses the CDN course names mapped to DEGREE/PG/DIPLOMA levels
    // ─────────────────────────────────────────────────────────────────
    const degreesFound = new Set<string>();
    const coursesFound = new Set<string>();

    // 2a. Match degree levels from text keywords
    for (const [regex, level] of DEGREE_KEYWORD_MAP) {
        if (regex.test(text)) {
            degreesFound.add(level);
        }
    }

    // 2b. Match course names from text keywords (canonical course names from CDN)
    for (const [regex, courseName] of COURSE_KEYWORD_MAP) {
        if (regex.test(text)) {
            coursesFound.add(courseName);
        }
    }

    // 2c. Also scan for CDN education course names directly in text
    //     education.json: { courses: { DEGREE: [...], PG: [...], DIPLOMA: [...] } }
    if (CANONICAL_EDUCATION?.courses) {
        for (const [level, courseList] of Object.entries(CANONICAL_EDUCATION.courses)) {
            if (!Array.isArray(courseList)) continue;
            for (const courseName of courseList) {
                if (!courseName || courseName.length < 2) continue;
                // Skip generic ones that cause false positives
                if (GENERIC_COURSE_SKIP.has(courseName)) continue;

                const escaped = courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`(?:^|[^a-zA-Z0-9/.])(${escaped})(?:$|[^a-zA-Z0-9/.])`, 'i');
                if (pattern.test(text)) {
                    coursesFound.add(courseName);
                    degreesFound.add(level);
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. LOCATIONS — using CDN cities.json as source of truth
    //    Strategy:
    //    a) First normalise raw Greenhouse location strings ("Home based - Worldwide" → "Remote")
    //    b) Scan text for Indian cities (CDN INDIAN_CITIES_MAP) — these are always kept
    //    c) International cities only kept if NO Indian city was found (global job)
    //    d) Deduplicate aliases (Bengaluru↔Bangalore, Gurgaon↔Gurugram)
    // ─────────────────────────────────────────────────────────────────

    // 3a. Normalize raw existingLocations strings passed in from ATS API
    const normalizedRaw = new Set<string>();
    for (const raw of existingLocations) {
        if (!raw) continue;
        const norm = normalizeLocationString(raw);
        if (norm) for (const n of norm) normalizedRaw.add(n);
    }

    // 3b. Scan full text for PAN India / remote India / remote
    if (/\bpan.?india\b/i.test(text)) normalizedRaw.add('PAN India');
    if (/\bremote\s*[–-]\s*india\b|\bindia\s*[–-]\s*remote\b|\bindia\s*\(remote\)/i.test(text)) normalizedRaw.add('Remote India');
    if (/\bwork from home\b|\bwfh\b|\bfully remote\b|\bwork remotely\b/i.test(text)) normalizedRaw.add('Remote');

    // 3c. Scan full text for Indian cities via CDN INDIAN_CITIES_MAP
    const indianCitiesFound = new Set<string>();
    for (const [lowerCity, canonicalCity] of INDIAN_CITIES_MAP.entries()) {
        if (lowerCity.length < 3) continue;
        const escaped = lowerCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?:^|[^a-zA-Z])(${escaped})(?:$|[^a-zA-Z])`, 'i');
        if (pattern.test(lowerText)) {
            // Canonical alias resolution: both Bengaluru + Bangalore → Bangalore
            const city = CITY_ALIASES[canonicalCity] || canonicalCity;
            indianCitiesFound.add(city);
        }
    }
    // Also check in the already-normalised raw strings
    for (const raw of normalizedRaw) {
        const lower = raw.toLowerCase();
        if (INDIAN_CITIES_MAP.has(lower)) {
            const city = CITY_ALIASES[INDIAN_CITIES_MAP.get(lower)!] || INDIAN_CITIES_MAP.get(lower)!;
            indianCitiesFound.add(city);
        }
    }

    // 3d. Only add international cities if NO Indian city found at all
    const internationalCitiesFound = new Set<string>();
    if (indianCitiesFound.size === 0) {
        for (const [lowerCity, canonicalCity] of INTERNATIONAL_CITIES_MAP.entries()) {
            if (lowerCity.length < 3) continue;
            const escaped = lowerCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(?:^|[^a-zA-Z])(${escaped})(?:$|[^a-zA-Z])`, 'i');
            if (pattern.test(lowerText)) {
                internationalCitiesFound.add(canonicalCity);
            }
        }
    }

    // Merge: normalizedRaw descriptors + Indian cities + international (if no India)
    const locationsFound = new Set<string>();
    for (const loc of normalizedRaw) {
        // Keep remote/PAN India descriptors; drop raw office strings already cleaned
        if (/^(remote|pan india|remote india|worldwide)$/i.test(loc)) locationsFound.add(loc);
    }
    for (const city of indianCitiesFound) locationsFound.add(city);
    for (const city of internationalCitiesFound) locationsFound.add(city);

    // ─────────────────────────────────────────────────────────────────
    // 4. PASSOUT YEARS from text
    // ─────────────────────────────────────────────────────────────────
    const passoutYearsFound = new Set<number>();

    // Direct year mentions (2024, 2025, 2026, etc.)
    const yearMatches = text.matchAll(PASSOUT_YEAR_REGEX);
    for (const m of yearMatches) {
        const yr = parseInt(m[1], 10);
        if (yr >= CURRENT_YEAR - 1 && yr <= CURRENT_YEAR + 2) {
            passoutYearsFound.add(yr);
        }
    }

    // "batch of 25" / "graduating 2024" style
    const batchMatches = text.matchAll(BATCH_PHRASE_REGEX);
    for (const m of batchMatches) {
        const shortYear = parseInt(m[1], 10);
        const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear;
        if (fullYear >= CURRENT_YEAR - 1 && fullYear <= CURRENT_YEAR + 2) {
            passoutYearsFound.add(fullYear);
        }
    }

    // "freshers" / "0-1 year" → include current and last year
    if (EXP_FRESHER_REGEX.test(text)) {
        passoutYearsFound.add(CURRENT_YEAR);
        passoutYearsFound.add(CURRENT_YEAR - 1);
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. SALARY from text
    // ─────────────────────────────────────────────────────────────────
    let salaryRange = '';
    const salaryMatch = text.match(SALARY_REGEX);
    if (salaryMatch) {
        salaryRange = salaryMatch[0].trim();
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. EXPERIENCE from text
    // ─────────────────────────────────────────────────────────────────
    let experienceMin: number | undefined;
    let experienceMax: number | undefined;

    const expRangeMatch = text.match(EXP_RANGE_REGEX);
    if (expRangeMatch) {
        const min = parseInt(expRangeMatch[1], 10);
        const max = parseInt(expRangeMatch[2], 10);
        if (!isNaN(min)) experienceMin = min;
        if (!isNaN(max)) experienceMax = max;
    } else {
        const expPlusMatch = text.match(EXP_PLUS_REGEX);
        if (expPlusMatch) {
            const min = parseInt(expPlusMatch[1], 10);
            if (!isNaN(min)) { experienceMin = min; experienceMax = min; }
        }
    }

    // Freshers explicitly → 0 experience
    if (EXP_FRESHER_REGEX.test(text)) {
        if (experienceMin === undefined) experienceMin = 0;
    }

    // ─────────────────────────────────────────────────────────────────
    // 7. WORK MODE from text
    // ─────────────────────────────────────────────────────────────────
    let workMode: 'ONSITE' | 'HYBRID' | 'REMOTE' | null = null;
    if (REMOTE_REGEX.test(text)) workMode = 'REMOTE';
    else if (HYBRID_REGEX.test(text)) workMode = 'HYBRID';
    else if (ONSITE_REGEX.test(text)) workMode = 'ONSITE';

    return {
        requiredSkills: Array.from(skillsFound).slice(0, 25),
        allowedDegrees: Array.from(degreesFound),
        // Normalize and deduplicate courses using constants (maps 'B.Tech' → 'B.Tech / B.E.' etc)
        allowedCourses: normalizeCourseArray(Array.from(coursesFound)),
        allowedPassoutYears: Array.from(passoutYearsFound).sort(),
        salaryRange,
        experienceMin,
        experienceMax,
        workMode,
        locations: Array.from(locationsFound).filter(Boolean),
    };
}

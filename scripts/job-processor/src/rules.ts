/**
 * Deterministic Rule Engine for ATS Job Processing
 * 
 * These rules run BEFORE any LLM, deriving structured fields from
 * simple string patterns in the title, department, and description.
 */

export interface RuleEngineInput {
    title: string;
    department?: string;
    description?: string;
    location?: string;
    employmentType?: string;
}

export interface RuleEngineOutput {
    type?: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    experienceMin?: number;
    experienceMax?: number;
    workMode?: 'ONSITE' | 'HYBRID' | 'REMOTE';
    employmentType?: string;
    inferredBatches?: number[];
}

const CURRENT_YEAR = new Date().getFullYear();

// Title patterns → job type
const INTERNSHIP_PATTERNS = [
    /\bintern\b/i, /\binternship\b/i, /\bapprentice\b/i, /\bapprentice ?ship\b/i,
    /\btrainee\b/i, /\bprogramme?\b.*trainee/i, /\bstipend\b/i,
    /graduate\s+programme/i
];

const FRESHER_TITLE_PATTERNS = [
    /\bgraduate\s+engineer\b/i, /\bjunior\b/i, /\bassociate\b/i,
    /\bentry.?level\b/i, /\bfresh(er)?\b/i, /\bcampus\b/i,
    /\bnew\s+grad\b/i, /\bget/i
];

// Title → experience range
const EXPERIENCE_TITLE_PATTERNS: Array<{ pattern: RegExp; min: number; max: number }> = [
    { pattern: /\bgraduate\s+engineer\s+trainee\b/i, min: 0, max: 1 },
    { pattern: /\bgraduate\s+engineer\b/i, min: 0, max: 1 },
    { pattern: /\bjunior\s+(software|developer|engineer|analyst)/i, min: 0, max: 2 },
    { pattern: /\bassociate\s+(software|developer|engineer|analyst|consultant)/i, min: 0, max: 2 },
    { pattern: /\bentry.level\b/i, min: 0, max: 1 },
    { pattern: /\bfresher\b/i, min: 0, max: 1 },
    { pattern: /\bnew\s+grad\b/i, min: 0, max: 1 },
    { pattern: /\b0.?-?.?1\s+year/i, min: 0, max: 1 },
    { pattern: /\b0.?-?.?2\s+year/i, min: 0, max: 2 },
];

// Description/employment type → work mode
const REMOTE_PATTERNS = [
    /\b(fully\s+)?remote\b/i, /\bwork\s+from\s+home\b/i, /\bwfh\b/i,
    /\bdistributed\s+team\b/i, /\bremote.first\b/i
];
const HYBRID_PATTERNS = [
    /\bhybrid\b/i, /\bflexible\s+work\b/i, /\bpartial.?remote\b/i
];

// Text → year batch extraction
function extractBatches(text: string): number[] {
    const batches: number[] = [];
    // Match patterns like "2024 / 2025", "2024, 2025, 2026", "batch of 2024"
    const yearPattern = /\b(20[2-9][0-9])\b/g;
    const matches = text.matchAll(yearPattern);
    for (const m of matches) {
        const year = parseInt(m[1], 10);
        if (year >= CURRENT_YEAR - 1 && year <= CURRENT_YEAR + 3) {
            batches.push(year);
        }
    }
    return Array.from(new Set(batches)).sort();
}

// Parse experience range from description text (e.g. "0-2 years", "0 to 1 year")
function extractExperienceFromText(text: string): { min: number; max: number } | null {
    // "0-2 years", "0 to 2 years experience"
    const rangeMatch = text.match(/\b(\d+)\s*[-–to]+\s*(\d+)\s*(?:year|yr)/i);
    if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        if (max <= 10) return { min, max };
    }
    // "0 years", "1 year experience"
    const singleMatch = text.match(/\b(\d+)\s*(?:year|yr)s?\s*(?:of\s+)?(?:experience|exp)/i);
    if (singleMatch) {
        const val = parseInt(singleMatch[1], 10);
        if (val <= 5) return { min: val, max: val };
    }
    // "Freshers" or "No experience required"
    if (/\bno experience\b|\b0[\s-]+experience\b|\bfreshers?\s+(?:can|may|are)\b/i.test(text)) {
        return { min: 0, max: 0 };
    }
    return null;
}

export function applyRuleEngine(input: RuleEngineInput): RuleEngineOutput {
    const output: RuleEngineOutput = {};
    const titleLower = input.title.toLowerCase();
    const descText = `${input.description || ''} ${input.location || ''} ${input.employmentType || ''}`;

    // 1. Job Type
    if (INTERNSHIP_PATTERNS.some(p => p.test(input.title))) {
        output.type = 'INTERNSHIP';
    } else {
        output.type = 'JOB';
    }

    // 2. Experience from title patterns
    for (const rule of EXPERIENCE_TITLE_PATTERNS) {
        if (rule.pattern.test(input.title)) {
            output.experienceMin = rule.min;
            output.experienceMax = rule.max;
            break;
        }
    }

    // 3. Experience from description text (overrides title if more specific)
    if (output.experienceMin === undefined) {
        const expFromText = extractExperienceFromText(descText);
        if (expFromText) {
            output.experienceMin = expFromText.min;
            output.experienceMax = expFromText.max;
        }
    }

    // 4. Work Mode from location/description
    if (REMOTE_PATTERNS.some(p => p.test(input.title) || p.test(descText))) {
        output.workMode = 'REMOTE';
    } else if (HYBRID_PATTERNS.some(p => p.test(input.title) || p.test(descText))) {
        output.workMode = 'HYBRID';
    }

    // 5. Employment type normalization
    const et = (input.employmentType || '').toLowerCase();
    if (et.includes('full') || et.includes('fte')) output.employmentType = 'Full Time';
    else if (et.includes('part')) output.employmentType = 'Part Time';
    else if (et.includes('contract') || et.includes('contractor')) output.employmentType = 'Contract';
    else if (et.includes('intern')) output.employmentType = 'Internship';

    // 6. Batch years from description
    const batches = extractBatches(descText);
    if (batches.length > 0) output.inferredBatches = batches;

    return output;
}

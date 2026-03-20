import { ParsedJob } from './types.js';
import { OpportunityType, WorkMode, EducationLevel, SalaryPeriod } from '@fresherflow/types';
import {
    NAV_PATTERNS, TITLE_KEYWORDS, COMMON_SKILLS, COMMON_CITIES,
} from './heuristics.js';

/**
 * Lightweight browser-safe job text parser.
 * No heavy dependencies like compromise or natural.
 */
import { 
    normalizeSalary as domainNormalizeSalary, 
    normalizeExpiry as domainNormalizeExpiry 
} from '@fresherflow/domain';

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
        type: OpportunityType.JOB,
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
    const companyPatterns = [
        /(?:About|Join|At)\s+([A-Z][^\n,]{2,40})(?:\n|,|\s+is\s+|\s+makes\s+|\s+offers\s+)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:is a|is an|makes|offers|provides|specializes)/i,
        /Working (?:at|with|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    ];
    for (const pattern of companyPatterns) {
        const m = text.match(pattern);
        if (m?.[1]) { result.company = m[1].trim(); break; }
    }

    // Location
    const locations: string[] = [];
    for (const city of COMMON_CITIES) {
        if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
            locations.push(city);
        }
    }
    result.locations = Array.from(new Set(locations));

    // Skills
    const foundSkills = COMMON_SKILLS.filter(skill => {
        const escaped = skill.replace(/[+#.]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
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

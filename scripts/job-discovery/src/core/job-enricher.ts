import { OpportunityType, WorkMode, EducationLevel } from '@fresherflow/types';
import {
    extractPassoutYears,
    extractExperience,
    extractWorkMode,
} from '@fresherflow/parser';
import { AtsJob } from '@fresherflow/plugins';
import { EnrichedJobPayload } from './enricher-schema.js';
import { validateAndCleanPayload } from './validator.js';

/**
 * System prompt instructing LLMs to extract fields adhering strictly to docs/data/templates.md
 */
export const ENRICHER_SYSTEM_PROMPT = `
You are an expert ATS Job Parsing & Standardization Engine for FresherFlow.
Your task is to take a raw Job Description and extract a structured JSON payload adhering to these strict rules:

1. **locations**: City-Only Principle. In the locations array, specify ONLY the city name (e.g. ["Bengaluru"], ["Hyderabad"], ["Noida"]). NEVER include state or country names (e.g. DO NOT write "Hyderabad, Telangana, India").
2. **allowedDegrees**: Must be an array containing ONLY these exact enum values: "TENTH", "INTER", "DIPLOMA", "DEGREE", "PG".
3. **allowedCourses**: Actual degree/course names (e.g. ["B.Tech", "B.E", "M.Tech", "MCA"]).
4. **allowedSpecializations**: Branch names (e.g. ["Computer Science", "Information Technology", "Electronics"]).
5. **allowedPassoutYears**: Array of numbers representing eligible graduation years (e.g. [2024, 2025, 2026]). If none mentioned, return [].
6. **experienceMin** and **experienceMax**: Min and max years of experience. For freshers/entry-level, experienceMin should be 0.
7. **requiredSkills**: Array of technical skills, frameworks, tools, programming languages mentioned (e.g. ["Python", "React", "SQL"]).
8. **description**: Must contain 80-90% of job info. Format cleanly using \\n for line breaks and **Heading** for section headings (**About the Role**, **Responsibilities**, **Requirements**, **Eligibility**).
9. **notesHighlights**: Keep short callouts ONLY (e.g. shift timing, bond/service agreement, joining deadline). Must not exceed 25% of description length.
10. **applicationDetails**: Must be null for direct URL redirect jobs.
`;

// Minimal course map for degree extraction (not yet in @fresherflow/parser with this level of detail)
const COURSE_MAP: Array<{ pattern: RegExp; course: string; isPg?: boolean }> = [
    { pattern: /\bb\.?com\b/i,   course: 'B.Com' },
    { pattern: /\bm\.?com\b/i,   course: 'M.Com',   isPg: true },
    { pattern: /\bmba\b/i,       course: 'MBA',      isPg: true },
    { pattern: /\bbba\b/i,       course: 'BBA' },
    { pattern: /\bca\b/i,        course: 'CA',       isPg: true },
    { pattern: /\bbcm\b/i,       course: 'CMA',      isPg: true },
    { pattern: /\bb\.?tech\b/i,  course: 'B.Tech' },
    { pattern: /\bb\.?e\b/i,     course: 'B.E' },
    { pattern: /\bm\.?tech\b/i,  course: 'M.Tech',   isPg: true },
    { pattern: /\bmca\b/i,       course: 'MCA',      isPg: true },
    { pattern: /\bbca\b/i,       course: 'BCA' },
    { pattern: /\bb\.?sc\b/i,    course: 'B.Sc' },
    { pattern: /\bm\.?sc\b/i,    course: 'M.Sc',     isPg: true },
    { pattern: /\bb\.?a\b/i,     course: 'B.A' },
];

/**
 * Rule-based fallback parser when LLM API keys are not available.
 * Uses @fresherflow/parser for experience, passout years, and work mode extraction.
 */
export function enrichJobRuleBased(
    job: AtsJob | { title: string; company: string; description?: string; applyLink: string; location?: string }
): EnrichedJobPayload {
    const title = job.title || 'Software Engineer';
    const rawDesc = job.description || '';
    const textToScan = `${title}\n${rawDesc}`;

    // ── Passout years — @fresherflow/parser ──────────────────────────────────
    const allowedPassoutYears = extractPassoutYears(textToScan).sort((a, b) => a - b);

    // ── Experience — @fresherflow/parser ─────────────────────────────────────
    const exp = extractExperience(textToScan);
    const expMin = exp.min ?? 0;
    const expMax = exp.max ?? expMin;

    // ── Work mode — @fresherflow/parser ──────────────────────────────────────
    // extractWorkMode returns WorkMode enum; add location string for extra signal
    const locationStr = job.location ? ` ${job.location}` : '';
    const workModeEnum = extractWorkMode(textToScan + locationStr);
    const workMode = workModeEnum as unknown as WorkMode;

    // ── Courses & degrees ────────────────────────────────────────────────────
    const coursesFound = new Set<string>();
    const degrees: EducationLevel[] = [EducationLevel.DEGREE];
    for (const { pattern, course, isPg } of COURSE_MAP) {
        if (pattern.test(textToScan)) {
            coursesFound.add(course);
            if (isPg && !degrees.includes(EducationLevel.PG)) degrees.push(EducationLevel.PG);
        }
    }
    if (/\bDiploma\b/i.test(textToScan) && !degrees.includes(EducationLevel.DIPLOMA)) {
        degrees.push(EducationLevel.DIPLOMA);
    }
    const allowedCourses = coursesFound.size > 0
        ? Array.from(coursesFound)
        : ['B.Tech', 'B.E', 'B.Sc', 'BCA'];

    // ── Skills (hardcoded list — CDN-based matching is in job-processor) ─────
    const SKILL_LIST = [
        'Python', 'Java', 'C++', 'C#', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue',
        'Node.js', 'Express', 'Spring Boot', 'Django', 'Flask', 'SQL', 'PostgreSQL', 'MySQL',
        'MongoDB', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'REST API', 'GraphQL',
        'Machine Learning', 'AI', 'NLP', 'Data Analytics', 'HTML', 'CSS', 'Linux',
        'Accounts Payable', 'Invoice Processing', 'Financial Analysis', 'Reconciliation',
        'MS Office', 'Excel', 'Microsoft Word',
    ];
    const extractedSkills = SKILL_LIST.filter(skill =>
        new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(textToScan)
    );

    // ── Notes highlights ─────────────────────────────────────────────────────
    let notesHighlights: string | undefined;
    if (/\bfreshers?\s*(are\s*)?eligible\b/i.test(textToScan)) {
        notesHighlights = 'Freshers are eligible.';
    } else if (expMin === 0 && expMax <= 1) {
        notesHighlights = '0-1 year experience eligible.';
    }

    // ── Job function ─────────────────────────────────────────────────────────
    let jobFunction = (job as any).jobFunction || '';
    if (!jobFunction) {
        const roleMatch = textToScan.match(/Job Role\s*\n?\s*(.+)/i) || textToScan.match(/Job Function\s*\n?\s*(.+)/i);
        if (roleMatch) jobFunction = roleMatch[1].trim();
    }

    const rawPayload: EnrichedJobPayload = {
        type: OpportunityType.JOB,
        title,
        company: job.company || 'Company',
        description: rawDesc || title,
        allowedDegrees: degrees,
        allowedCourses,
        allowedSpecializations: [],
        allowedPassoutYears,
        requiredSkills: extractedSkills,
        locations: job.location ? [job.location] : [],
        workMode,
        experienceMin: expMin,
        experienceMax: expMax,
        jobFunction: jobFunction || undefined,
        notesHighlights,
        applyLink: job.applyLink,
        applicationDetails: null,
    };

    return validateAndCleanPayload(rawPayload);
}

/**
 * Main Enricher Entrypoint.
 * Returns a fully normalized, templates.md-compliant payload.
 * Can be extended to call an LLM when an API key is available.
 */
export async function enrichJobPayload(
    job: AtsJob | { title: string; company: string; description?: string; applyLink: string; location?: string }
): Promise<EnrichedJobPayload> {
    return enrichJobRuleBased(job);
}

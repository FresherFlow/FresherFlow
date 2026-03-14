/**
 * @fresherflow/parser — public API
 *
 * Sub-modules:
 *   types.ts      — ParsedJob, NormalizedSalary
 *   heuristics.ts — dictionaries, shared predicates
 *   extract.ts    — field extraction functions
 *   normalize.ts  — salary and date normalization
 */

// Re-export types
export type { ParsedJob, NormalizedSalary } from './types';

// Re-export individual functions for targeted use
export {
    extractSkills,
    extractLocations,
    extractTitle,
    extractCompany,
    extractType,
    extractPassoutYears,
    extractDegrees,
    extractWorkMode,
    extractExperience,
    extractIncentives,
    extractJobFunction,
    extractWalkInDetails,
} from './extract';

export { normalizeSalary, normalizeExpiry } from './normalize';

// ── parseJobText: the main entry point ───────────────────────────────────────

import { ParsedJob } from './types';
import {
    extractTitle, extractCompany, extractType, extractLocations, extractSkills,
    extractPassoutYears, extractDegrees, extractWorkMode, extractExperience,
    extractIncentives, extractJobFunction, extractWalkInDetails,
} from './extract';
import { normalizeSalary, normalizeExpiry } from './normalize';

/**
 * Parse raw job text and return all structured fields.
 * This is the unified entry point for all apps: ingestion, API, and mobile.
 */
export function parseJobText(text: string): ParsedJob {
    const textLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textLower = text.toLowerCase();

    const type = extractType(textLower);
    const locations = extractLocations(text);
    const skills = extractSkills(text, locations);
    const salary = normalizeSalary(text);
    const experience = extractExperience(text);
    const workMode = extractWorkMode(text);
    const walkIn = type === 'WALKIN' ? extractWalkInDetails(text, textLines) : {};

    return {
        title: extractTitle(textLines),
        company: extractCompany(text),
        type,
        locations,
        skills,
        allowedPassoutYears: extractPassoutYears(text),
        allowedDegrees: extractDegrees(text),
        isFresherOnly: textLower.includes('fresher') || textLower.includes('freshers'),
        workMode,
        isRemote: workMode === 'REMOTE',
        jobFunction: extractJobFunction(textLower),
        incentives: extractIncentives(text),
        salaryPeriod: salary.period,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryRange: salary.range,
        experienceMin: experience.min,
        experienceMax: experience.max,
        expiresAt: normalizeExpiry(text),
        description: text.trim().substring(0, 2000),
        ...walkIn,
    };
}

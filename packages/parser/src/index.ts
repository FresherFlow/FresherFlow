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
export type { ParsedJob, NormalizedSalary } from './types.js';

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
} from './extract.js';

export { parseJobTextLite } from './lite.js';

export { normalizeSalary, normalizeExpiry } from './normalize.js';
export { UrlParser } from './url-parser.js';
export type { JobSourceType, UrlParseResult } from './url-parser.js';

export { cleanAndResolveLocations } from './location-matcher.js';

export { parseFromTemplate, isTemplateSource, cleanAggregatorTitle, setCdnMetadata } from './template-parser.js';
export type { TemplateParseResult } from './template-parser.js';

export { parseHtmlToMarkdown, cleanClickbait } from './html-to-markdown.js';

// ── parseJobText: the main entry point ───────────────────────────────────────

import { ParsedJob } from './types.js';
import {
    extractTitle, extractCompany, extractType, extractLocations, extractSkills,
    extractPassoutYears, extractDegrees, extractWorkMode, extractExperience,
    extractIncentives, extractJobFunction, extractWalkInDetails,
} from './extract.js';
import { normalizeSalary, normalizeExpiry } from './normalize.js';
import { cleanAndResolveLocations } from './location-matcher.js';

/**
 * Parse raw job text and return all structured fields.
 * This is the unified entry point for all apps: ingestion, API, and mobile.
 */
export function parseJobText(text: string): ParsedJob {
    const textLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textLower = text.toLowerCase();

    const type = extractType(textLower);
    const rawLocations = extractLocations(text);
    const { locations, structuredLocations } = cleanAndResolveLocations(rawLocations);
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
        structuredLocations,
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

/**
 * JSON feed connector.
 *
 * Covers first-party feeds and partner exports, and is the fallback shape for
 * CUSTOM sources. The exact schema is undocumented by design (each partner
 * brings its own), so field resolution is deliberately forgiving: a list of
 * candidate keys per field, first non-empty wins.
 */

import { safeFetchJson } from '../safeFetch';
import type { Connector, ConnectorContext, RawItem } from '../types';

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
        if (typeof value === 'number') return String(value);
    }
    return null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value.trim());
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
}

function asList(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

/**
 * Locate the listing array in an arbitrary envelope.
 *
 * Partner feeds nest under `data`, `results`, `jobs`, `items`, and so on, so
 * rather than requiring one schema this unwraps known container keys first and
 * otherwise takes the first array-of-objects it finds.
 */
function extractList(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null);
    }
    if (typeof payload !== 'object' || payload === null) return [];

    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'results', 'jobs', 'items', 'listings', 'opportunities', 'records']) {
        const nested = record[key];
        if (Array.isArray(nested)) return extractList(nested);
    }

    // Fall back to the first array-valued property.
    for (const value of Object.values(record)) {
        if (Array.isArray(value)) return extractList(value);
    }
    return [];
}

function toRawItem(
    entry: Record<string, unknown>,
    defaultCategory: ConnectorContext['defaultCategory']
): RawItem {
    const locations = asList(
        entry.location ?? entry.locations ?? entry.city ?? entry.jobLocation ?? entry.office
    ).map((value) => {
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value !== null) {
            const loc = value as Record<string, unknown>;
            return [loc.city, loc.state, loc.country]
                .filter((part): part is string => typeof part === 'string' && part.length > 0)
                .join(', ');
        }
        return '';
    });

    return {
        sourceExternalId:
            firstString(entry, ['id', 'externalId', 'external_id', 'sourceId', 'jobId', 'requisitionId', 'reference']) ?? null,
        title: firstString(entry, ['title', 'name', 'role', 'position', 'jobTitle']) ?? '',
        company:
            firstString(entry, ['company', 'companyName', 'employer', 'organization', 'organisation']) ?? '',
        sourceLink: firstString(entry, ['url', 'link', 'sourceLink', 'applyUrl', 'jobUrl', 'sourceUrl']),
        applyLink: firstString(entry, ['applyLink', 'applyUrl', 'apply_url', 'applicationUrl']),
        description: firstString(entry, ['description', 'content', 'jobDescription', 'summary', 'body']),
        locations,
        category: (firstString(entry, ['category', 'type']) as RawItem['category']) ?? undefined,
        employmentTypes: asList(entry.employmentTypes ?? entry.employmentType).filter(
            (value): value is string => typeof value === 'string'
        ),
        workMode: firstString(entry, ['workMode', 'work_mode', 'remote', 'locationType']),
        experienceLevel: firstString(entry, ['experienceLevel', 'experience_level', 'seniority']),
        sector: firstString(entry, ['sector', 'industry']),
        salaryMin: firstNumber(entry, ['salaryMin', 'salary_min', 'minSalary', 'salaryFrom']),
        salaryMax: firstNumber(entry, ['salaryMax', 'salary_max', 'maxSalary', 'salaryTo']),
        salaryPeriod: firstString(entry, ['salaryPeriod', 'salary_period', 'salaryType']),
        requiredSkills: asList(entry.requiredSkills ?? entry.skills ?? entry.technologies)
            .filter((value): value is string => typeof value === 'string'),
        allowedDegrees: asList(entry.allowedDegrees ?? entry.eligibility ?? entry.qualifications)
            .filter((value): value is string => typeof value === 'string'),
        allowedCourses: asList(entry.allowedCourses ?? entry.courses)
            .filter((value): value is string => typeof value === 'string'),
        allowedSpecializations: asList(entry.allowedSpecializations ?? entry.specializations)
            .filter((value): value is string => typeof value === 'string'),
        // Feeds send years as numbers or numeric strings; `normalize` coerces
        // and range-checks them, so pass both through untyped here.
        allowedPassoutYears: asList(
            entry.allowedPassoutYears ?? entry.passoutYears ?? entry.eligibleYears
        ) as RawItem['allowedPassoutYears'],
        closesAt: firstString(entry, ['closesAt', 'closingDate', 'deadline', 'applicationDeadline', 'expiresAt']),
        publishedAt: firstString(entry, ['publishedAt', 'postedAt', 'datePosted', 'createdAt']),
        raw: entry,
        reasonFlags: [],
    };
}

export const jsonFeedConnector: Connector = {
    sourceType: 'JSON_FEED',
    async fetchItems(ctx: ConnectorContext): Promise<RawItem[]> {
        const payload = await safeFetchJson(ctx.endpoint, {
            signal: ctx.signal,
            timeoutMs: ctx.timeoutMs,
            fetchImpl: ctx.fetchImpl,
        });
        return extractList(payload).map((entry) => toRawItem(entry, ctx.defaultCategory));
    },
};


/**
 * Phase 6 - the one place a public search/filter request is turned into
 * database predicates.
 *
 * Before this module the taxonomy was filtered through three unrelated
 * `normalizeTypeParam` implementations (public `_helpers`, `feed.ts`, admin
 * `_helpers`), and the public search route spread a Prisma where-input into a
 * `SearchOptions` object it did not belong in, silently dropping the filter.
 * Every dimension now lives here so search, feed, and the Phase 7 saved-search
 * matcher cannot drift apart.
 *
 * The split taxonomy means a single legacy `?type=` value can expand into
 * several columns (INTERNSHIP is a category AND an employment type), which is
 * why the legacy resolver returns a partial dimensions object rather than a
 * single enum value.
 *
 * Contract: `parseOpportunityFilters` NEVER throws on bad input. An
 * unparseable value is dropped, so one hostile query string cannot 500 search.
 */

import { Prisma } from '@fresherflow/database';
import {
    OpportunityCategory,
    EmploymentType,
    RecruitmentMethod,
    WorkMode,
    Sector,
    ExperienceLevel,
    EducationLevel,
    Availability,
    OpportunitySourceKind,
    OpportunityTrustLevel,
} from '@fresherflow/database';

const { sql, join } = Prisma;
type Sql = Prisma.Sql;

/** The enums are generated from the schema; this allowlist is not. */
function enumValues<T extends Record<string, string>>(e: T): Set<string> {
    return new Set(Object.values(e));
}

const CATEGORY_VALUES = enumValues(OpportunityCategory);
const EMPLOYMENT_TYPE_VALUES = enumValues(EmploymentType);
const RECRUITMENT_METHOD_VALUES = enumValues(RecruitmentMethod);
const WORK_MODE_VALUES = enumValues(WorkMode);
const SECTOR_VALUES = enumValues(Sector);
const EXPERIENCE_LEVEL_VALUES = enumValues(ExperienceLevel);
const DEGREE_VALUES = enumValues(EducationLevel);
const AVAILABILITY_VALUES = enumValues(Availability);
const SOURCE_KIND_VALUES = enumValues(OpportunitySourceKind);
const TRUST_LEVEL_VALUES = enumValues(OpportunityTrustLevel);

/** Public sort keys are allowlisted so `sort` can never reach SQL as a fragment. */
export const SEARCH_SORT_KEYS = [
    'relevance',
    'newest',
    'oldest',
    'salary_high',
    'salary_low',
    'deadline',
] as const;
export type SearchSortKey = (typeof SEARCH_SORT_KEYS)[number];

export const MAX_SEARCH_LIMIT = 50;
export const MAX_SEARCH_PAGE = 100;
export const MAX_SEARCH_OFFSET = 5000;
export const MAX_SALARY = 100_000_000;
export const MAX_TAG_LENGTH = 60;
export const MAX_LIST_VALUES = 25;
export const MAX_QUERY_LENGTH = 200;

/** Rejects absurd input before it can reach the query planner. */
const MAX_FILTER_STRING = 200;

/** Split a repeated or comma-separated query param into trimmed pieces. */
function toList(value: unknown): string[] {
    const raw = Array.isArray(value) ? value : [value];
    const out: string[] = [];
    for (const entry of raw) {
        if (typeof entry !== 'string') continue;
        // Cap the input length before splitting so a 1MB param cannot blow up.
        if (entry.length > MAX_FILTER_STRING) continue;
        for (const piece of entry.split(',')) {
            const trimmed = piece.trim();
            if (trimmed.length > 0) out.push(trimmed);
            if (out.length >= MAX_LIST_VALUES) return out;
        }
    }
    return out;
}

/** Enum tokens are case- and separator-insensitive: `full-time` -> FULL_TIME. */
function normalizeEnumToken(value: string): string {
    return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function toEnumList(value: unknown, allowed: Set<string>): string[] {
    const out: string[] = [];
    for (const piece of toList(value)) {
        const normalized = normalizeEnumToken(piece);
        if (allowed.has(normalized) && !out.includes(normalized)) out.push(normalized);
        if (out.length >= MAX_LIST_VALUES) break;
    }
    return out;
}

/**
 * Free-text list values (skills, courses, tags) are NOT enums, so they cannot
 * be allowlisted. Cap them and strip characters that would change the meaning
 * of a Postgres LIKE pattern.
 */
function toTextList(value: unknown, maxLength: number): string[] {
    const out: string[] = [];
    for (const piece of toList(value)) {
        const cleaned = piece.replace(/[%_\\]/g, '').slice(0, maxLength).trim();
        if (cleaned.length >= 2 && !out.includes(cleaned)) out.push(cleaned);
        if (out.length >= MAX_LIST_VALUES) break;
    }
    return out;
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toInt(value: unknown, bounds: { min: number; max: number }): number | undefined {
    const parsed = toNumber(value);
    if (parsed === undefined) return undefined;
    const rounded = Math.trunc(parsed);
    if (rounded < bounds.min || rounded > bounds.max) return undefined;
    return rounded;
}

/**
 * Accepts an ISO date, or a `+7d` / `+2w` style relative deadline.
 * Returns undefined rather than an Invalid Date, because an invalid Date
 * would become `NaN` in the SQL template literal.
 */
function toDate(value: unknown, now: Date): Date | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return undefined;

    const relative = /^\+?(\d{1,4})([hdwmy])$/i.exec(trimmed);
    if (relative) {
        const amount = Number(relative[1]);
        const unitMs: Record<string, number> = {
            h: 3600_000,
            d: 86_400_000,
            w: 604_800_000,
            m: 2_592_000_000,
            y: 31_536_000_000,
        };
        const ms = unitMs[relative[2].toLowerCase()];
        return new Date(now.getTime() + amount * ms);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toSortKey(raw: unknown): SearchSortKey {
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const aliases: Record<string, SearchSortKey> = {
        '': 'relevance',
        relevance: 'relevance',
        best: 'relevance',
        newest: 'newest',
        recent: 'newest',
        latest: 'newest',
        date: 'newest',
        oldest: 'oldest',
        salary: 'salary_high',
        salary_high: 'salary_high',
        salary_desc: 'salary_high',
        salary_low: 'salary_low',
        salary_asc: 'salary_low',
        deadline: 'deadline',
        closing: 'deadline',
        closing_soon: 'deadline',
    };
    return aliases[value] ?? 'relevance';
}

// -- Legacy `type` resolution --

/**
 * Resolve the legacy mixed `?type=` param across the split dimensions.
 *
 * One legacy value can select several columns at once, so this returns a
 * partial dimensions object rather than a single enum value. `government` is
 * the one case that does not fit category/recruitment/employment: it is a
 * `Sector`, so it resolves there instead.
 */
export function resolveLegacyTypeFilter(raw?: string): {
    category?: string;
    recruitmentMethod?: string;
    employmentType?: string;
    sector?: string;
} | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toLowerCase();
    if (value.length === 0) return undefined;

    switch (value) {
        case 'job':
        case 'jobs':
            return { category: 'EMPLOYMENT' };
        case 'internship':
        case 'internships':
            return { category: 'EMPLOYMENT', employmentType: 'INTERNSHIP' };
        case 'walk-in':
        case 'walkin':
        case 'walkins':
        case 'walk-ins':
            return { recruitmentMethod: 'WALK_IN' };
        case 'scholarship':
        case 'scholarships':
            return { category: 'SCHOLARSHIP' };
        case 'competition':
        case 'competitions':
            return { category: 'COMPETITION' };
        case 'event':
        case 'events':
            return { category: 'EVENT' };
        case 'education':
        case 'course':
            return { category: 'EDUCATION' };
        case 'government':
        case 'govt':
        case 'government-job':
            return { sector: 'GOVERNMENT' };
        default:
            return undefined;
    }
}

// -- Filter shape --

/** Normalized, DB-ready filter set. Arrays are always defined, possibly empty. */
export interface OpportunityFilters {
    query: string;
    category: string[];
    employmentTypes: string[];
    recruitmentMethods: string[];
    workModes: string[];
    sectors: string[];
    experienceLevels: string[];
    degrees: string[];
    courses: string[];
    specializations: string[];
    passoutYears: number[];
    availabilities: string[];
    skills: string[];
    locations: string[];
    applicantLocations: string[];
    sourceKinds: string[];
    trustLevels: string[];
    tags: string[];
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
    passoutYearMin?: number;
    passoutYearMax?: number;
    postedWithinDays?: number;
    deadlineBefore?: Date;
    expiresAfter?: Date;
    siteMode: 'private' | 'govt';
    sort: SearchSortKey;
    page: number;
    limit: number;
    offset: number;
}

const EMPTY_FILTERS: OpportunityFilters = {
    query: '',
    category: [],
    employmentTypes: [],
    recruitmentMethods: [],
    workModes: [],
    sectors: [],
    experienceLevels: [],
    degrees: [],
    courses: [],
    specializations: [],
    passoutYears: [],
    availabilities: [],
    skills: [],
    locations: [],
    applicantLocations: [],
    sourceKinds: [],
    trustLevels: [],
    tags: [],
    siteMode: 'private',
    sort: 'relevance',
    page: 1,
    limit: 20,
    offset: 0,
};

/**
 * Parse a raw query object into validated filters.
 *
 * Shared by the public search route and (from Phase 7) the saved-search
 * matcher, so a saved search filters identically to the live search that
 * created it.
 *
 * Bad input is dropped, never thrown: a mistyped filter chip degrades to "no
 * filter" instead of a 400, so a stale share link can never break search.
 */
export function parseOpportunityFilters(
    query: Record<string, unknown>,
    now: Date = new Date()
): OpportunityFilters {
    // Step 1: coarse per-field bounds. Cheap, and keeps pathological input
    // (a 1MB string, a 10^9 page) from reaching the normalizers below.
    const shaped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(query)) {
        shaped[key] =
            typeof value === 'string' && value.length > MAX_FILTER_STRING
                ? value.slice(0, MAX_FILTER_STRING)
                : value;
    }

    // Step 2: per-dimension normalization. Every helper drops bad values
    // rather than throwing, so one bad param degrades to "no filter".
    const legacy = resolveLegacyTypeFilter(
        typeof shaped.type === 'string' ? shaped.type : undefined
    );

    const page = toInt(shaped.page, { min: 1, max: MAX_SEARCH_PAGE }) ?? 1;
    const limit = toInt(shaped.limit, { min: 1, max: MAX_SEARCH_LIMIT }) ?? 20;

    const filters: OpportunityFilters = {
        ...EMPTY_FILTERS,

        query:
            typeof shaped.q === 'string'
                ? shaped.q.trim().slice(0, MAX_QUERY_LENGTH)
                : '',

        category: toEnumList(shaped.category, CATEGORY_VALUES),
        employmentTypes: toEnumList(shaped.employmentType, EMPLOYMENT_TYPE_VALUES),
        recruitmentMethods: toEnumList(shaped.recruitmentMethod, RECRUITMENT_METHOD_VALUES),
        workModes: toEnumList(shaped.workMode, WORK_MODE_VALUES),
        sectors: toEnumList(shaped.sector, SECTOR_VALUES),
        experienceLevels: toEnumList(shaped.experienceLevel, EXPERIENCE_LEVEL_VALUES),
        degrees: toEnumList(shaped.degree, DEGREE_VALUES),
        availabilities: toEnumList(shaped.availability, AVAILABILITY_VALUES),
        sourceKinds: toEnumList(shaped.sourceKind, SOURCE_KIND_VALUES),
        trustLevels: toEnumList(shaped.trustLevel, TRUST_LEVEL_VALUES),

        courses: toTextList(shaped.course, MAX_TAG_LENGTH),
        specializations: toTextList(shaped.specialization, MAX_TAG_LENGTH),
        skills: toTextList(shaped.skills, MAX_TAG_LENGTH),
        locations: toTextList(shaped.location, MAX_TAG_LENGTH),
        applicantLocations: toTextList(shaped.applicantLocation, MAX_TAG_LENGTH),
        tags: toTextList(shaped.tags, MAX_TAG_LENGTH),

        passoutYears: toList(shaped.passoutYear)
            .map((year) => toInt(year, { min: 1950, max: 2100 }))
            .filter((year): year is number => year !== undefined),

        experienceMin: toNumber(shaped.experienceMin),
        experienceMax: toNumber(shaped.experienceMax),
        salaryMin: toInt(shaped.salaryMin, { min: 0, max: MAX_SALARY }),
        salaryMax: toInt(shaped.salaryMax, { min: 0, max: MAX_SALARY }),
        passoutYearMin: toInt(shaped.passoutYearMin, { min: 1950, max: 2100 }),
        passoutYearMax: toInt(shaped.passoutYearMax, { min: 1950, max: 2100 }),

        postedWithinDays: toInt(shaped.postedWithinDays, { min: 1, max: 365 }),
        deadlineBefore: toDate(shaped.deadlineBefore, now),
        expiresAfter: toDate(shaped.expiresAfter, now),

        siteMode:
            typeof shaped.siteMode === 'string' &&
            shaped.siteMode.trim().toLowerCase() === 'govt'
                ? ('govt' as const)
                : ('private' as const),

        sort: toSortKey(shaped.sort),
        page,
        limit,
        offset: 0,
    };

    // Step 3: fold the legacy `?type=` param in. Explicit per-dimension params
    // win, so a URL carrying both is not silently overridden.
    if (legacy) {
        if (legacy.category && !filters.category.includes(legacy.category)) {
            filters.category.push(legacy.category);
        }
        if (legacy.employmentType && !filters.employmentTypes.includes(legacy.employmentType)) {
            filters.employmentTypes.push(legacy.employmentType);
        }
        if (
            legacy.recruitmentMethod &&
            !filters.recruitmentMethods.includes(legacy.recruitmentMethod)
        ) {
            filters.recruitmentMethods.push(legacy.recruitmentMethod);
        }
        if (legacy.sector && !filters.sectors.includes(legacy.sector)) {
            filters.sectors.push(legacy.sector);
        }
    }

    // An inverted range is a caller mistake, not a filter that should return
    // nothing, so normalize it instead of producing an always-false query.
    if (
        filters.salaryMin !== undefined &&
        filters.salaryMax !== undefined &&
        filters.salaryMin > filters.salaryMax
    ) {
        [filters.salaryMin, filters.salaryMax] = [filters.salaryMax, filters.salaryMin];
    }
    if (
        filters.experienceMin !== undefined &&
        filters.experienceMax !== undefined &&
        filters.experienceMin > filters.experienceMax
    ) {
        [filters.experienceMin, filters.experienceMax] = [
            filters.experienceMax,
            filters.experienceMin,
        ];
    }

    // `offset` is capped to bound the cost of deep pagination.
    const offset = (page - 1) * limit;
    filters.offset = offset > MAX_SEARCH_OFFSET ? MAX_SEARCH_OFFSET : offset;

    return filters;
}

// -- SQL construction --

/**
 * Case-insensitive membership test against one array column, as a subquery.
 *
 * `columnRef` is a literal column name supplied by this module only, never by a
 * caller, so this is the one place `Prisma.raw` is safe. All *values* go
 * through bound parameters.
 */
function arrayContainsAnyText(columnRef: string, values: string[]): Sql {
    return sql`EXISTS (
        SELECT 1 FROM unnest(${Prisma.raw(columnRef)}) AS elem
        WHERE lower(elem) = ANY(${values.map((v) => v.toLowerCase())})
    )`;
}

/**
 * Build the ORDER BY fragment for a sort key.
 *
 * Allowlisted: `sort` is a client string, so it selects among these literals
 * and is never interpolated into SQL. The relevance ordering keeps the exact
 * and prefix boosts, which are what make a branded query ("swiggy") outrank a
 * long job description that merely mentions it.
 */
export function buildOpportunityOrderSql(filters: OpportunityFilters): Sql {
    switch (filters.sort) {
        case 'newest':
            return sql`"postedAt" DESC`;
        case 'oldest':
            return sql`"postedAt" ASC`;
        case 'salary_high':
            return sql`"salaryMax" DESC NULLS LAST, "postedAt" DESC`;
        case 'salary_low':
            return sql`"salaryMin" ASC NULLS LAST, "postedAt" DESC`;
        case 'deadline':
            return sql`"expiresAt" ASC NULLS LAST, "postedAt" DESC`;
        case 'relevance':
        default:
            return sql`exact_title_match DESC, exact_company_match DESC,
                        title_prefix_match DESC, company_prefix_match DESC,
                        title_similarity DESC, company_similarity DESC,
                        title_phrase_match DESC, company_phrase_match DESC,
                        rank DESC, "postedAt" DESC`;
    }
}

/**
 * Build the WHERE fragments for a filter set.
 *
 * Within one dimension the values are OR'd (`employmentType=a&employmentType=b`
 * means either), but across dimensions they are AND'd. That is what users
 * expect from a faceted filter bar.
 */
export function buildOpportunityFilterSql(
    filters: OpportunityFilters,
    options: {
        statuses?: string[];
        includeDeleted?: boolean;
        includeExpired?: boolean;
        now?: Date;
    } = {}
): Sql[] {
    const now = options.now ?? new Date();
    const { statuses = ['PUBLISHED'], includeDeleted = false, includeExpired = false } = options;

    const conditions: Sql[] = [];

    // Baseline visibility. Not user-selectable on a public route.
    if (!includeDeleted) conditions.push(sql`"deletedAt" IS NULL`);
    if (statuses.length > 0) conditions.push(sql`"status"::text = ANY(${statuses})`);
    if (!includeExpired) {
        // A listing is live until explicitly expired, or until its expiry has
        // passed. Either way it is not visible.
        conditions.push(
            sql`("expiredAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > ${now}))`
        );
    }

    if (filters.category.length > 0) {
        conditions.push(sql`"category"::text = ANY(${filters.category})`);
    }
    if (filters.employmentTypes.length > 0) {
        conditions.push(
            sql`"employmentTypes" && ${filters.employmentTypes}::"EmploymentType"[]`
        );
    }
    if (filters.recruitmentMethods.length > 0) {
        // `recruitmentMethod` is nullable and REGULAR listings store null
        // rather than the literal enum, so match null as REGULAR.
        const explicit = filters.recruitmentMethods.filter((v) => v !== 'REGULAR');
        const clauses: Sql[] = [];
        if (explicit.length > 0) {
            clauses.push(sql`"recruitmentMethod"::text = ANY(${explicit})`);
        }
        if (filters.recruitmentMethods.includes('REGULAR')) {
            clauses.push(sql`"recruitmentMethod" IS NULL`);
        }
        if (clauses.length > 0) conditions.push(sql`(${join(clauses, ' OR ')})`);
    }
    if (filters.workModes.length > 0) {
        conditions.push(sql`"workMode"::text = ANY(${filters.workModes})`);
    }
    if (filters.sectors.length > 0) {
        conditions.push(sql`"sector"::text = ANY(${filters.sectors})`);
    }
    if (filters.experienceLevels.length > 0) {
        conditions.push(sql`"experienceLevel"::text = ANY(${filters.experienceLevels})`);
    }
    if (filters.sourceKinds.length > 0) {
        conditions.push(sql`"sourceKind"::text = ANY(${filters.sourceKinds})`);
    }
    if (filters.trustLevels.length > 0) {
        conditions.push(sql`"trustLevel"::text = ANY(${filters.trustLevels})`);
    }
    if (filters.degrees.length > 0) {
        conditions.push(sql`"allowedDegrees" && ${filters.degrees}::"EducationLevel"[]`);
    }
    if (filters.availabilities.length > 0) {
        conditions.push(
            sql`"allowedAvailability" && ${filters.availabilities}::"Availability"[]`
        );
    }
    if (filters.courses.length > 0) {
        conditions.push(arrayContainsAnyText('"allowedCourses"', filters.courses));
    }
    if (filters.specializations.length > 0) {
        conditions.push(
            arrayContainsAnyText('"allowedSpecializations"', filters.specializations)
        );
    }
    if (filters.skills.length > 0) {
        // A listing that declares no skills is not excluded: absence of a
        // restriction means "any candidate", matching checkEligibility.
        conditions.push(
            sql`("requiredSkills" = '{}'::text[] OR ${arrayContainsAnyText(
                '"requiredSkills"',
                filters.skills
            )})`
        );
    }
    if (filters.tags.length > 0) {
        // `tags` is a real String[] column (indexed with Gin), so this is a
        // case-insensitive array membership test. Older rows also carry tags
        // inside the JSON `attributes` bag, so match either source rather
        // than silently dropping legacy tag data.
        const lowered = filters.tags.map((v) => v.toLowerCase());
        conditions.push(
            sql`(${arrayContainsAnyText('"tags"', filters.tags)} OR EXISTS (
                SELECT 1 FROM jsonb_each(COALESCE("attributes", '{}'::jsonb)) kv
                WHERE lower(kv.key) = ANY(${lowered})
                   OR lower(COALESCE(kv.value #>> '{}', '')) = ANY(${lowered})
            ))`
        );
    }
    if (filters.passoutYears.length > 0) {
        conditions.push(sql`"allowedPassoutYears" && ${filters.passoutYears}::int[]`);
    }
    if (filters.passoutYearMin !== undefined || filters.passoutYearMax !== undefined) {
        // Overlap, not containment: a 2023-2027 listing matches a 2025
        // candidate even though 2023 is not in the candidate's own year list.
        conditions.push(
            sql`("passoutYearMax" IS NULL OR "passoutYearMax" >= ${filters.passoutYearMin ?? 1950})
                 AND ("passoutYearMin" IS NULL OR "passoutYearMin" <= ${filters.passoutYearMax ?? 2100})`
        );
    }
    if (filters.locations.length > 0) {
        // A listing with no location restriction is treated as open to all.
        conditions.push(
            sql`("locations" = '{}'::text[] OR ${arrayContainsAnyText(
                '"locations"',
                filters.locations
            )})`
        );
    }
    if (filters.applicantLocations.length > 0) {
        conditions.push(
            arrayContainsAnyText('"applicantLocationRequirements"', filters.applicantLocations)
        );
    }
    if (filters.experienceMin !== undefined) {
        conditions.push(
            sql`("experienceMax" IS NULL OR "experienceMax" >= ${filters.experienceMin})`
        );
    }
    if (filters.experienceMax !== undefined) {
        conditions.push(
            sql`("experienceMin" IS NULL OR "experienceMin" <= ${filters.experienceMax})`
        );
    }
    if (filters.salaryMin !== undefined) {
        // Undisclosed salary must not silently drop a listing from a
        // "pays at least X" search; the UI marks it undisclosed instead.
        conditions.push(sql`("salaryMax" IS NULL OR "salaryMax" >= ${filters.salaryMin})`);
    }
    if (filters.salaryMax !== undefined) {
        conditions.push(sql`("salaryMin" IS NULL OR "salaryMin" <= ${filters.salaryMax})`);
    }
    if (filters.postedWithinDays !== undefined) {
        const since = new Date(now.getTime() - filters.postedWithinDays * 86_400_000);
        conditions.push(sql`"postedAt" >= ${since}`);
    }
    if (filters.deadlineBefore !== undefined) {
        // A listing can close on any of three axes: the event/competition
        // registration deadline, the employment application deadline, or the
        // generic expiry. Match when ANY of them falls before the cutoff so a
        // `deadlineBefore` search never misses a kind it was not written for.
        conditions.push(
            sql`(("registrationDeadline" IS NOT NULL AND "registrationDeadline" <= ${filters.deadlineBefore})
                 OR ("applicationDeadline" IS NOT NULL AND "applicationDeadline" <= ${filters.deadlineBefore})
                 OR ("expiresAt" IS NOT NULL AND "expiresAt" <= ${filters.deadlineBefore}))`
        );
    }
    if (filters.expiresAfter !== undefined) {
        conditions.push(
            sql`("expiresAt" IS NOT NULL AND "expiresAt" >= ${filters.expiresAfter})`
        );
    }

    // Site mode partitions the two frontends: govt is "has government details",
    // private is "does not".
    conditions.push(
        filters.siteMode === 'govt'
            ? sql`EXISTS (SELECT 1 FROM "GovernmentJobDetails" g WHERE g."opportunityId" = "Opportunity"."id")`
            : sql`NOT EXISTS (SELECT 1 FROM "GovernmentJobDetails" g WHERE g."opportunityId" = "Opportunity"."id")`
    );

    return conditions;
}

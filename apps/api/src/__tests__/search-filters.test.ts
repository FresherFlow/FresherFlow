import { describe, it, expect, vi } from 'vitest';

// The filter module is pure: it imports only the Prisma tagged-template
// helpers plus schema enums, so the database module is mocked rather than
// connected. `dbEnums` is generated from schema.prisma, so a schema enum
// change cannot silently break this suite's collection.
vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    const { Prisma } = await import('@prisma/client');
    return { ...enums, Prisma, prisma: {}, default: {} };
});

import {
    parseOpportunityFilters,
    buildOpportunityFilterSql,
    buildOpportunityOrderSql,
    resolveLegacyTypeFilter,
    MAX_SEARCH_LIMIT,
    MAX_SEARCH_OFFSET,
    MAX_LIST_VALUES,
} from '../application/opportunity/filters';
import { Prisma } from '@fresherflow/database';

const NOW = new Date('2026-01-15T00:00:00.000Z');

/** Render Sql fragments to text so assertions can check emitted SQL. */
function renderSql(fragments: Prisma.Sql[]): string {
    return fragments.map((f) => f.text).join(' AND ');
}

describe('parseOpportunityFilters - legacy type param', () => {
    it('expands job to a category', () => {
        expect(parseOpportunityFilters({ type: 'job' }, NOW).category).toEqual(['EMPLOYMENT']);
    });

    it('expands internship to BOTH category and employment type', () => {
        // This is the point of the v2 taxonomy split: an internship is
        // simultaneously an employment listing and an internship.
        const f = parseOpportunityFilters({ type: 'internship' }, NOW);
        expect(f.category).toEqual(['EMPLOYMENT']);
        expect(f.employmentTypes).toEqual(['INTERNSHIP']);
    });

    it('expands walk-in to a recruitment method, not a category', () => {
        const f = parseOpportunityFilters({ type: 'walk-in' }, NOW);
        expect(f.recruitmentMethods).toEqual(['WALK_IN']);
        expect(f.category).toEqual([]);
    });

    it('expands government to a sector', () => {
        expect(parseOpportunityFilters({ type: 'government' }, NOW).sectors).toEqual([
            'GOVERNMENT',
        ]);
    });

    it('accepts aliases and mixed case', () => {
        expect(resolveLegacyTypeFilter('WALKIN')).toEqual({ recruitmentMethod: 'WALK_IN' });
        expect(resolveLegacyTypeFilter('  Jobs ')).toEqual({ category: 'EMPLOYMENT' });
    });

    it('ignores an unknown legacy value rather than filtering everything out', () => {
        const f = parseOpportunityFilters({ type: 'not-a-thing' }, NOW);
        expect(f.category).toEqual([]);
        expect(f.employmentTypes).toEqual([]);
    });

    it('does not let the legacy param override an explicit dimension', () => {
        const f = parseOpportunityFilters({ type: 'job', category: 'SCHOLARSHIP' }, NOW);
        expect(f.category).toEqual(['SCHOLARSHIP', 'EMPLOYMENT']);
    });
});

describe('parseOpportunityFilters - enum validation', () => {
    it('normalizes separators and case', () => {
        const f = parseOpportunityFilters({ employmentType: 'full-time' }, NOW);
        expect(f.employmentTypes).toEqual(['FULL_TIME']);
    });

    it('drops values that are not in the enum', () => {
        expect(parseOpportunityFilters({ workMode: 'REMOTE,TELEPORT' }, NOW).workModes).toEqual([
            'REMOTE',
        ]);
    });

    it('accepts repeated params as well as comma lists', () => {
        const f = parseOpportunityFilters({ workMode: ['REMOTE', 'HYBRID'] }, NOW);
        expect(f.workModes).toEqual(['REMOTE', 'HYBRID']);
    });

    it('de-duplicates', () => {
        const f = parseOpportunityFilters({ workMode: 'REMOTE,REMOTE,remote' }, NOW);
        expect(f.workModes).toEqual(['REMOTE']);
    });

    it('caps the number of values', () => {
        const many = Array.from({ length: 100 }, (_, i) => `value${i}`).join(',');
        const f = parseOpportunityFilters({ skills: many }, NOW);
        expect(f.skills.length).toBeLessThanOrEqual(MAX_LIST_VALUES);
    });
});

describe('parseOpportunityFilters - ranges and dates', () => {
    it('normalizes an inverted salary range', () => {
        const f = parseOpportunityFilters({ salaryMin: '900000', salaryMax: '100000' }, NOW);
        expect(f.salaryMin).toBe(100000);
        expect(f.salaryMax).toBe(900000);
    });

    it('normalizes an inverted experience range', () => {
        const f = parseOpportunityFilters({ experienceMin: '5', experienceMax: '1' }, NOW);
        expect(f.experienceMin).toBe(1);
        expect(f.experienceMax).toBe(5);
    });

    it('parses an ISO deadline', () => {
        const f = parseOpportunityFilters({ deadlineBefore: '2026-02-01T00:00:00.000Z' }, NOW);
        expect(f.deadlineBefore?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    });

    it('parses a relative deadline', () => {
        const f = parseOpportunityFilters({ expiresAfter: '+7d' }, NOW);
        expect(f.expiresAfter?.toISOString()).toBe('2026-01-22T00:00:00.000Z');
    });

    it('computes offset from page and limit', () => {
        expect(parseOpportunityFilters({ page: '3', limit: '10' }, NOW).offset).toBe(20);
    });
});

describe('parseOpportunityFilters - sort aliases', () => {
    const cases: Array<[string, string]> = [
        ['', 'relevance'],
        ['best', 'relevance'],
        ['newest', 'newest'],
        ['latest', 'newest'],
        ['salary', 'salary_high'],
        ['salary_asc', 'salary_low'],
        ['closing_soon', 'deadline'],
        ['nonsense', 'relevance'],
    ];

    for (const [input, expected] of cases) {
        it(`maps "${input || 'empty'}" to ${expected}`, () => {
            expect(parseOpportunityFilters({ sort: input }, NOW).sort).toBe(expected);
        });
    }
});

describe('parseOpportunityFilters - hostile input', () => {
    const hostile: Array<[string, Record<string, unknown>]> = [
        ['SQL injection via sort', { sort: 'relevance; DROP TABLE "Opportunity"; --' }],
        ['SQL injection via q', { q: "'; DELETE FROM \"Opportunity\"; --" }],
        ['SQL injection via skills', { skills: "'); DROP TABLE x; --" }],
        ['LIKE wildcard in skills', { skills: '%%' }],
        ['non-numeric page', { page: 'abc' }],
        ['negative page', { page: '-5' }],
        ['huge page', { page: '999999999999' }],
        ['huge limit', { limit: '100000' }],
        ['zero limit', { limit: '0' }],
        ['NaN salary', { salaryMin: 'NaN' }],
        ['Infinity salary', { salaryMax: 'Infinity' }],
        ['negative salary', { salaryMin: '-5' }],
        ['array where scalar expected', { page: ['1', '2'] }],
        ['object value', { limit: { toString: () => '10' } }],
        ['null value', { q: null }],
        ['undefined value', { q: undefined }],
        ['1MB string', { skills: 'a'.repeat(1_000_000) }],
        ['invalid date', { deadlineBefore: 'not-a-date' }],
        ['array date', { deadlineBefore: ['2026-01-01'] }],
        ['passout year out of range', { passoutYear: '9999' }],
    ];

    for (const [label, query] of hostile) {
        it(`does not throw on ${label}`, () => {
            expect(() => parseOpportunityFilters(query, NOW)).not.toThrow();
        });
    }

    it('never lets a bad sort escape the allowlist', () => {
        const f = parseOpportunityFilters({ sort: 'relevance; DROP TABLE x' }, NOW);
        expect(f.sort).toBe('relevance');
    });

    it('falls back to defaults and caps offset for out-of-range paging', () => {
        // An out-of-range value is treated as absent rather than clamped, so a
        // hostile `limit=9999` gets the safe default instead of the maximum.
        const f = parseOpportunityFilters({ page: '99999', limit: '9999' }, NOW);
        expect(f.limit).toBe(20);
        expect(f.page).toBe(1);
        expect(f.offset).toBe(0);
    });

    it('caps limit at the maximum for a merely large but in-range value', () => {
        const f = parseOpportunityFilters({ limit: '40' }, NOW);
        expect(f.limit).toBe(40);
        expect(f.limit).toBeLessThanOrEqual(MAX_SEARCH_LIMIT);
    });

    it('never exceeds the deep-pagination offset cap', () => {
        const f = parseOpportunityFilters({ page: '100', limit: '50' }, NOW);
        expect(f.offset).toBeLessThanOrEqual(MAX_SEARCH_OFFSET);
    });

    it('never produces a NaN date', () => {
        const f = parseOpportunityFilters({ deadlineBefore: 'garbage', expiresAfter: '???' }, NOW);
        expect(f.deadlineBefore).toBeUndefined();
        expect(f.expiresAfter).toBeUndefined();
    });

    it('strips LIKE wildcards from free text filters', () => {
        const f = parseOpportunityFilters({ skills: 're%act_x\\' }, NOW);
        expect(f.skills).toEqual(['reactx']);
    });
});

describe('buildOpportunityFilterSql', () => {
    const build = (query: Record<string, unknown>, options: Record<string, unknown> = {}) =>
        renderSql(
            buildOpportunityFilterSql(parseOpportunityFilters(query, NOW), { now: NOW, ...options })
        );

    it('always excludes soft-deleted and unpublished rows by default', () => {
        const sqlText = build({});
        expect(sqlText).toContain('"deletedAt" IS NULL');
        expect(sqlText).toContain('"status"::text = ANY(');
        expect(sqlText).toContain('"expiredAt" IS NULL');
    });

    it('excludes rows whose expiry has passed', () => {
        expect(build({})).toContain('"expiresAt" > ');
    });

    it('includes deleted rows only when explicitly asked', () => {
        expect(build({}, { includeDeleted: true })).not.toContain('"deletedAt" IS NULL');
    });

    it('emits a category predicate when category is set', () => {
        expect(build({ category: 'SCHOLARSHIP' })).toContain('"category"::text = ANY(');
    });

    it('treats a null recruitmentMethod as REGULAR', () => {
        // REGULAR listings store NULL rather than the literal enum, so a
        // filter that did not special-case null would return zero rows.
        expect(build({ recruitmentMethod: 'REGULAR' })).toContain('"recruitmentMethod" IS NULL');
    });

    it('treats an empty skills list as unrestricted', () => {
        expect(build({ skills: 'react' })).toContain('"requiredSkills" = ');
    });

    it('treats an empty location list as unrestricted', () => {
        expect(build({ location: 'Bengaluru' })).toContain('"locations" = ');
    });

    it('keeps undisclosed salary in a minimum-salary search', () => {
        expect(build({ salaryMin: '500000' })).toContain('"salaryMax" IS NULL OR "salaryMax" >=');
    });

    it('uses passout-year overlap, not containment', () => {
        expect(build({ passoutYearMin: '2025' })).toContain('"passoutYearMax"');
    });

    it('adds no predicate beyond the baseline ones for an empty filter set', () => {
        // Five, not four: the fifth hides walk-ins whose last date has passed.
        // Previously a drive stayed in every list until an admin expired it by
        // hand, so a fresher saw a month-old walk-in as if it were upcoming.
        const filters = parseOpportunityFilters({}, NOW);
        expect(buildOpportunityFilterSql(filters, { now: NOW }).length).toBe(5);
    });

    it('hides a walk-in whose dates have all passed, but keeps non-drives', () => {
        // `nextDriveAt` is null in two cases: no DriveDetails at all, and a
        // drive whose last date passed. Only the first may pass, so the clause
        // checks the DriveDetails table rather than accepting a bare null.
        const sql = build({});
        expect(sql).toContain('"nextDriveAt" >=');
        expect(sql).toContain('"DriveDetails"');
    });

    it('partitions govt and private site modes', () => {
        const govt = build({ siteMode: 'govt' });
        expect(govt).toContain('GovernmentJobDetails');
        expect(govt).not.toContain('NOT EXISTS');
        expect(build({})).toContain('NOT EXISTS');
    });

    it('filters drives by the denormalised city column', () => {
        expect(build({ driveCity: 'Pune' })).toContain('"driveCity"');
    });

    it('resolves driveWithinDays into an absolute date window', () => {
        const f = parseOpportunityFilters({ driveWithinDays: '7' }, NOW);
        expect(f.driveFrom?.toISOString()).toBe(NOW.toISOString());
        expect(f.driveTo?.toISOString()).toBe('2026-01-22T00:00:00.000Z');
    });

    it('lets an explicit driveFrom win over driveWithinDays', () => {
        const f = parseOpportunityFilters(
            { driveWithinDays: '7', driveFrom: '2026-03-01' },
            NOW
        );
        expect(f.driveFrom?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('bounds a radius search on latitude and longitude', () => {
        const sql = build({ driveLat: '17.44', driveLng: '78.37', driveRadiusKm: '10' });
        expect(sql).toContain('BETWEEN');
        // A bounding box alone would include the corners, so the exact
        // great-circle check has to be present too.
        expect(sql).toContain('ASIN');
    });

    it('drops a half-specified radius search', () => {
        // lat without lng must not search from 0,0.
        const f = parseOpportunityFilters({ driveLat: '17.44', driveRadiusKm: '10' }, NOW);
        expect(f.driveLat).toBeUndefined();
        expect(f.driveRadiusKm).toBeUndefined();
    });

    it('caps the drive radius at 500 km', () => {
        expect(parseOpportunityFilters({ driveLat: '17.4', driveLng: '78.4', driveRadiusKm: '9000' }, NOW).driveRadiusKm)
            .toBeUndefined();
    });

    it('rejects a 0,0 origin as a missing coordinate', () => {
        const f = parseOpportunityFilters({ driveLat: '0', driveLng: '0', driveRadiusKm: '10' }, NOW);
        expect(f.driveLat).toBeUndefined();
    });

    it('emits no raw SQL from drive filter values', () => {
        const sqlText = build({
            driveCity: "'; DROP TABLE \"Opportunity\"; --",
            driveLat: '17.44; DELETE FROM x',
        });
        expect(sqlText).not.toContain('DROP TABLE');
        expect(sqlText).not.toContain('DELETE FROM');
    });

    it('emits only bound parameters for a hostile filter set', () => {
        // Every user value must reach the DB as a placeholder, never as SQL
        // text. The only `Prisma.raw` in the module is a hardcoded column name.
        const sqlText = build({
            q: "'; DROP TABLE \"Opportunity\"; --",
            skills: "'); DELETE FROM x; --",
            course: 'a" OR "1"="1',
            location: "x' UNION SELECT 1",
        });
        expect(sqlText).not.toContain('DROP TABLE');
        expect(sqlText).not.toContain('DELETE FROM');
        expect(sqlText).not.toContain('UNION SELECT');
    });
});

describe('buildOpportunityOrderSql', () => {
    const cases: Array<[string, string]> = [
        ['relevance', 'exact_title_match'],
        ['newest', '"postedAt" DESC'],
        ['oldest', '"postedAt" ASC'],
        ['salary_high', '"salaryMax"'],
        ['salary_low', '"salaryMin"'],
        ['deadline', '"expiresAt"'],
    ];

    for (const [sort, expected] of cases) {
        it(`sort=${sort} emits the expected clause`, () => {
            const filters = parseOpportunityFilters({ sort }, NOW);
            expect(buildOpportunityOrderSql(filters).text).toContain(expected);
        });
    }
});

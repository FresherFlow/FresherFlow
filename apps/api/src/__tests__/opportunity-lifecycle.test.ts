import { describe, it, expect, vi } from 'vitest';

// Pure-path suite for Phase 5 (opportunity core) + Phase 6 (search).
// Covers the seven required lifecycle paths without touching the database:
// every module below is either pure or mocked at the DB boundary.
vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    const { Prisma } = await import('@prisma/client');
    return { ...enums, Prisma, prisma: {}, default: {} };
});

vi.mock('../infrastructure/services/alerts/notification.service', () => ({
    sendNewJobAlerts: async () => ({ usersSent: 0, emailsSent: 0, appAlertsSent: 0, pushSent: 0 }),
}));

import {
    parseOpportunityFilters,
    buildOpportunityFilterSql,
    resolveLegacyTypeFilter,
} from '../application/opportunity/filters';
import {
    validateOpportunityInput,
    buildDuplicateWhere,
} from '../application/opportunity/validate';
import {
    resolveOpportunityDimensions,
    normalizeTypeParam as normalizeAdminTypeParam,
    parseInstitutionIds,
    parseSourceKind,
    parseOrganizationId,
    buildCompensationCreates,
    buildEventDetailsCreate,
} from '../routes/admin/opportunities/_helpers';
import {
    normalizeTypeParam as normalizePublicTypeParam,
    parseOpportunityTypeFilter,
} from '../routes/public/opportunities/_helpers';
import { normaliseEmploymentTypes } from '../infrastructure/services/community/community.service';
import { buildOpportunityUpdateData } from '../infrastructure/services/opportunity/opportunity.service';
import { normalizeOpportunityLinks } from '../utils/opportunityLinks';
import { generateSlug, resolveUniqueSlug } from '@fresherflow/utils';
import { Prisma } from '@fresherflow/database';

const NOW = new Date('2026-01-15T00:00:00.000Z');

function renderSql(fragments: Prisma.Sql[]): string {
    return fragments.map((f) => f.text).join(' AND ');
}

const ORG_ID = '123e4567-e89b-12d3-a456-426614174000';
const COLLEGE_ID = '123e4567-e89b-12d3-a456-426614174001';

describe('path 1: scraped employment listing', () => {
    it('resolves admin form to EMPLOYMENT/REGULAR with no org', () => {
        const resolved = resolveOpportunityDimensions({ category: 'job' });
        expect(resolved.category).toBe('EMPLOYMENT');
        expect(resolved.recruitmentMethod).toBe('REGULAR');
        expect(resolved.isGovt).toBe(false);
    });

    it('validates with an applyLink and no kind details', () => {
        expect(
            validateOpportunityInput({
                title: 'Software Engineer',
                company: 'Acme',
                applyLink: 'https://acme.example/jobs/1',
                category: 'EMPLOYMENT',
            })
        ).toEqual([]);
    });

    it('search filter emits category + employment predicates', () => {
        const sqlText = renderSql(
            buildOpportunityFilterSql(parseOpportunityFilters({ category: 'EMPLOYMENT' }, NOW), { now: NOW })
        );
        expect(sqlText).toContain('"category"::text = ANY(');
        expect(sqlText).toContain('NOT EXISTS');
    });
});

describe('path 2: user-submitted listing', () => {
    it('parses USER_SUBMITTED source kind', () => {
        expect(parseSourceKind('user_submitted')).toBe('USER_SUBMITTED');
        expect(parseSourceKind('bogus')).toBeUndefined();
    });

    it('normalises a messy employmentTypes string', () => {
        expect(normaliseEmploymentTypes('Full Time, Internship, bogus')).toEqual([
            'FULL_TIME',
            'INTERNSHIP',
        ]);
    });

    it('duplicate protection matches across swapped link columns', () => {
        const filters = buildDuplicateWhere({
            applyLink: 'https://acme.example/jobs/1',
            sourceLink: 'https://source.example/list/9',
        });
        expect(filters.length).toBe(4);
    });

    it('flags a submission with no contact surface', () => {
        const errors = validateOpportunityInput({ title: 'X', company: 'Y' });
        expect(errors.some((e) => e.field === 'applyLink')).toBe(true);
    });
});

describe('path 3: org-owned listing', () => {
    it('accepts a UUID organizationId and rejects junk', () => {
        expect(parseOrganizationId(ORG_ID)).toBe(ORG_ID);
        expect(parseOrganizationId('not-a-uuid')).toBeUndefined();
    });

    it('update allowlist permits organizationId but never counters or deletedAt', () => {
        const update = buildOpportunityUpdateData(
            { organizationId: ORG_ID, savesCount: 999, deletedAt: new Date(), title: 'T' } as Record<string, unknown>,
            { id: 'id-1', title: 'Old', company: 'Acme' }
        ) as Record<string, unknown>;
        expect(update.organizationId).toBe(ORG_ID);
        expect(update).not.toHaveProperty('savesCount');
        expect(update).not.toHaveProperty('deletedAt');
    });
});

describe('path 4: college drive (institution targeting)', () => {
    it('resolves walk-in form to WALK_IN recruitment method', () => {
        const resolved = resolveOpportunityDimensions({ category: 'walk-in' });
        expect(resolved.recruitmentMethod).toBe('WALK_IN');
        expect(resolved.isWalkIn).toBe(true);
    });

    it('parses institution UUID lists and drops junk', () => {
        expect(parseInstitutionIds([COLLEGE_ID, 'junk'])).toEqual([COLLEGE_ID]);
        expect(parseInstitutionIds('')).toEqual([]);
    });

    it('requires driveDetails for walk-in listings', () => {
        const errors = validateOpportunityInput({
            title: 'Campus drive',
            company: 'Acme',
            recruitmentMethod: 'WALK_IN',
            applyLink: 'https://acme.example/drive',
        });
        expect(errors.some((e) => e.field === 'driveDetails')).toBe(true);
    });

    it('search filter treats null recruitmentMethod as REGULAR', () => {
        const sqlText = renderSql(
            buildOpportunityFilterSql(
                parseOpportunityFilters({ recruitmentMethod: 'WALK_IN' }, NOW),
                { now: NOW }
            )
        );
        expect(sqlText).toContain('"recruitmentMethod"::text = ANY(');
    });
});

describe('path 5: competition', () => {
    it('legacy type expands to COMPETITION category', () => {
        expect(resolveLegacyTypeFilter('competition')).toEqual({ category: 'COMPETITION' });
    });

    it('admin + public type params agree on competitions', () => {
        expect(normalizeAdminTypeParam('competition')).toEqual({ category: 'COMPETITION' });
        expect(parseOpportunityTypeFilter('competition')).toBeUndefined();
        expect(normalizePublicTypeParam('competition')).toBe('COMPETITION');
    });

    it('builds event details for team competitions', () => {
        const built = buildEventDetailsCreate({
            prizeAmount: 100000,
            teamSizeMin: 2,
            teamSizeMax: 4,
            tracks: ['AI', 'Web'],
        });
        expect(built?.create.teamSizeMax).toBe(4);
        expect(built?.create.isTeamEvent).toBe(true);
    });

    it('requires a deadline or start date for competitions', () => {
        const errors = validateOpportunityInput({
            title: 'Hackathon',
            company: 'Acme',
            category: 'COMPETITION',
            applyLink: 'https://acme.example/hack',
        });
        expect(errors.some((e) => e.field === 'registrationDeadline')).toBe(true);
    });
});

describe('path 6: scholarship', () => {
    it('legacy type expands to SCHOLARSHIP category', () => {
        const f = parseOpportunityFilters({ type: 'scholarship' }, NOW);
        expect(f.category).toEqual(['SCHOLARSHIP']);
    });

    it('internship legacy value still lands on BOTH dimensions', () => {
        const f = parseOpportunityFilters({ type: 'internship' }, NOW);
        expect(f.category).toEqual(['EMPLOYMENT']);
        expect(f.employmentTypes).toEqual(['INTERNSHIP']);
    });
});

describe('path 7: government opportunity', () => {
    it('legacy type expands to GOVERNMENT sector', () => {
        expect(resolveLegacyTypeFilter('government')).toEqual({ sector: 'GOVERNMENT' });
    });

    it('requires governmentJobDetails for govt sector', () => {
        const errors = validateOpportunityInput({
            title: 'SSC CGL',
            company: 'SSC',
            sector: 'GOVERNMENT',
            applyLink: 'https://ssc.example/apply',
        });
        expect(errors.some((e) => e.field === 'governmentJobDetails')).toBe(true);
    });

    it('govt slug has no random suffix; collisions resolve with -2/-3', () => {
        const base = generateSlug('SSC CGL 2026', 'SSC', undefined, { isGovt: true });
        expect(base).not.toMatch(/-[a-f0-9]{8}$/);
        expect(resolveUniqueSlug(base, new Set([base]))).toBe(`${base}-2`);
    });

    it('siteMode=govt partitions on GovernmentJobDetails existence', () => {
        const sqlText = renderSql(
            buildOpportunityFilterSql(parseOpportunityFilters({ siteMode: 'govt' }, NOW), { now: NOW })
        );
        expect(sqlText).toContain('GovernmentJobDetails');
        expect(sqlText).not.toContain('NOT EXISTS');
    });
});

describe('search vs SavedSearch vs Room separation', () => {
    it('public filters carry no saved-search or room keys', () => {
        const filters = parseOpportunityFilters({ q: 'engineer', location: 'Bengaluru' }, NOW);
        expect(filters).not.toHaveProperty('savedSearchId');
        expect(filters).not.toHaveProperty('roomId');
        expect(filters).not.toHaveProperty('userId');
    });

    it('compensation rows validate type allowlist and drop junk', () => {
        const creates = buildCompensationCreates([
            { type: 'SALARY', minAmount: 600000, maxAmount: 800000, period: 'YEARLY' },
            { type: 'BOGUS', minAmount: 1 },
        ]);
        expect(creates?.length).toBe(1);
        expect(creates?.[0].type).toBe('SALARY');
    });

    it('link normalization keeps a single canonical URL pair', () => {
        const links = normalizeOpportunityLinks('https://source.example/a', 'https://apply.example/b');
        expect(links.sourceLink).toContain('source.example');
        expect(links.applyLink).toContain('apply.example');
    });
});

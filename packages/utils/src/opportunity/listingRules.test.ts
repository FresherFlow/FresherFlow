import { describe, expect, it } from 'vitest';
import { validateListingContent, describeListingIssues } from './listingRules.js';

const VALID = {
    title: 'Software Engineer',
    company: 'Acme Corp',
    description:
        'Build and maintain the Acme platform used by fresher teams. You will ship features across '
        + 'the React frontend and Node.js services, review code, write tests and work with design '
        + 'to turn requirements into working software.',
    locations: ['Bengaluru'],
    salaryRange: '6-8 LPA',
    requiredSkills: ['React', 'Node.js'],
    employmentTypes: 'FULL_TIME',
    companyWebsite: 'https://acme.test',
};

const WALKIN = {
    ...VALID,
    recruitmentMethod: 'WALK_IN',
    status: 'PUBLISHED',
    driveDetails: { dates: ['2026-12-10'], venueAddress: 'HITEC City, Hyderabad' },
};

describe('published walk-in completeness', () => {
    it('rejects a published walk-in without a date', () => {
        const issues = validateListingContent({
            ...WALKIN,
            driveDetails: { venueAddress: 'HITEC City, Hyderabad' },
        });
        expect(issues.some((issue) => issue.field === 'driveDetails.dates')).toBe(true);
    });

    it('rejects a bare city as the venue', () => {
        const issues = validateListingContent({
            ...WALKIN,
            driveDetails: { dates: ['2026-12-10'], venueAddress: 'Hyderabad' },
        });
        expect(issues.some((issue) => issue.field === 'driveDetails.venueAddress')).toBe(true);
    });

    it('rejects the venue placeholder', () => {
        const issues = validateListingContent({
            ...WALKIN,
            driveDetails: { dates: ['2026-12-10'], venueAddress: 'Venue shared after apply' },
        });
        expect(issues.some((issue) => issue.field === 'driveDetails.venueAddress')).toBe(true);
    });

    it('allows an incomplete draft walk-in', () => {
        const issues = validateListingContent({ ...WALKIN, status: 'DRAFT', driveDetails: undefined });
        expect(issues.some((issue) => issue.field.startsWith('driveDetails'))).toBe(false);
    });
});

describe('validateListingContent', () => {
    it('accepts a complete listing', () => {
        expect(validateListingContent(VALID)).toEqual([]);
    });

    it('rejects a placeholder title or company', () => {
        expect(validateListingContent({ ...VALID, title: 'Job' })[0].field).toBe('title');
        expect(validateListingContent({ ...VALID, title: 'N/A' })[0].field).toBe('title');
        expect(validateListingContent({ ...VALID, company: 'Confidential' })[0].field).toBe('company');
        expect(validateListingContent({ ...VALID, company: 'One of our clients' })[0].field).toBe('company');
    });

    it('rejects test fixtures on every path, not only MCP submit', () => {
        expect(validateListingContent({ ...VALID, title: 'Test-MCP Role' })[0].field).toBe('title');
        expect(validateListingContent({ ...VALID, company: 'TestCo' })[0].field).toBe('company');
    });

    it('rejects a salary phrase and a salary without a figure', () => {
        expect(validateListingContent({ ...VALID, salaryRange: 'Competitive' })[0].field).toBe('salaryRange');
        expect(validateListingContent({ ...VALID, salaryRange: 'Best in industry' })[0].field).toBe('salaryRange');
        expect(validateListingContent({ ...VALID, stipend: 'As per standards' })[0].field).toBe('stipend');
        // Empty is correct when the posting states no figure.
        expect(validateListingContent({ ...VALID, salaryRange: '' })).toEqual([]);
    });

    it('rejects a one-line description stub', () => {
        const issues = validateListingContent({ ...VALID, description: 'See the link.' });
        expect(issues.some((issue) => issue.field === 'description')).toBe(true);
    });

    it('rejects notes longer than 25% of the description', () => {
        const issues = validateListingContent({
            ...VALID,
            notesHighlights: 'A'.repeat(VALID.description.length),
        });
        expect(issues.some((issue) => issue.field === 'notesHighlights')).toBe(true);
    });

    it('rejects duplicate skills, case-insensitively', () => {
        const issues = validateListingContent({ ...VALID, requiredSkills: ['React', 'react'] });
        expect(issues).toEqual([
            expect.objectContaining({ field: 'requiredSkills' }),
        ]);
    });

    it('rejects a work mode stored as a city', () => {
        expect(validateListingContent({ ...VALID, locations: ['Remote'] })[0].field).toBe('locations');
        expect(validateListingContent({ ...VALID, locations: ['Bengaluru', ''] })).toEqual([]);
    });

    it('rejects an unknown employment type instead of silently dropping it', () => {
        expect(validateListingContent({ ...VALID, employmentTypes: 'PERMANENT' })[0].field).toBe('employmentTypes');
        expect(validateListingContent({ ...VALID, employmentTypes: 'Full Time' })).toEqual([]);
        expect(validateListingContent({ ...VALID, employmentTypes: ['internship', 'FULL_TIME'] })).toEqual([]);
    });

    it('rejects inverted ranges, invalid dates and a non-https website', () => {
        expect(validateListingContent({ ...VALID, salaryMin: 10, salaryMax: 5 })[0].field).toBe('salaryMin');
        expect(validateListingContent({ ...VALID, experienceMin: 5, experienceMax: 2 })[0].field).toBe('experienceMin');
        expect(validateListingContent({ ...VALID, dates: ['next Monday'] })[0].field).toBe('dates');
        expect(validateListingContent({ ...VALID, expiresAt: 'not-a-date' })[0].field).toBe('expiresAt');
        expect(validateListingContent({ ...VALID, expiresAt: '2020-01-01' })[0].field).toBe('expiresAt');
        expect(validateListingContent({ ...VALID, companyWebsite: 'http://acme.test' })[0].field).toBe('companyWebsite');
    });

    it('formats every issue into one agent-readable line', () => {
        const issues = validateListingContent({ ...VALID, salaryRange: 'Competitive', requiredSkills: ['x', 'x'] });
        expect(describeListingIssues(issues)).toContain('salaryRange:');
        expect(describeListingIssues(issues)).toContain('requiredSkills:');
        expect(describeListingIssues(issues)).toContain('; ');
    });
});

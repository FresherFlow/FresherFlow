import { describe, expect, it } from 'vitest';
import { normalizeOpportunityLinks } from './opportunityLinks';

describe('normalizeOpportunityLinks', () => {
    it('preserves separate source and apply links when both exist', () => {
        expect(
            normalizeOpportunityLinks(' https://company.com/job ', ' https://company.com/apply ')
        ).toEqual({
            sourceLink: 'https://company.com/job',
            applyLink: 'https://company.com/apply',
        });
    });

    it('promotes source link into apply link when only source exists', () => {
        expect(
            normalizeOpportunityLinks('https://company.com/job', undefined)
        ).toEqual({
            sourceLink: 'https://company.com/job',
            applyLink: 'https://company.com/job',
        });
    });

    it('keeps opaque apply links without inventing source links', () => {
        expect(
            normalizeOpportunityLinks(undefined, 'https://boards.greenhouse.io/apply')
        ).toEqual({
            sourceLink: undefined,
            applyLink: 'https://boards.greenhouse.io/apply',
        });
    });
});

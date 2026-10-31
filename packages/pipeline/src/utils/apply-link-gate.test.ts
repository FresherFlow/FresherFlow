import { describe, it, expect } from 'vitest';
import { isGenericLandingLink } from './socialPoster.js';
import { boardRejectReason } from './board-issues.js';

const validJob = {
    title: 'Junior Software Engineer',
    company: 'Acme',
    applyLink: 'https://example.com/jobs/12345',
    locations: ['Bengaluru, Karnataka'],
};

describe('isGenericLandingLink', () => {
    it('blocks a careers hub with no posting in it', () => {
        expect(isGenericLandingLink('https://nango.dev/careers')).toBe(true);
    });

    it('blocks ATS board roots', () => {
        expect(isGenericLandingLink('https://boards.greenhouse.io/acme')).toBe(true);
        expect(isGenericLandingLink('https://jobs.lever.co/acme')).toBe(true);
        expect(isGenericLandingLink('https://acme.wd5.myworkdayjobs.com/en-US/External')).toBe(true);
    });

    it('allows a real posting', () => {
        expect(isGenericLandingLink('https://example.com/jobs/12345')).toBe(false);
        expect(isGenericLandingLink('https://boards.greenhouse.io/acme/jobs/4567890')).toBe(false);
    });
});

describe('boardRejectReason', () => {
    it('rejects a landing-page apply link', () => {
        const reason = boardRejectReason({ ...validJob, applyLink: 'https://nango.dev/careers' });
        expect(reason).toBe('applyLink is a landing page, not a specific posting');
    });

    it('accepts a specific posting', () => {
        expect(boardRejectReason(validJob)).toBeNull();
    });
});

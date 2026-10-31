import { describe, it, expect } from 'vitest';
import { isAtsHost, isSpecificJobUrl, parseJobUrl } from '../index.js';

/**
 * A link is only postable when it addresses one posting. These cases are the
 * ones that reached production: a bare careers hub and ATS board roots.
 */
describe('isSpecificJobUrl', () => {
    describe('rejects landing pages', () => {
        it.each([
            ['careers hub', 'https://nango.dev/careers'],
            ['careers hub with trailing slash', 'https://nango.dev/careers/'],
            ['site root', 'https://nango.dev/'],
            ['site root with no path', 'https://nango.dev'],
            ['openings hub', 'https://example.com/careers/openings'],
            ['locale-prefixed hub', 'https://example.com/en/careers'],
            ['jobs hub', 'https://example.com/jobs'],
            ['job search page', 'https://example.com/jobs/search?q=engineer'],
            ['greenhouse board root', 'https://boards.greenhouse.io/acme'],
            ['greenhouse hyphenated board root', 'https://boards.greenhouse.io/acme-corp'],
            ['lever board root', 'https://jobs.lever.co/acme'],
            ['ashby board root', 'https://jobs.ashbyhq.com/acme'],
            ['workable board root', 'https://apply.workable.com/acme/'],
            ['workday site root', 'https://acme.wd5.myworkdayjobs.com/en-US/External'],
            ['icims search page', 'https://acme.icims.com/jobs/search?ss=1'],
            ['unsupported protocol', 'mailto:jobs@example.com'],
            ['garbage', 'not a url'],
        ])('%s → generic', (_label, url) => {
            expect(isSpecificJobUrl(url)).toBe(false);
        });
    });

    describe('accepts one posting', () => {
        it.each([
            ['numeric path id', 'https://example.com/jobs/12345'],
            ['slug path', 'https://example.com/careers/senior-backend-engineer'],
            ['greenhouse posting', 'https://boards.greenhouse.io/acme/jobs/4567890'],
            ['greenhouse jid query', 'https://example.com/careers?gh_jid=4567890'],
            ['lever posting uuid', 'https://jobs.lever.co/acme/6b3f7c1e-9a54-4d6b-8f2a-1c9e0d7b4a31'],
            ['ashby posting uuid', 'https://jobs.ashbyhq.com/acme/3e0b1c2d-4a5f-6789-abcd-ef0123456789'],
            ['workday posting', 'https://acme.wd5.myworkdayjobs.com/en-US/External/job/Bengaluru/Senior-Engineer_R-12345'],
            ['smartrecruiters posting', 'https://jobs.smartrecruiters.com/Acme/744000123456789'],
            ['icims posting', 'https://acme.icims.com/jobs/12345/senior-engineer/job'],
            ['recruitee posting', 'https://acme.recruitee.com/o/senior-backend-engineer'],
            ['teamtailor posting', 'https://acme.teamtailor.com/jobs/123456-senior-engineer'],
        ])('%s → specific', (_label, url) => {
            expect(isSpecificJobUrl(url)).toBe(true);
        });
    });
});

describe('isAtsHost', () => {
    it('recognises ATS hosts and company sites', () => {
        expect(isAtsHost('https://boards.greenhouse.io/acme')).toBe(true);
        expect(isAtsHost('https://acme.wd5.myworkdayjobs.com/en-US/External')).toBe(true);
        expect(isAtsHost('https://nango.dev/careers')).toBe(false);
    });
});

describe('parseJobUrl', () => {
    it('still resolves board roots to null', () => {
        expect(parseJobUrl('https://jobs.lever.co/acme')).toBeNull();
        expect(parseJobUrl('https://boards.greenhouse.io/acme')).toBeNull();
    });
});
